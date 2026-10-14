import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanName, Store } from '../src/store.ts';

const CODE_NAMES = ['Ada', 'Bob', 'Cleo', 'Dan', 'Eve', 'Finn'];

function setup(now = () => 1000) {
	const store = new Store(':memory:', CODE_NAMES, now);
	const pot = store.createPot('bag');
	const join = (name: string, token?: string) => {
		const result = store.join(pot, name, token);
		assert.ok(result.ok);
		return result.participant;
	};
	return { store, pot, join };
}

describe('Store', () => {
	it('creates pots with unguessable ids and tokens', () => {
		const { store, pot } = setup();
		assert.match(pot.id, /^[A-Z][a-z]+-[a-z0-9]{8}$/);
		assert.equal(pot.adminToken.length, 24);
		assert.deepEqual(store.getPot(pot.id), pot);
		assert.ok(store.isAdmin(pot, pot.adminToken));
		assert.ok(!store.isAdmin(pot, 'wrong'));
	});

	it('assigns unique code names and rejects duplicate names', () => {
		const { store, pot, join } = setup();
		const anna = join('Anna Müller');
		assert.equal(store.join(pot, '  anna   MÜLLER ', undefined).ok, false);
		// same token → idempotent
		const again = store.join(pot, 'Anna Müller', anna.token);
		assert.ok(again.ok && !again.isNew && again.participant.codeName === anna.codeName);

		for (const name of ['B', 'C', 'D', 'E', 'F']) join(name);
		const codeNames = store.listParticipants(pot.id).map((p) => p.codeName);
		assert.equal(new Set(codeNames).size, 6);
		assert.deepEqual(store.join(pot, 'G', undefined), { ok: false, error: 'full' });
	});

	it('removes participants together with their exclusions', () => {
		const { store, pot, join } = setup();
		const a = join('A');
		const b = join('B');
		store.addExclusion(pot, b.id, a.id);
		assert.deepEqual(store.listExclusions(pot.id), [{ a: a.id, b: b.id }]);
		store.removeParticipant(pot, a.id);
		assert.deepEqual(store.listExclusions(pot.id), []);
		assert.equal(store.listParticipants(pot.id).length, 1);
	});

	it('closes a pot and respects exclusions', () => {
		const { store, pot, join } = setup();
		assert.deepEqual(store.closePot(pot), { ok: false, error: 'too-few' });
		const [a, b, c, d] = [join('A'), join('B'), join('C'), join('D')];
		store.addExclusion(pot, a.id, b.id);
		store.addExclusion(pot, c.id, d.id);
		assert.ok(store.canDraw(pot.id));

		assert.deepEqual(store.closePot(pot), { ok: true });
		const closed = store.getPot(pot.id);
		assert.ok(closed?.closedAt);
		const participants = store.listParticipants(pot.id);
		const receivers = participants.map((p) => p.receiverId);
		assert.equal(new Set(receivers).size, 4);
		const forbidden = new Set([`${a.id}>${b.id}`, `${b.id}>${a.id}`, `${c.id}>${d.id}`, `${d.id}>${c.id}`]);
		for (const p of participants) {
			assert.notEqual(p.receiverId, p.id);
			assert.ok(!forbidden.has(`${p.id}>${p.receiverId}`));
		}

		assert.equal(store.join(closed, 'Late', undefined).ok, false);
		assert.deepEqual(store.closePot(closed), { ok: false, error: 'closed' });
	});

	it('refuses to close when exclusions make it impossible', () => {
		const { store, pot, join } = setup();
		const [a, b, c] = [join('A'), join('B'), join('C')];
		store.addExclusion(pot, a.id, b.id);
		assert.ok(!store.canDraw(pot.id));
		assert.deepEqual(store.closePot(pot), { ok: false, error: 'impossible' });
		store.removeExclusion(pot, b.id, a.id);
		store.addExclusion(pot, a.id, c.id);
		assert.ok(!store.canDraw(pot.id));
	});

	it('deletes inactive pots', () => {
		let now = 1000;
		const { store, pot, join } = setup(() => now);
		now = 2000;
		join('A');
		assert.equal(store.deleteInactiveSince(2000), 0);
		assert.equal(store.deleteInactiveSince(2001), 1);
		assert.equal(store.getPot(pot.id), undefined);
	});
});

describe('cleanName', () => {
	it('normalizes whitespace, control characters and length', () => {
		assert.equal(cleanName('  Anna \n  Müller​ '), 'Anna Müller');
		assert.equal(cleanName(undefined), '');
		assert.equal(cleanName('x'.repeat(500)).length, 100);
	});
});
