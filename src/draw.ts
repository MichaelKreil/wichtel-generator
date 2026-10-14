import { type Rng, secureRng, shuffle } from './random.ts';

export type IsAllowed = (giver: number, receiver: number) => boolean;

/**
 * Assigns each of `n` participants a receiver: `result[giver] = receiver`.
 *
 * Nobody draws themselves and `isAllowed` is respected. A single big circle (A→B→C→…→A) is preferred,
 * because it rules out pairs that just gift each other. If exclusions make that impossible, any valid
 * assignment is returned. Returns `null` if there is none.
 *
 * Kept cheap enough for Cloudflare's 10 ms CPU limit, even for large pots with many exclusions.
 */
export function draw(n: number, isAllowed: IsAllowed = () => true, rng: Rng = secureRng): number[] | null {
	if (n < 2) return null;
	const allowed: IsAllowed = (giver, receiver) => giver !== receiver && isAllowed(giver, receiver);

	// Rejection sampling yields a uniformly random circle and almost always succeeds with few exclusions.
	const order = range(n);
	for (let attempt = 0; attempt < 200; attempt++) {
		shuffle(order, rng);
		if (order.every((giver, i) => allowed(giver, order[(i + 1) % n] as number))) return circleToAssignment(order);
	}

	const options = receiverOptions(n, allowed, rng);
	const circle = findCircle(options, 20_000);
	if (circle) return circleToAssignment(circle);

	return findMatching(options);
}

/** True if any valid assignment exists. Cheap enough to run on every admin page view. */
export function isDrawPossible(n: number, isAllowed: IsAllowed = () => true): boolean {
	if (n < 2) return false;
	return findMatching(receiverOptions(n, (g, r) => g !== r && isAllowed(g, r))) !== null;
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

/** For each giver the allowed receivers, optionally in random order. */
function receiverOptions(n: number, allowed: IsAllowed, rng?: Rng): number[][] {
	return range(n).map((giver) => {
		const receivers = range(n).filter((receiver) => allowed(giver, receiver));
		return rng ? shuffle(receivers, rng) : receivers;
	});
}

/** Depth-first search for a Hamiltonian circle, aborted after `budget` steps. */
function findCircle(options: number[][], budget: number): number[] | null {
	const n = options.length;
	const path = [0];
	const used = new Array<boolean>(n).fill(false);
	used[0] = true;
	let steps = 0;

	const extend = (): boolean => {
		const last = path[path.length - 1] as number;
		if (path.length === n) return (options[last] as number[]).includes(0);
		for (const next of options[last] as number[]) {
			if (++steps > budget) return false;
			if (used[next]) continue;
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

/** Perfect bipartite matching giver→receiver: greedy first, then augmenting paths (Kuhn's algorithm). */
function findMatching(options: number[][]): number[] | null {
	const n = options.length;
	const receiverOf = new Array<number>(n).fill(-1);
	const giverOf = new Array<number>(n).fill(-1);

	for (let giver = 0; giver < n; giver++) {
		const receiver = (options[giver] as number[]).find((r) => giverOf[r] === -1);
		if (receiver === undefined) continue;
		receiverOf[giver] = receiver;
		giverOf[receiver] = giver;
	}

	const augment = (giver: number, seen: boolean[]): boolean => {
		for (const receiver of options[giver] as number[]) {
			if (seen[receiver]) continue;
			seen[receiver] = true;
			const previous = giverOf[receiver] as number;
			if (previous === -1 || augment(previous, seen)) {
				giverOf[receiver] = giver;
				receiverOf[giver] = receiver;
				return true;
			}
		}
		return false;
	};

	for (let giver = 0; giver < n; giver++) {
		if (receiverOf[giver] !== -1) continue;
		if (!augment(giver, new Array<boolean>(n).fill(false))) return null;
	}
	return receiverOf;
}
