import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Database } from '../src/db.ts';
import { D1Database } from '../src/db-d1.ts';
import { NodeDatabase } from '../src/db-node.ts';
import { canDraw, cleanName, Store } from '../src/store.ts';
import { fakeD1 } from './fake-d1.ts';

const CODE_NAMES = ['Ada', 'Bob', 'Cleo', 'Dan', 'Eve', 'Finn'];

const drivers: Record<string, () => Database> = {
	'node:sqlite': () => new NodeDatabase(':memory:'),
	D1: () => new D1Database(fakeD1()),
};

for (const [driver, createDb] of Object.entries(drivers)) {
	describe(`Store (${driver})`, () => {
		async function setup(now = () => 1000) {
			const store = new Store(createDb(), () => CODE_NAMES, now);
			const pot = await store.createPot('bag', 'test');
			const join = async (name: string, token?: string) => {
				const result = await store.join(pot, name, token);
				assert.ok(result.ok, `join ${name}`);
				return result.participant;
			};
			const drawable = async () => canDraw(await store.listParticipants(pot.id), await store.listExclusions(pot.id));
			return { store, pot, join, drawable };
		}

		it('creates pots with unguessable ids and tokens', async () => {
			const { store, pot } = await setup();
			assert.match(pot.id, /^[A-Z][a-z]+-[a-z0-9]{8}$/);
			assert.equal(pot.adminToken.length, 24);
			assert.deepEqual(await store.getPot(pot.id), pot);
			assert.ok(store.isAdmin(pot, pot.adminToken));
			assert.ok(!store.isAdmin(pot, 'wrong'));
		});

		it('assigns unique code names and rejects duplicate names', async () => {
			const { store, pot, join } = await setup();
			const anna = await join('Anna Müller');
			assert.equal((await store.join(pot, '  anna   MÜLLER ', undefined)).ok, false);
			// same token → idempotent
			const again = await store.join(pot, 'Anna Müller', anna.token);
			assert.ok(again.ok && !again.isNew && again.participant.codeName === anna.codeName);

			for (const name of ['B', 'C', 'D', 'E', 'F']) await join(name);
			const codeNames = (await store.listParticipants(pot.id)).map((p) => p.codeName);
			assert.equal(new Set(codeNames).size, 6);
			assert.deepEqual(await store.join(pot, 'G', undefined), { ok: false, error: 'full' });
		});

		it('handles concurrent joins', async () => {
			const { store, pot } = await setup();
			const results = await Promise.all(['A', 'B', 'C', 'D', 'a'].map((name) => store.join(pot, name, undefined)));
			assert.equal(results.filter((r) => r.ok).length, 4);
			assert.equal((await store.listParticipants(pot.id)).length, 4);
		});

		it('removes participants together with their exclusions', async () => {
			const { store, pot, join } = await setup();
			const a = await join('A');
			const b = await join('B');
			await store.addExclusion(pot, b.id, a.id);
			assert.deepEqual(await store.listExclusions(pot.id), [{ a: a.id, b: b.id }]);
			await store.removeParticipant(pot, a.id);
			assert.deepEqual(await store.listExclusions(pot.id), []);
			assert.equal((await store.listParticipants(pot.id)).length, 1);
		});

		it('ignores exclusions with participants from other pots', async () => {
			const { store, pot, join } = await setup();
			const a = await join('A');
			const other = await store.createPot('bag', 'test');
			const result = await store.join(other, 'X', undefined);
			assert.ok(result.ok);
			await store.addExclusion(pot, a.id, result.participant.id);
			assert.deepEqual(await store.listExclusions(pot.id), []);
		});

		it('closes a pot and respects exclusions', async () => {
			const { store, pot, join, drawable } = await setup();
			assert.deepEqual(await store.closePot(pot.id), { ok: false, error: 'too-few' });
			const [a, b, c, d] = [await join('A'), await join('B'), await join('C'), await join('D')];
			await store.addExclusion(pot, a.id, b.id);
			await store.addExclusion(pot, c.id, d.id);
			assert.ok(await drawable());

			assert.deepEqual(await store.closePot(pot.id), { ok: true });
			const closed = await store.getPot(pot.id);
			assert.ok(closed?.closedAt);
			const participants = await store.listParticipants(pot.id);
			assert.equal(new Set(participants.map((p) => p.receiverId)).size, 4);
			const forbidden = new Set([`${a.id}>${b.id}`, `${b.id}>${a.id}`, `${c.id}>${d.id}`, `${d.id}>${c.id}`]);
			for (const p of participants) {
				assert.ok(p.receiverId !== null && p.receiverId !== p.id);
				assert.ok(!forbidden.has(`${p.id}>${p.receiverId}`));
			}

			// closed pots can't be changed
			assert.deepEqual(await store.join(closed, 'Late', undefined), { ok: false, error: 'closed' });
			await store.removeParticipant(closed, a.id);
			assert.equal((await store.listParticipants(pot.id)).length, 4);
			assert.deepEqual(await store.closePot(pot.id), { ok: false, error: 'closed' });
		});

		it('refuses to close when exclusions make it impossible', async () => {
			const { store, pot, join, drawable } = await setup();
			const [a, b, c] = [await join('A'), await join('B'), await join('C')];
			await store.addExclusion(pot, a.id, b.id);
			assert.ok(!(await drawable()));
			assert.deepEqual(await store.closePot(pot.id), { ok: false, error: 'impossible' });
			await store.removeExclusion(pot, b.id, a.id);
			await store.addExclusion(pot, a.id, c.id);
			assert.ok(!(await drawable()));
		});

		it('deletes inactive pots', async () => {
			let now = 1000;
			const { store, pot, join } = await setup(() => now);
			now = 2000;
			await join('A');
			assert.equal(await store.deleteInactiveSince(2000), 0);
			assert.equal(await store.deleteInactiveSince(2001), 1);
			assert.equal(await store.getPot(pot.id), undefined);
		});
	});
}

describe('cleanName', () => {
	it('normalizes whitespace, control characters and length', () => {
		assert.equal(cleanName('  Anna \n  Müller​ '), 'Anna Müller');
		assert.equal(cleanName(undefined), '');
		assert.equal(cleanName('x'.repeat(500)).length, 100);
	});
});
