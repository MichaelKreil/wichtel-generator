import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it } from 'node:test';
import type { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { CODE_NAMES } from '../src/codenames.ts';
import { NodeDatabase } from '../src/db-node.ts';
import { memoryRateLimiter } from '../src/rate-limit.ts';
import { Store } from '../src/store.ts';
import { themesCss } from '../src/themes.ts';

const BASE = 'http://localhost';
let app: Hono;
let store: Store;

beforeEach(() => {
	store = new Store(new NodeDatabase(':memory:'), CODE_NAMES);
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

/** Joins and follows the redirect to the personal page. */
async function join(potPath: string, name: string) {
	const res = await post(potPath, { name });
	const location = res.headers.get('location');
	const personalPath = location ? new URL(location, BASE).pathname : '';
	const html = location ? await (await get(location)).text() : await res.text();
	return { res, html, personalPath, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? '' };
}

describe('app', () => {
	it('serves the start page and static files', async () => {
		const res = await get('/');
		assert.equal(res.status, 200);
		assert.match(await res.text(), /Wichteltopf anlegen/);
		assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'self'/);
		assert.equal((await get('/healthz')).status, 200);
	});

	it('runs the full flow', async () => {
		const { potPath, adminPath } = await createPot();

		const admin = await (await get(`${adminPath}?neu`)).text();
		assert.match(admin, /Wichteltopf angelegt/);
		assert.match(admin, /data-theme="candle"/);
		assert.ok(admin.includes(`http://localhost${potPath}`));

		const anna = await join(potPath, 'Anna');
		assert.equal(anna.res.status, 303);
		assert.match(anna.personalPath, new RegExp(`^${potPath}/ich/[a-z0-9]{24}$`));
		assert.match(anna.html, /Schön, dass du mitmachst/);
		assert.match(anna.html, /Dein geheimer Codename lautet/);
		assert.ok(anna.html.includes(`http://localhost${anna.personalPath}`));
		assert.match(anna.cookie, /^wichtel_/);

		// returning with the cookie leads to the personal page
		const back = await get(potPath, { Cookie: anna.cookie });
		assert.equal(back.status, 303);
		assert.equal(back.headers.get('location'), anna.personalPath);

		// the personal link works without the cookie (other device) and remembers the browser
		const elsewhere = await get(anna.personalPath);
		assert.match(await elsewhere.text(), /Du bist als <b>Anna<\/b> im Topf/);
		assert.match(elsewhere.headers.get('set-cookie') ?? '', /^wichtel_/);
		assert.equal((await get(`${potPath}/ich/wrongtoken`)).status, 404);

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

		const result = await (await get(anna.personalPath)).text();
		assert.match(result, /Die Ziehung ist abgeschlossen/);
		assert.match(result, /Du beschenkst/);
		assert.equal(result.match(/« beschenkt/g)?.length, 4);

		const publicResult = await (await get(potPath)).text();
		assert.ok(!publicResult.includes('Du beschenkst'));
		assert.equal(publicResult.match(/« beschenkt/g)?.length, 4);

		// no more joining
		assert.equal((await join(potPath, 'Dora')).res.status, 303);
	});

	it('lets the admin remove participants and add exclusions', async () => {
		const { potPath, adminPath } = await createPot();
		for (const name of ['Anna', 'Ben', 'Carla']) await join(potPath, name);
		const [anna, ben] = await store.listParticipants(potPath.slice(1));
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

describe('rate limiting', () => {
	it('rejects too many form submissions per IP', async () => {
		const store = new Store(new NodeDatabase(':memory:'), CODE_NAMES);
		const rateLimiters = { create: memoryRateLimiter(2, 60_000), write: memoryRateLimiter(30, 60_000) };
		const app = createApp({ store, rateLimiters });
		const create = (ip: string) =>
			app.request(`${BASE}/neu`, {
				method: 'POST',
				body: new URLSearchParams({ theme: 'bag' }),
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE, 'cf-connecting-ip': ip },
			});
		assert.equal((await create('1.1.1.1')).status, 303);
		assert.equal((await create('1.1.1.1')).status, 303);
		assert.equal((await create('1.1.1.1')).status, 429);
		assert.equal((await create('2.2.2.2')).status, 303);
	});

	it('resets after the period', async () => {
		let now = 0;
		const limiter = memoryRateLimiter(1, 1000, () => now);
		assert.ok(await limiter('a'));
		assert.ok(!(await limiter('a')));
		now = 1000;
		assert.ok(await limiter('a'));
	});
});

describe('errors and caching', () => {
	it('marks pages as not cacheable', async () => {
		const res = await get('/');
		assert.equal(res.headers.get('cache-control'), 'no-store');
		const { adminPath } = await createPot();
		assert.equal((await get(adminPath)).headers.get('cache-control'), 'no-store');
	});

	it('shows a friendly page on unexpected errors', async (t) => {
		t.mock.method(console, 'error', () => {});
		const failing = new Store(
			{
				all: () => Promise.reject(new Error('db down')),
				first: () => Promise.reject(new Error('db down')),
				batch: () => Promise.reject(new Error('db down')),
			},
			CODE_NAMES,
		);
		const res = await createApp({ store: failing }).request(`${BASE}/SomePot-abcdefgh`);
		assert.equal(res.status, 500);
		assert.match(await res.text(), /Da ist etwas schiefgelaufen/);
		assert.equal(res.headers.get('cache-control'), 'no-store');
	});
});

describe('link previews', () => {
	it('has preview tags, and only the start page may be indexed', async () => {
		const start = await (await get('/')).text();
		assert.ok(start.includes('<meta property="og:image" content="http://localhost/static/og.jpg">'));
		assert.ok(!start.includes('noindex'));

		const { potPath } = await createPot();
		const pot = await (await get(potPath)).text();
		assert.ok(pot.includes('<meta property="og:title" content="Mach mit beim Wichteln!">'));
		assert.ok(pot.includes('<meta name="robots" content="noindex">'));
	});
});

describe('themes.css', () => {
	it('is up to date with src/themes.ts (run `npm run themes`)', () => {
		const file = readFileSync(new URL('../public/static/themes.css', import.meta.url), 'utf8');
		assert.equal(file, `${themesCss()}\n`);
	});
});

describe('admin links by mail', () => {
	it('offers a mailto link containing both links', async () => {
		const { potPath, adminPath } = await createPot();
		const html = await (await get(adminPath)).text();
		const href = html.match(/href="(mailto:[^"]+)"/)?.[1]?.replaceAll('&amp;', '&') ?? '';
		const body = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('body') ?? '';
		assert.ok(body.includes(`http://localhost${potPath}\n`));
		assert.ok(body.includes(`http://localhost${adminPath}\n`));
	});
});

describe('deleting data', () => {
	it('lets the admin delete the whole pot', async () => {
		const { potPath, adminPath } = await createPot();
		await join(potPath, 'Anna');
		const res = await post(`${adminPath}/loeschen`, {});
		assert.equal(res.status, 200);
		assert.match(await res.text(), /Topf gelöscht/);
		assert.equal((await get(potPath)).status, 404);
		assert.equal(await store.getPot(potPath.slice(1)), undefined);
	});

	it('lets participants remove themselves until the draw', async () => {
		const { potPath, adminPath } = await createPot();
		const anna = await join(potPath, 'Anna');
		const res = await post(`${anna.personalPath}/austragen`, {});
		assert.match(await res.text(), /Du bist ausgetragen/);
		assert.match(res.headers.get('set-cookie') ?? '', /Max-Age=0/);
		assert.equal((await store.listParticipants(potPath.slice(1))).length, 0);
		assert.equal((await get(anna.personalPath)).status, 404);

		// not after the draw
		const ben = await join(potPath, 'Ben');
		await join(potPath, 'Carla');
		await join(potPath, 'Dora');
		await post(`${adminPath}/schliessen`, {});
		assert.equal((await post(`${ben.personalPath}/austragen`, {})).status, 303);
		assert.equal((await store.listParticipants(potPath.slice(1))).length, 3);
	});
});
