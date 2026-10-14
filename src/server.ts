// Entry point for Node.js / Docker. For Cloudflare see src/worker.ts.
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createApp } from './app.ts';
import { CODE_NAMES } from './codenames.ts';
import { loadConfig } from './config.ts';
import { NodeDatabase } from './db-node.ts';
import { Store } from './store.ts';

const DAY = 24 * 60 * 60 * 1000;

const config = loadConfig();
const db = new NodeDatabase(config.databasePath);
const store = new Store(db, CODE_NAMES);

const app = new Hono();
app.use(
	'/static/*',
	serveStatic({
		root: new URL('../public', import.meta.url).pathname,
		onFound: (_path, c) => {
			c.header('Cache-Control', 'public, max-age=86400');
		},
	}),
);
app.route('/', createApp({ store, baseUrl: config.baseUrl }));

async function cleanup(): Promise<void> {
	const deleted = await store.deleteInactiveSince(Date.now() - config.potTtlDays * DAY);
	if (deleted > 0) console.log(`deleted ${deleted} inactive pots`);
}
await cleanup();
const cleanupTimer = setInterval(cleanup, DAY / 4);

const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
	console.log(`listening on port ${port}`);
});

function shutdown(signal: string): void {
	console.log(`${signal} received, shutting down`);
	clearInterval(cleanupTimer);
	server.close(() => {
		db.close();
		process.exit(0);
	});
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
