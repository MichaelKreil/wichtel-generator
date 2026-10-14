// Shared helpers for scripts that drive the real app in a browser (mobile check, screenshots):
// a server with a temporary database, demo data, and headless Chrome via the DevTools protocol.
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Demo } from '../demo.ts';

const tmp = mkdtempSync(join(tmpdir(), 'wichtel-harness-'));
const processes: ChildProcess[] = [];
process.on('exit', () => {
	for (const p of processes) p.kill();
	try {
		rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
	} catch {} // Chrome may still be writing its profile; the OS cleans up temp files anyway
});

// --- server ---

export interface Server {
	base: string;
	/** Posts a form like a browser and returns the redirect target path. */
	post(path: string, form?: Record<string, string>): Promise<string>;
}

/**
 * Starts src/server.ts with an empty temporary database.
 * `publicUrl` only changes the links shown on the pages (e.g. the real domain for screenshots).
 */
export async function startServer({ publicUrl }: { publicUrl?: string } = {}): Promise<Server> {
	const port = 8790 + Math.floor(Math.random() * 100);
	const base = `http://localhost:${port}`;
	const server = spawn(process.execPath, ['src/server.ts'], {
		// TRUST_PROXY: each request pretends to come from its own IP, to stay below the rate limits
		env: {
			...process.env,
			PORT: String(port),
			DATABASE_PATH: join(tmp, 'db.sqlite'),
			TRUST_PROXY: '1',
			...(publicUrl ? { BASEURL: publicUrl } : {}),
		},
		stdio: ['ignore', 'ignore', 'inherit'],
	});
	processes.push(server);
	await waitFor(`${base}/healthz`);

	let ipCounter = 0;
	return {
		base,
		async post(path, form = {}) {
			const res = await fetch(base + path, {
				method: 'POST',
				body: new URLSearchParams(form),
				headers: {
					'Sec-Fetch-Site': 'same-origin',
					'X-Forwarded-For': `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`,
				},
				redirect: 'manual',
			});
			const location = res.headers.get('location');
			if (!location) throw new Error(`POST ${path}: no redirect (${res.status})`);
			return new URL(location, base).pathname + new URL(location, base).search;
		},
	};
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

// --- demo data ---

export interface DemoPot {
	potPath: string;
	adminPath: string;
	/** Personal page of each participant, in the order of the demo config */
	personalPaths: string[];
	/** Closes the pot and draws the assignment. */
	close(): Promise<void>;
}

export async function createDemoPot(server: Server, demo: Demo): Promise<DemoPot> {
	const adminPath = (await server.post('/neu', { theme: demo.theme })).replace(/\?.*/, '');
	const potPath = adminPath.replace(/\/admin\/.*/, '');
	const personalPaths: string[] = [];
	for (const name of demo.participants) personalPaths.push((await server.post(potPath, { name })).replace(/\?.*/, ''));

	// participant ids, as rendered on the admin page
	const adminHtml = await (await fetch(server.base + adminPath)).text();
	const idOf = new Map(
		[
			...adminHtml.matchAll(
				/<span>([^<]+)<\/span>\s*<form[^>]*>\s*<input type="hidden" name="participant" value="(\d+)">/g,
			),
		].map((m) => [m[1] as string, m[2] as string]),
	);
	for (const [a, b] of demo.exclusions) {
		await server.post(`${adminPath}/ausschluss`, { a: idOf.get(a) ?? '', b: idOf.get(b) ?? '' });
	}

	return {
		potPath,
		adminPath,
		personalPaths,
		close: async () => {
			await server.post(`${adminPath}/schliessen`);
		},
	};
}

// --- browser ---

export interface Browser {
	/** Emulates prefers-reduced-motion, which turns off the falling snow. */
	reduceMotion(): Promise<void>;
	/** Emulates a phone screen. */
	setViewport(width: number, height: number, deviceScaleFactor?: number): Promise<void>;
	/** Opens a page in a fresh state (no cookies) and waits until it and its images are loaded. */
	open(url: string): Promise<void>;
	evaluate<T>(expression: string): Promise<T>;
	/** PNG of the current viewport */
	screenshot(): Promise<Buffer>;
	/** PNG of the whole page, rendered as if the screen were as tall as the page */
	fullPageScreenshot(): Promise<Buffer>;
}

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

export async function startBrowser(): Promise<Browser> {
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

	let sessionId: string | undefined;
	const send = (method: string, params: object = {}): Promise<Record<string, unknown>> =>
		new Promise((resolve) => {
			pending.set(++messageId, resolve);
			ws.send(JSON.stringify({ id: messageId, method, params, sessionId }));
		});

	const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
	sessionId = ((await send('Target.attachToTarget', { targetId, flatten: true })) as { sessionId: string }).sessionId;
	await send('Page.enable');
	await send('Emulation.setTouchEmulationEnabled', { enabled: true });

	let viewport = { width: 390, height: 844, deviceScaleFactor: 2 };
	const applyViewport = (height = viewport.height) =>
		send('Emulation.setDeviceMetricsOverride', { ...viewport, height, mobile: true });

	const evaluate = async <T>(expression: string): Promise<T> => {
		const { result } = (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })) as {
			result: { value: T };
		};
		return result.value;
	};
	// Waits for the images on screen. Lazy images further down only load once scrolled into view,
	// so they are skipped; a timeout guards against images that never settle.
	const imagesLoaded = () =>
		evaluate(`Promise.race([
			new Promise((r) => setTimeout(r, 5000)),
			Promise.all([...document.images]
				.filter((img) => !img.complete && img.getBoundingClientRect().top < innerHeight)
				.map((img) => new Promise((r) => { img.onload = img.onerror = r; }))),
		])`);
	const capture = async () => {
		const { data } = (await send('Page.captureScreenshot', { format: 'png' })) as { data: string };
		return Buffer.from(data, 'base64');
	};

	return {
		async reduceMotion() {
			await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
		},
		async setViewport(width, height, deviceScaleFactor = 2) {
			viewport = { width, height, deviceScaleFactor };
			await applyViewport();
		},
		async open(url) {
			// personal pages set a cookie that would redirect the pot page
			await send('Network.clearBrowserCookies');
			const loaded = new Promise<void>((resolve) => {
				onLoad = resolve;
			});
			await send('Page.navigate', { url });
			await loaded;
			await imagesLoaded();
		},
		evaluate,
		screenshot: capture,
		async fullPageScreenshot() {
			const height = await evaluate<number>('document.documentElement.scrollHeight');
			await applyViewport(height);
			await imagesLoaded(); // lazy images that just became visible
			const png = await capture();
			await applyViewport();
			return png;
		},
	};
}
