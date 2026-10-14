import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draw, isDrawPossible } from '../src/draw.ts';

function assertValid(n: number, result: number[] | null, isAllowed: (g: number, r: number) => boolean = () => true) {
	assert.ok(result, 'expected an assignment');
	assert.equal(result.length, n);
	assert.deepEqual(
		[...result].sort((a, b) => a - b),
		Array.from({ length: n }, (_, i) => i),
		'must be a permutation',
	);
	result.forEach((receiver, giver) => {
		assert.notEqual(receiver, giver, 'nobody draws themselves');
		assert.ok(isAllowed(giver, receiver), `${giver}→${receiver} is excluded`);
	});
}

function cycleCount(result: number[]): number {
	const seen = new Set<number>();
	let cycles = 0;
	for (let start = 0; start < result.length; start++) {
		if (seen.has(start)) continue;
		cycles++;
		for (let i = start; !seen.has(i); i = result[i] as number) seen.add(i);
	}
	return cycles;
}

describe('draw', () => {
	it('returns null for fewer than two participants', () => {
		assert.equal(draw(0), null);
		assert.equal(draw(1), null);
	});

	it('produces a single circle without exclusions', () => {
		for (let n = 2; n <= 40; n++) {
			const result = draw(n);
			assertValid(n, result);
			assert.equal(cycleCount(result as number[]), 1);
		}
	});

	it('respects exclusions', () => {
		// couples (0,1), (2,3), (4,5) must not draw each other
		const isAllowed = (g: number, r: number) => Math.floor(g / 2) !== Math.floor(r / 2);
		for (let i = 0; i < 200; i++) assertValid(6, draw(6, isAllowed), isAllowed);
	});

	it('falls back to several circles when a single circle is impossible', () => {
		// 0 and 1 may only draw each other; 2, 3, 4 may only draw among themselves
		const group = (x: number) => (x < 2 ? 0 : 1);
		const isAllowed = (g: number, r: number) => group(g) === group(r);
		const result = draw(5, isAllowed);
		assertValid(5, result, isAllowed);
		assert.equal(cycleCount(result as number[]), 2);
	});

	it('returns null when impossible', () => {
		// 0 is excluded from everyone
		const isAllowed = (g: number, r: number) => g !== 0 && r !== 0;
		assert.equal(draw(4, isAllowed), null);
		assert.equal(isDrawPossible(4, isAllowed), false);
	});

	it('is roughly uniform', () => {
		// for n=4 there are 3! = 6 circles
		const counts = new Map<string, number>();
		for (let i = 0; i < 6000; i++) {
			const key = (draw(4) as number[]).join();
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		assert.equal(counts.size, 6);
		for (const count of counts.values()) assert.ok(count > 800 && count < 1200, `count ${count}`);
	});
});
