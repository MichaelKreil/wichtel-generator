import { resolve } from '@std/path';
import { Pot } from './pot.ts';
import { mkdirSync } from '@std/fs/unstable-mkdir';

export class Shelf {
	databasePath: string;
	constructor(databasePath: string) {
		mkdirSync(databasePath, { recursive: true });
		this.databasePath = databasePath;
	}
	async getPot(id: string): Promise<Pot | null> {
		try {
			const filename = resolve(this.databasePath, this.secureID(id) + '.json');
			return JSON.parse(await Deno.readTextFile(filename));
		} catch (e) {
			return null;
		}
	}
	async savePot(pot: Pot) {
		const filename = resolve(this.databasePath, this.secureID(pot.id) + '.json');
		await Deno.writeTextFile(filename, JSON.stringify(pot));
	}
	async newPot(data: { id: string; theme: string; adminCode: string }): Promise<Pot> {
		const pot: Pot = {
			id: this.secureID(data.id),
			theme: data.theme,
			adminCode: data.adminCode,
			personList: [],
			closed: false
		};
		await this.savePot(pot);
		return pot;
	}
	secureID(id: string): string {
		return ('' + id).replace(/[^a-zA-Z0-9]+/g, '');
	}
	generateRandomId() {
		const first = 'Al,Am,Ar,El,Em,Fe,Frie,Fro,Ga,La,Lau,Le,Lei,Ma,Mel,Mar,Mor,Rhe,Ro,Ru,Se,Le,Va,Vi'.split(',');
		const middle = 'ba,be,bi,bo,bu,da,de,di,do,du,fa,fe,fi,fo,fu,ga,ge,gi,go,gu,la,le,li,lo,lu,ma,me,mi,mo,mu,ra,re,ri,ro,ru,va,ve,vi,vo,vu,wa,we,wi,wo,wu'.split(',');
		const last = 'do,in,is,la,las,lin,mag,na,nas,or,ra,run,tea,us,va,var,vin,wen,wyn,ya'.split(',');

		if (Math.random() < 0.5) return fix(r(first) + r(middle) + r(last));

		return fix(r(first) + r(middle) + r(middle) + r(last));

		function r(list: string[]): string {
			return list[Math.floor(Math.random() * list.length)];
		}

		function fix(name: string): string {
			let lastChar: string | false = false;
			return name.split('').filter(c => (c === lastChar) ? false : lastChar = c).join('');
		}
	}
}