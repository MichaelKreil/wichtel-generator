import { type Rng, secureRng, shuffle } from './random.ts';

export type IsAllowed = (giver: number, receiver: number) => boolean;

/**
 * Assigns each of `n` participants a receiver: `result[giver] = receiver`.
 *
 * Nobody draws themselves and `isAllowed` is respected. A single big circle (A→B→C→…→A) is preferred,
 * because it rules out pairs that just gift each other. If exclusions make that impossible, any valid
 * assignment is returned. Returns `null` if there is none.
 */
export function draw(n: number, isAllowed: IsAllowed = () => true, rng: Rng = secureRng): number[] | null {
	if (n < 2) return null;
	const allowed: IsAllowed = (giver, receiver) => giver !== receiver && isAllowed(giver, receiver);

	// Rejection sampling yields a uniformly random circle and almost always succeeds with few exclusions.
	const order = range(n);
	for (let attempt = 0; attempt < 1000; attempt++) {
		shuffle(order, rng);
		if (order.every((giver, i) => allowed(giver, order[(i + 1) % n] as number))) return circleToAssignment(order);
	}

	const circle = findCircle(n, allowed, rng, 100_000);
	if (circle) return circleToAssignment(circle);

	return findMatching(n, allowed, rng);
}

/** True if any valid assignment exists. Cheap enough to run on every admin page view. */
export function isDrawPossible(n: number, isAllowed: IsAllowed = () => true): boolean {
	if (n < 2) return false;
	return (
		findMatching(
			n,
			(g, r) => g !== r && isAllowed(g, r),
			(max) => max - 1,
		) !== null
	);
}

function range(n: number): number[] {
	return Array.from({ length: n }, (_, i) => i);
}

function circleToAssignment(circle: number[]): number[] {
	const result = new Array<number>(circle.length);
	circle.forEach((giver, i) => {
		result[giver] = circle[(i + 1) % circle.length] as number;
	});
	return result;
}

/** Randomized depth-first search for a Hamiltonian circle, aborted after `budget` steps. */
function findCircle(n: number, allowed: IsAllowed, rng: Rng, budget: number): number[] | null {
	const path = [0];
	const used = new Array<boolean>(n).fill(false);
	used[0] = true;
	let steps = 0;

	const extend = (): boolean => {
		if (++steps > budget) return false;
		const last = path[path.length - 1] as number;
		if (path.length === n) return allowed(last, 0);
		for (const next of shuffle(range(n), rng)) {
			if (used[next] || !allowed(last, next)) continue;
			used[next] = true;
			path.push(next);
			if (extend()) return true;
			used[next] = false;
			path.pop();
		}
		return false;
	};

	return extend() ? path : null;
}

/** Perfect bipartite matching giver→receiver (Kuhn's algorithm), with randomized order. */
function findMatching(n: number, allowed: IsAllowed, rng: Rng): number[] | null {
	const receiverOf = new Array<number>(n).fill(-1);
	const giverOf = new Array<number>(n).fill(-1);

	const assign = (giver: number, seen: boolean[]): boolean => {
		for (const receiver of shuffle(range(n), rng)) {
			if (seen[receiver] || !allowed(giver, receiver)) continue;
			seen[receiver] = true;
			const previous = giverOf[receiver] as number;
			if (previous === -1 || assign(previous, seen)) {
				giverOf[receiver] = giver;
				receiverOf[giver] = receiver;
				return true;
			}
		}
		return false;
	};

	for (const giver of shuffle(range(n), rng)) {
		if (!assign(giver, new Array<boolean>(n).fill(false))) return null;
	}
	return receiverOf;
}
