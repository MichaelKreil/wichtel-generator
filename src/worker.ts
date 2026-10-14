// Entry point for Cloudflare Workers. Static files in public/ are served by Cloudflare directly.
import type { Hono } from 'hono';
import { createApp } from './app.ts';
import { MIXED_LIST } from './codenames.ts';
import { type D1Binding, D1Database } from './db-d1.ts';
import { bindingRateLimiter, type RateLimitBinding } from './rate-limit.ts';
import { Store } from './store.ts';

interface Env {
	DB: D1Binding;
	CREATE_LIMITER: RateLimitBinding;
	WRITE_LIMITER: RateLimitBinding;
	/** Optional, e.g. "https://wichteltopf.de". Derived from the request otherwise. */
	BASEURL?: string;
	POT_TTL_DAYS?: string;
}

const DAY = 24 * 60 * 60 * 1000;

// Reused across requests within the same isolate
let cached: { env: Env; store: Store; app: Hono } | undefined;

function setup(env: Env) {
	if (cached?.env !== env) {
		const store = new Store(new D1Database(env.DB), MIXED_LIST.names);
		const app = createApp({
			store,
			baseUrl: env.BASEURL?.replace(/\/+$/, '') || undefined,
			rateLimiters: { create: bindingRateLimiter(env.CREATE_LIMITER), write: bindingRateLimiter(env.WRITE_LIMITER) },
			// set by Cloudflare, can't be faked by clients
			clientIp: (c) => c.req.header('cf-connecting-ip') ?? '',
		});
		cached = { env, store, app };
	}
	return cached;
}

export default {
	fetch(request: Request, env: Env, ctx: unknown) {
		// http → https and www.wichteltopf.de → wichteltopf.de. Static files are served by Cloudflare before
		// reaching this; "Always Use HTTPS" in the Cloudflare dashboard covers those too.
		const url = new URL(request.url);
		const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
		if ((url.protocol === 'http:' && !isLocal) || url.hostname.startsWith('www.')) {
			url.protocol = isLocal ? url.protocol : 'https:';
			url.hostname = url.hostname.replace(/^www\./, '');
			return Response.redirect(url.toString(), 301);
		}
		return setup(env).app.fetch(request, env, ctx as never);
	},

	// Daily cron trigger (see wrangler.jsonc): delete inactive pots.
	async scheduled(_controller: unknown, env: Env) {
		const ttlDays = Number(env.POT_TTL_DAYS ?? 90);
		const deleted = await setup(env).store.deleteInactiveSince(Date.now() - ttlDays * DAY);
		console.log(`deleted ${deleted} inactive pots`);
	},
};
