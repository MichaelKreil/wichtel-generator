// Mobile usability check: renders every page in Chrome at phone widths and fails on
// horizontal scrolling, inputs that make iOS zoom (< 16px) and tap targets smaller than 44px.
// Usage: npm run test:mobile   (set CHROME to the browser binary if it isn't found)
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WIDTHS = [320, 390];
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}`;

const tmp = mkdtempSync(join(tmpdir(), 'wichtel-mobile-'));
const processes: ChildProcess[] = [];
process.on('exit', () => {
	for (const p of processes) p.kill();
	try {
		rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
	} catch {} // Chrome may still be writing its profile; the OS cleans up temp files anyway
});

function findChrome(): string {
	const candidates = [
		process.env.CHROME,
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
	];
	const found = candidates.find((path) => path && existsSync(path));
	if (!found) throw new Error('Chrome not found, set CHROME');
	return found;
}

async function waitFor(url: string): Promise<void> {
	for (let i = 0; i < 100; i++) {
		try {
			if ((await fetch(url)).ok) return;
		} catch {}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`timeout waiting for ${url}`);
}

// --- start the server and create test data ---

const server = spawn(process.execPath, ['src/server.ts'], {
	env: { ...process.env, PORT: String(PORT), DATABASE_PATH: join(tmp, 'db.sqlite') },
	stdio: 'inherit',
});
processes.push(server);
await waitFor(`${BASE}/healthz`);

let ipCounter = 0;
/** Posts a form like a browser; each request gets its own IP to stay below the rate limits. */
async function post(path: string, form: Record<string, string>): Promise<string> {
	const res = await fetch(BASE + path, {
		method: 'POST',
		body: new URLSearchParams(form),
		headers: { Origin: BASE, 'X-Forwarded-For': `10.0.0.${++ipCounter}` },
		redirect: 'manual',
	});
	const location = res.headers.get('location');
	if (!location) throw new Error(`POST ${path}: no redirect (${res.status})`);
	return new URL(location, BASE).pathname;
}

async function createPot(names: string[]) {
	const adminPath = await post('/neu', { theme: 'snowman' });
	const potPath = adminPath.replace(/\/admin\/.*/, '');
	const personalPaths = [];
	for (const name of names) personalPaths.push(await post(potPath, { name }));
	return { adminPath, potPath, personalPaths };
}

const longNames = ['Anna-Katharina Müller-Lüdenscheidt', 'Ben Schmidt', 'Carla Weiß', 'Maximilian von Hohenzollern'];
const open = await createPot(longNames);
const ids = [...(await (await fetch(BASE + open.adminPath)).text()).matchAll(/name="participant" value="(\d+)"/g)].map(
	(m) => m[1] as string,
);
await post(`${open.adminPath}/ausschluss`, { a: ids[0] as string, b: ids[1] as string });
const closed = await createPot(longNames);
await post(`${closed.adminPath}/schliessen`, {});

const pages: Record<string, string> = {
	start: '/',
	pot: open.potPath,
	personal: open.personalPaths[0] as string,
	admin: open.adminPath,
	result: closed.potPath,
	'personal result': closed.personalPaths[0] as string,
	'admin result': closed.adminPath,
	'not found': '/does-not-exist',
};

// --- drive Chrome via the DevTools protocol ---

const chrome = spawn(
	findChrome(),
	['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(tmp, 'chrome')}`, 'about:blank'],
	{ stdio: ['ignore', 'ignore', 'pipe'] },
);
processes.push(chrome);
const wsUrl = await new Promise<string>((resolve, reject) => {
	let output = '';
	chrome.stderr?.on('data', (chunk) => {
		output += chunk;
		const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
		if (match) resolve(match[1] as string);
	});
	chrome.on('exit', () => reject(new Error(`Chrome exited: ${output}`)));
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let messageId = 0;
const pending = new Map<number, (result: Record<string, unknown>) => void>();
let onLoad: (() => void) | undefined;
ws.addEventListener('message', (event) => {
	const message = JSON.parse(String(event.data));
	if (message.method === 'Page.loadEventFired') onLoad?.();
	pending.get(message.id)?.(message.result ?? {});
	pending.delete(message.id);
});
function send(method: string, params: object = {}, sessionId?: string): Promise<Record<string, unknown>> {
	return new Promise((resolve) => {
		pending.set(++messageId, resolve);
		ws.send(JSON.stringify({ id: messageId, method, params, sessionId }));
	});
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = (await send('Target.attachToTarget', { targetId, flatten: true })) as { sessionId: string };
await send('Page.enable', {}, sessionId);
await send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId);

// runs in the page; returns a list of problems
const audit = `(() => {
	const problems = [];
	if (document.documentElement.scrollWidth > innerWidth)
		problems.push('scrolls horizontally: ' + document.documentElement.scrollWidth + 'px content in ' + innerWidth + 'px');
	const describe = (el) => el.tagName.toLowerCase() + ' "' + (el.textContent || el.value || '').trim().slice(0, 30) + '"';
	for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=radio]), select, textarea')) {
		const size = parseFloat(getComputedStyle(el).fontSize);
		if (size < 16) problems.push(describe(el) + ': font ' + size + 'px makes iOS zoom in');
	}
	// buttons, fields and the design thumbnails; links inside text are exempt
	for (const el of document.querySelectorAll('button, .button, input:not([type=hidden]):not([type=radio]), select, .themes label')) {
		const box = el.getBoundingClientRect();
		if (!box.width || getComputedStyle(el).visibility === 'hidden') continue;
		if (box.height < 44 || box.width < 44) problems.push(describe(el) + ': tap target ' + Math.round(box.width) + 'x' + Math.round(box.height) + 'px');
	}
	return problems;
})()`;

let failures = 0;
for (const width of WIDTHS) {
	await send(
		'Emulation.setDeviceMetricsOverride',
		{ width, height: 800, deviceScaleFactor: 2, mobile: true },
		sessionId,
	);
	for (const [name, path] of Object.entries(pages)) {
		// personal pages set a cookie that would redirect the pot page
		await send('Network.clearBrowserCookies', {}, sessionId);
		const loaded = new Promise<void>((resolve) => {
			onLoad = resolve;
		});
		await send('Page.navigate', { url: BASE + path }, sessionId);
		await loaded;
		const { result } = (await send('Runtime.evaluate', { expression: audit, returnByValue: true }, sessionId)) as {
			result: { value: string[] };
		};
		const problems = [...new Set(result.value)];
		failures += problems.length;
		console.log(`${problems.length ? '✖' : '✔'} ${width}px ${name}`);
		for (const problem of problems) console.log(`    ${problem}`);
	}
}

ws.close();
console.log(failures ? `\n${failures} problem(s) found` : '\nall pages are fine on phones');
process.exit(failures ? 1 : 0);
