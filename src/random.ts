import { randomInt } from 'node:crypto';

/** Returns a random integer in [0, max). Injectable for deterministic tests. */
export type Rng = (max: number) => number;

export const secureRng: Rng = (max) => randomInt(max);

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
