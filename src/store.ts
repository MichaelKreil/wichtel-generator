import { timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { draw, type IsAllowed, isDrawPossible } from './draw.ts';
import { pick, potId, randomToken } from './random.ts';

export interface Pot {
	id: string;
	adminToken: string;
	theme: string;
	createdAt: number;
	updatedAt: number;
	closedAt: number | null;
}

export interface Participant {
	id: number;
	name: string;
	codeName: string;
	token: string;
	receiverId: number | null;
}

export interface Exclusion {
	a: number;
	b: number;
}

export type JoinResult =
	| { ok: true; participant: Participant; isNew: boolean }
	| { ok: false; error: 'closed' | 'name-taken' | 'full' };

export type CloseResult = { ok: true } | { ok: false; error: 'closed' | 'too-few' | 'impossible' };

export const MIN_PARTICIPANTS = 3;
export const MAX_NAME_LENGTH = 100;

const SCHEMA = `
	PRAGMA journal_mode = WAL;
	PRAGMA foreign_keys = ON;

	CREATE TABLE IF NOT EXISTS pots (
		id          TEXT PRIMARY KEY,
		admin_token TEXT NOT NULL,
		theme       TEXT NOT NULL,
		created_at  INTEGER NOT NULL,
		updated_at  INTEGER NOT NULL,
		closed_at   INTEGER
	);

	CREATE TABLE IF NOT EXISTS participants (
		id          INTEGER PRIMARY KEY,
		pot_id      TEXT NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
		name        TEXT NOT NULL,
		name_key    TEXT NOT NULL,
		code_name   TEXT NOT NULL,
		token       TEXT NOT NULL,
		receiver_id INTEGER REFERENCES participants(id),
		created_at  INTEGER NOT NULL,
		UNIQUE (pot_id, name_key),
		UNIQUE (pot_id, code_name)
	);

	CREATE TABLE IF NOT EXISTS exclusions (
		pot_id TEXT NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
		a      INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
		b      INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
		PRIMARY KEY (pot_id, a, b),
		CHECK (a < b)
	);

	CREATE INDEX IF NOT EXISTS pots_updated_at ON pots(updated_at);
`;

/** Normalized name used to detect duplicates ("anna  müller" = "Anna Müller"). */
export function nameKey(name: string): string {
	return name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de');
}

export function cleanName(input: unknown): string {
	return String(input ?? '')
		.normalize('NFKC')
		.replace(/[\p{Cc}\p{Cf}]/gu, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_NAME_LENGTH);
}

/**
 * All persistence. node:sqlite is synchronous, so every method runs atomically with respect to other requests.
 */
export class Store {
	readonly #db: DatabaseSync;
	readonly #codeNames: readonly string[];
	readonly #now: () => number;

	constructor(path: string, codeNames: readonly string[], now: () => number = Date.now) {
		if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
		this.#db = new DatabaseSync(path);
		this.#db.exec(SCHEMA);
		this.#codeNames = codeNames;
		this.#now = now;
	}

	close(): void {
		this.#db.close();
	}

	get maxParticipants(): number {
		return this.#codeNames.length;
	}

	createPot(theme: string): Pot {
		const now = this.#now();
		const insert = this.#db.prepare(
			'INSERT OR IGNORE INTO pots (id, admin_token, theme, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
		);
		for (;;) {
			const id = potId();
			const adminToken = randomToken(24);
			if (insert.run(id, adminToken, theme, now, now).changes === 1) {
				return { id, adminToken, theme, createdAt: now, updatedAt: now, closedAt: null };
			}
		}
	}

	getPot(id: string): Pot | undefined {
		const row = this.#db.prepare('SELECT * FROM pots WHERE id = ?').get(id);
		if (!row) return undefined;
		return {
			id: row.id as string,
			adminToken: row.admin_token as string,
			theme: row.theme as string,
			createdAt: row.created_at as number,
			updatedAt: row.updated_at as number,
			closedAt: row.closed_at as number | null,
		};
	}

	isAdmin(pot: Pot, token: string): boolean {
		const a = Buffer.from(pot.adminToken);
		const b = Buffer.from(token);
		return a.length === b.length && timingSafeEqual(a, b);
	}

	/** Participants sorted by name. */
	listParticipants(potId: string): Participant[] {
		return this.#db
			.prepare('SELECT * FROM participants WHERE pot_id = ? ORDER BY name_key')
			.all(potId)
			.map((row) => ({
				id: row.id as number,
				name: row.name as string,
				codeName: row.code_name as string,
				token: row.token as string,
				receiverId: row.receiver_id as number | null,
			}));
	}

	/**
	 * Adds a participant. Joining again with the same name and the participant's token is idempotent
	 * (e.g. reloading the confirmation page) and returns the existing entry.
	 */
	join(pot: Pot, name: string, token: string | undefined): JoinResult {
		if (pot.closedAt !== null) return { ok: false, error: 'closed' };
		const participants = this.listParticipants(pot.id);

		const key = nameKey(name);
		const existing = participants.find((p) => nameKey(p.name) === key);
		if (existing) {
			if (token && existing.token === token) return { ok: true, participant: existing, isNew: false };
			return { ok: false, error: 'name-taken' };
		}

		const used = new Set(participants.map((p) => p.codeName));
		const available = this.#codeNames.filter((n) => !used.has(n));
		if (available.length === 0) return { ok: false, error: 'full' };

		const codeName = pick(available);
		const newToken = randomToken(24);
		const now = this.#now();
		const { lastInsertRowid } = this.#db
			.prepare(
				'INSERT INTO participants (pot_id, name, name_key, code_name, token, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			)
			.run(pot.id, name, key, codeName, newToken, now);
		this.#touch(pot.id);
		return {
			ok: true,
			participant: { id: Number(lastInsertRowid), name, codeName, token: newToken, receiverId: null },
			isNew: true,
		};
	}

	removeParticipant(pot: Pot, participantId: number): void {
		if (pot.closedAt !== null) return;
		this.#db.prepare('DELETE FROM participants WHERE pot_id = ? AND id = ?').run(pot.id, participantId);
		this.#touch(pot.id);
	}

	listExclusions(potId: string): Exclusion[] {
		return this.#db
			.prepare('SELECT a, b FROM exclusions WHERE pot_id = ?')
			.all(potId)
			.map((row) => ({ a: row.a as number, b: row.b as number }));
	}

	/** Excludes two participants from drawing each other (in both directions). */
	addExclusion(pot: Pot, first: number, second: number): void {
		if (pot.closedAt !== null || first === second) return;
		const [a, b] = first < second ? [first, second] : [second, first];
		const ids = new Set(this.listParticipants(pot.id).map((p) => p.id));
		if (!ids.has(a) || !ids.has(b)) return;
		this.#db.prepare('INSERT OR IGNORE INTO exclusions (pot_id, a, b) VALUES (?, ?, ?)').run(pot.id, a, b);
		this.#touch(pot.id);
	}

	removeExclusion(pot: Pot, first: number, second: number): void {
		if (pot.closedAt !== null) return;
		const [a, b] = first < second ? [first, second] : [second, first];
		this.#db.prepare('DELETE FROM exclusions WHERE pot_id = ? AND a = ? AND b = ?').run(pot.id, a, b);
		this.#touch(pot.id);
	}

	/** Draws the assignment and closes the pot. */
	closePot(pot: Pot): CloseResult {
		if (pot.closedAt !== null) return { ok: false, error: 'closed' };
		const participants = this.listParticipants(pot.id);
		if (participants.length < MIN_PARTICIPANTS) return { ok: false, error: 'too-few' };

		const assignment = draw(participants.length, this.#isAllowed(pot.id, participants));
		if (!assignment) return { ok: false, error: 'impossible' };

		const setReceiver = this.#db.prepare('UPDATE participants SET receiver_id = ? WHERE id = ?');
		this.#transaction(() => {
			assignment.forEach((receiver, giver) => {
				setReceiver.run((participants[receiver] as Participant).id, (participants[giver] as Participant).id);
			});
			this.#db
				.prepare('UPDATE pots SET closed_at = ?, updated_at = ? WHERE id = ?')
				.run(this.#now(), this.#now(), pot.id);
		});
		return { ok: true };
	}

	/** True if the pot can currently be drawn, respecting all exclusions. */
	canDraw(potId: string): boolean {
		const participants = this.listParticipants(potId);
		return (
			participants.length >= MIN_PARTICIPANTS &&
			isDrawPossible(participants.length, this.#isAllowed(potId, participants))
		);
	}

	/** Deletes pots without activity since `cutoff` (ms timestamp). Returns the number of deleted pots. */
	deleteInactiveSince(cutoff: number): number {
		return Number(this.#db.prepare('DELETE FROM pots WHERE updated_at < ?').run(cutoff).changes);
	}

	/** Translates exclusions into a check on participant indexes, as used by draw(). */
	#isAllowed(potId: string, participants: Participant[]): IsAllowed {
		const index = new Map(participants.map((p, i) => [p.id, i]));
		const forbidden = new Set(
			this.listExclusions(potId).flatMap(({ a, b }) => [
				`${index.get(a)}>${index.get(b)}`,
				`${index.get(b)}>${index.get(a)}`,
			]),
		);
		return (giver, receiver) => !forbidden.has(`${giver}>${receiver}`);
	}

	#touch(potId: string): void {
		this.#db.prepare('UPDATE pots SET updated_at = ? WHERE id = ?').run(this.#now(), potId);
	}

	#transaction(fn: () => void): void {
		this.#db.exec('BEGIN');
		try {
			fn();
			this.#db.exec('COMMIT');
		} catch (error) {
			this.#db.exec('ROLLBACK');
			throw error;
		}
	}
}
