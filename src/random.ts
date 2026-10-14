/** Returns a random integer in [0, max). Injectable for deterministic tests. */
export type Rng = (max: number) => number;

// Web Crypto works in Node and in Cloudflare Workers. Random values are fetched in blocks for speed.
const pool = new Uint32Array(256);
let poolIndex = pool.length;

function randomUint32(): number {
	if (poolIndex >= pool.length) {
		crypto.getRandomValues(pool);
		poolIndex = 0;
	}
	return pool[poolIndex++] as number;
}

/** Cryptographically secure and unbiased (rejection sampling). */
export const secureRng: Rng = (max) => {
	if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError(`invalid max: ${max}`);
	const limit = 2 ** 32 - (2 ** 32 % max);
	for (;;) {
		const value = randomUint32();
		if (value < limit) return value % max;
	}
};

/** Constant-time string comparison, for secret tokens. */
export function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export function pick<T>(list: readonly T[], rng: Rng = secureRng): T {
	if (list.length === 0) throw new Error('cannot pick from an empty list');
	return list[rng(list.length)] as T;
}

/** Fisher-Yates shuffle, in place. */
export function shuffle<T>(list: T[], rng: Rng = secureRng): T[] {
	for (let i = list.length - 1; i > 0; i--) {
		const j = rng(i + 1);
		[list[i], list[j]] = [list[j] as T, list[i] as T];
	}
	return list;
}

// no 0/o, 1/l/i to keep links readable when typed by hand
const TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export function randomToken(length: number, rng: Rng = secureRng): string {
	let token = '';
	for (let i = 0; i < length; i++) token += TOKEN_ALPHABET[rng(TOKEN_ALPHABET.length)];
	return token;
}

const SYLLABLES_FIRST = 'Al,Am,Ar,El,Em,Fe,Frie,Fro,Ga,La,Lau,Le,Lei,Ma,Mel,Mar,Mor,Rhe,Ro,Ru,Se,Va,Vi'.split(',');
const SYLLABLES_MIDDLE =
	'ba,be,bi,bo,bu,da,de,di,do,du,fa,fe,fi,fo,fu,ga,ge,gi,go,gu,la,le,li,lo,lu,ma,me,mi,mo,mu,ra,re,ri,ro,ru,va,ve,vi,vo,vu,wa,we,wi,wo,wu'.split(
		',',
	);
const SYLLABLES_LAST = 'do,in,is,la,las,lin,mag,na,nas,or,ra,run,tea,us,va,var,vin,wen,wyn,ya'.split(',');

/** A pronounceable elf name like "Melbedin". */
export function elfName(rng: Rng = secureRng): string {
	const middle = rng(2) === 0 ? pick(SYLLABLES_MIDDLE, rng) : pick(SYLLABLES_MIDDLE, rng) + pick(SYLLABLES_MIDDLE, rng);
	const name = pick(SYLLABLES_FIRST, rng) + middle + pick(SYLLABLES_LAST, rng);
	return name.replace(/(.)\1+/g, '$1'); // collapse doubled letters
}

/** Pot IDs are a friendly name plus a random suffix, so they can't be guessed. */
export function potId(rng: Rng = secureRng): string {
	return `${elfName(rng)}-${randomToken(8, rng)}`;
}
