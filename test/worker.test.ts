import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { codeNamesFor } from '../src/codenames.ts';

import { D1Database } from '../src/db-d1.ts';
import { Store } from '../src/store.ts';
import worker from '../src/worker.ts';
import { fakeD1 } from './fake-d1.ts';

function createEnv() {
	const allow = { limit: async () => ({ success: true }) };
	return { DB: fakeD1(), CREATE_LIMITER: allow, WRITE_LIMITER: allow };
}

describe('worker', () => {
	it('redirects www to the bare domain, keeping path and query', async () => {
		const res = await worker.fetch(new Request('https://www.wichteltopf.de/Abc-123?x=1'), createEnv(), {});
		assert.equal(res.status, 301);
		assert.equal(res.headers.get('location'), 'https://wichteltopf.de/Abc-123?x=1');
	});

	it('redirects http to https, also for www', async () => {
		for (const from of ['http://wichteltopf.de/Abc-123?x=1', 'http://www.wichteltopf.de/Abc-123?x=1']) {
			const res = await worker.fetch(new Request(from), createEnv(), {});
			assert.equal(res.status, 301);
			assert.equal(res.headers.get('location'), 'https://wichteltopf.de/Abc-123?x=1');
		}
	});

	it('keeps http for local development', async () => {
		const res = await worker.fetch(new Request('http://localhost:8787/'), createEnv(), {});
		assert.equal(res.status, 200);
	});

	it('serves the app', async () => {
		const res = await worker.fetch(new Request('https://wichteltopf.de/'), createEnv(), {});
		assert.equal(res.status, 200);
		assert.match(await res.text(), /Wichteltopf anlegen/);
	});

	it('deletes inactive pots in the scheduled job', async (t) => {
		t.mock.method(console, 'log', () => {});
		const env = createEnv();
		const old = await new Store(new D1Database(env.DB), codeNamesFor, () => 0).createPot('tanne', 'mittelerde');
		const recent = await new Store(new D1Database(env.DB), codeNamesFor).createPot('tanne', 'mittelerde');
		await worker.scheduled({}, env);
		const store = new Store(new D1Database(env.DB), codeNamesFor);
		assert.equal(await store.getPot(old.id), undefined);
		assert.ok(await store.getPot(recent.id));
	});
});
