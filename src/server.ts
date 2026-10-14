import { serve } from '@hono/node-server';
import { createApp, loadCodeNames } from './app.ts';
import { loadConfig } from './config.ts';
import { Store } from './store.ts';

const DAY = 24 * 60 * 60 * 1000;

const config = loadConfig();
const store = new Store(config.databasePath, loadCodeNames());
const app = createApp({ store, baseUrl: config.baseUrl });

function cleanup(): void {
	const deleted = store.deleteInactiveSince(Date.now() - config.potTtlDays * DAY);
	if (deleted > 0) console.log(`deleted ${deleted} inactive pots`);
}
cleanup();
const cleanupTimer = setInterval(cleanup, DAY / 4);

const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
	console.log(`listening on port ${port}`);
});

function shutdown(signal: string): void {
	console.log(`${signal} received, shutting down`);
	clearInterval(cleanupTimer);
	server.close(() => {
		store.close();
		process.exit(0);
	});
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
