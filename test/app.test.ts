import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { Hono } from 'hono';
import { createApp, loadCodeNames } from '../src/app.ts';
import { Store } from '../src/store.ts';

const BASE = 'http://localhost';
let app: Hono;
let store: Store;

beforeEach(() => {
	store = new Store(':memory:', loadCodeNames());
	app = createApp({ store });
});

function post(path: string, form: Record<string, string>, headers: Record<string, string> = {}) {
	return app.request(`${BASE}${path}`, {
		method: 'POST',
		body: new URLSearchParams(form),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE, Host: 'localhost', ...headers },
	});
}

function get(path: string, headers: Record<string, string> = {}) {
	return app.request(`${BASE}${path}`, { headers: { Host: 'localhost', ...headers } });
}

async function createPot(): Promise<{ potPath: string; adminPath: string }> {
	const res = await post('/neu', { theme: 'candle' });
	assert.equal(res.status, 303);
	const adminPath = new URL(res.headers.get('location') ?? '', BASE).pathname;
	const potPath = adminPath.replace(/\/admin\/.*/, '');
	return { potPath, adminPath };
}

async function join(potPath: string, name: string) {
	const res = await post(potPath, { name });
	const html = await res.text();
	return { res, html, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? '' };
}

describe('app', () => {
	it('serves the start page and static files', async () => {
		const res = await get('/');
		assert.equal(res.status, 200);
		assert.match(await res.text(), /Wichteltopf anlegen/);
		assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'self'/);
		assert.equal((await get('/static/style.css')).status, 200);
		assert.match(await (await get('/static/themes.css')).text(), /data-theme="candle"/);
		assert.equal((await get('/healthz')).status, 200);
	});

	it('runs the full flow', async () => {
		const { potPath, adminPath } = await createPot();

		const admin = await (await get(`${adminPath}?neu`)).text();
		assert.match(admin, /Wichteltopf angelegt/);
		assert.match(admin, /data-theme="candle"/);
		assert.ok(admin.includes(`http://localhost${potPath}`));

		const anna = await join(potPath, 'Anna');
		assert.equal(anna.res.status, 200);
		assert.match(anna.html, /Dein geheimer Codename lautet/);
		assert.match(anna.cookie, /^wichtel_/);

		// returning with the cookie shows the code name instead of the form
		const page = await (await get(potPath, { Cookie: anna.cookie })).text();
		assert.match(page, /Du bist als <b>Anna<\/b> dabei/);

		// duplicate names are rejected
		assert.equal((await join(potPath, 'anna')).res.status, 400);

		// names are escaped
		const xss = await join(potPath, '<script>alert(1)</script>');
		assert.ok(!xss.html.includes('<script>alert'));
		assert.ok((await (await get(potPath)).text()).includes('&lt;script&gt;'));

		await join(potPath, 'Ben');
		await join(potPath, 'Carla');

		const closed = await post(`${adminPath}/schliessen`, {});
		assert.equal(closed.status, 303);

		const result = await (await get(potPath, { Cookie: anna.cookie })).text();
		assert.match(result, /Die Ziehung ist abgeschlossen/);
		assert.match(result, /Du beschenkst/);
		assert.equal(result.match(/« beschenkt/g)?.length, 4);

		// no more joining
		assert.equal((await join(potPath, 'Dora')).res.status, 303);
	});

	it('lets the admin remove participants and add exclusions', async () => {
		const { potPath, adminPath } = await createPot();
		for (const name of ['Anna', 'Ben', 'Carla']) await join(potPath, name);
		const [anna, ben] = store.listParticipants(potPath.slice(1));
		assert.ok(anna && ben);

		await post(`${adminPath}/ausschluss`, { a: String(anna.id), b: String(ben.id) });
		let html = await (await get(adminPath)).text();
		assert.match(html, /Anna ⟷ Ben/);
		assert.match(html, /keine Auslosung möglich/);
		assert.equal((await post(`${adminPath}/schliessen`, {})).status, 400);

		await post(`${adminPath}/entfernen`, { participant: String(anna.id) });
		html = await (await get(adminPath)).text();
		assert.ok(!html.includes('<span>Anna</span>'));
		assert.ok(!html.includes('⟷ Ben'));
	});

	it('hides pots and admin pages behind valid ids and tokens', async () => {
		const { potPath, adminPath } = await createPot();
		assert.equal((await get('/Unknown-abcdefgh')).status, 404);
		assert.equal((await get(`${potPath}/admin/wrongtoken`)).status, 404);
		assert.equal((await post(`${potPath}/admin/wrongtoken/schliessen`, {})).status, 404);
		assert.equal((await get(adminPath)).status, 200);
	});

	it('rejects cross-site form posts', async () => {
		const { potPath } = await createPot();
		const res = await post(potPath, { name: 'Mallory' }, { Origin: 'https://evil.example' });
		assert.equal(res.status, 403);
	});
});
