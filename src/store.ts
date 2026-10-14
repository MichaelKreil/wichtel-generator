import { type Database, isUniqueViolation, type Row, sql } from './db.ts';
import { draw, type IsAllowed, isDrawPossible } from './draw.ts';
import { pick, potId, randomToken, safeEqual } from './random.ts';

export interface Pot {
	id: string;
	adminToken: string;
	theme: string;
	version: number;
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

/** Concurrent requests are resolved by retrying; this many attempts is plenty. */
const MAX_ATTEMPTS = 5;

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

// Guard for writes: only change pots that are still open.
const IS_OPEN = 'EXISTS (SELECT 1 FROM pots WHERE id = ? AND closed_at IS NULL)';

function toPot(row: Row): Pot {
	return {
		id: row.id as string,
		adminToken: row.admin_token as string,
		theme: row.theme as string,
		version: row.version as number,
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number,
		closedAt: row.closed_at as number | null,
	};
}

function toParticipant(row: Row): Participant {
	return {
		id: row.id as number,
		name: row.name as string,
		codeName: row.code_name as string,
		token: row.token as string,
		receiverId: row.receiver_id as number | null,
	};
}

/** Translates exclusions into a check on participant indexes, as used by draw(). */
function isAllowedFor(participants: Participant[], exclusions: Exclusion[]): IsAllowed {
	const index = new Map(participants.map((p, i) => [p.id, i]));
	const forbidden = new Set(
		exclusions.flatMap(({ a, b }) => [`${index.get(a)}>${index.get(b)}`, `${index.get(b)}>${index.get(a)}`]),
	);
	return (giver, receiver) => !forbidden.has(`${giver}>${receiver}`);
}

/** True if the participants can be drawn, respecting all exclusions. */
export function canDraw(participants: Participant[], exclusions: Exclusion[]): boolean {
	return (
		participants.length >= MIN_PARTICIPANTS &&
		isDrawPossible(participants.length, isAllowedFor(participants, exclusions))
	);
}

/**
 * All persistence. Requests may run concurrently (especially on Cloudflare), so every write is a single atomic
 * batch that re-checks its preconditions in SQL. Closing a pot uses the pot's `version` for optimistic locking.
 */
export class Store {
	readonly #db: Database;
	readonly #codeNames: readonly string[];
	readonly #now: () => number;

	constructor(db: Database, codeNames: readonly string[], now: () => number = Date.now) {
		this.#db = db;
		this.#codeNames = codeNames;
		this.#now = now;
	}

	async createPot(theme: string): Promise<Pot> {
		for (;;) {
			const now = this.#now();
			const pot: Pot = {
				id: potId(),
				adminToken: randomToken(24),
				theme,
				version: 0,
				createdAt: now,
				updatedAt: now,
				closedAt: null,
			};
			const [inserted] = await this.#db.batch([
				sql(
					'INSERT OR IGNORE INTO pots (id, admin_token, theme, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
					pot.id,
					pot.adminToken,
					pot.theme,
					now,
					now,
				),
			]);
			if (inserted === 1) return pot;
		}
	}

	async getPot(id: string): Promise<Pot | undefined> {
		const row = await this.#db.first(sql('SELECT * FROM pots WHERE id = ?', id));
		return row && toPot(row);
	}

	isAdmin(pot: Pot, token: string): boolean {
		return safeEqual(pot.adminToken, token);
	}

	/** Participants sorted by name. */
	async listParticipants(potId: string): Promise<Participant[]> {
		const rows = await this.#db.all(sql('SELECT * FROM participants WHERE pot_id = ? ORDER BY name_key', potId));
		return rows.map(toParticipant);
	}

	async listExclusions(potId: string): Promise<Exclusion[]> {
		const rows = await this.#db.all(sql('SELECT a, b FROM exclusions WHERE pot_id = ?', potId));
		return rows.map((row) => ({ a: row.a as number, b: row.b as number }));
	}

	/**
	 * Adds a participant. Joining again with the same name and the participant's token is idempotent
	 * (e.g. reloading the confirmation page) and returns the existing entry.
	 */
	async join(pot: Pot, name: string, token: string | undefined): Promise<JoinResult> {
		const key = nameKey(name);
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			const participants = await this.listParticipants(pot.id);

			const existing = participants.find((p) => nameKey(p.name) === key);
			if (existing) {
				if (token && safeEqual(existing.token, token)) return { ok: true, participant: existing, isNew: false };
				return { ok: false, error: 'name-taken' };
			}

			const used = new Set(participants.map((p) => p.codeName));
			const available = this.#codeNames.filter((n) => !used.has(n));
			if (available.length === 0) return { ok: false, error: 'full' };

			const codeName = pick(available);
			const newToken = randomToken(24);
			const now = this.#now();
			try {
				const [inserted] = await this.#db.batch([
					sql(
						`INSERT INTO participants (pot_id, name, name_key, code_name, token, created_at)
						SELECT ?, ?, ?, ?, ?, ? WHERE ${IS_OPEN}`,
						pot.id,
						name,
						key,
						codeName,
						newToken,
						now,
						pot.id,
					),
					this.#touch(pot.id),
				]);
				if (inserted === 0) return { ok: false, error: 'closed' };
			} catch (error) {
				// someone else joined at the same moment with the same name or code name: check again
				if (isUniqueViolation(error)) continue;
				throw error;
			}

			const row = await this.#db.first(
				sql('SELECT * FROM participants WHERE pot_id = ? AND token = ?', pot.id, newToken),
			);
			if (!row) throw new Error('participant vanished after insert');
			return { ok: true, participant: toParticipant(row), isNew: true };
		}
		throw new Error('too many concurrent joins');
	}

	async removeParticipant(pot: Pot, participantId: number): Promise<void> {
		await this.#db.batch([
			sql(`DELETE FROM participants WHERE pot_id = ? AND id = ? AND ${IS_OPEN}`, pot.id, participantId, pot.id),
			this.#touch(pot.id),
		]);
	}

	/** Excludes two participants from drawing each other (in both directions). */
	async addExclusion(pot: Pot, first: number, second: number): Promise<void> {
		if (!Number.isInteger(first) || !Number.isInteger(second) || first === second) return;
		const [a, b] = first < second ? [first, second] : [second, first];
		await this.#db.batch([
			sql(
				`INSERT OR IGNORE INTO exclusions (pot_id, a, b)
				SELECT ?, ?, ? WHERE ${IS_OPEN}
				AND (SELECT count(*) FROM participants WHERE pot_id = ? AND id IN (?, ?)) = 2`,
				pot.id,
				a,
				b,
				pot.id,
				pot.id,
				a,
				b,
			),
			this.#touch(pot.id),
		]);
	}

	async removeExclusion(pot: Pot, first: number, second: number): Promise<void> {
		const [a, b] = first < second ? [first, second] : [second, first];
		await this.#db.batch([
			sql(`DELETE FROM exclusions WHERE pot_id = ? AND a = ? AND b = ? AND ${IS_OPEN}`, pot.id, a, b, pot.id),
			this.#touch(pot.id),
		]);
	}

	/** Draws the assignment and closes the pot. */
	async closePot(potId: string): Promise<CloseResult> {
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			const pot = await this.getPot(potId);
			if (!pot || pot.closedAt !== null) return { ok: false, error: 'closed' };
			const participants = await this.listParticipants(pot.id);
			if (participants.length < MIN_PARTICIPANTS) return { ok: false, error: 'too-few' };
			const exclusions = await this.listExclusions(pot.id);

			const assignment = draw(participants.length, isAllowedFor(participants, exclusions));
			if (!assignment) return { ok: false, error: 'impossible' };

			// giver id → receiver id, passed as one JSON parameter to stay within D1's parameter limit
			const receivers = Object.fromEntries(
				assignment.map((receiver, giver) => [
					(participants[giver] as Participant).id,
					(participants[receiver] as Participant).id,
				]),
			);
			const now = this.#now();
			// Both statements only apply if nothing changed since we read the pot (same version).
			const changes = await this.#db.batch([
				sql(
					`UPDATE participants
					SET receiver_id = (SELECT value FROM json_each(?) WHERE key = CAST(participants.id AS TEXT))
					WHERE pot_id = ? AND (SELECT version FROM pots WHERE id = ?) = ?`,
					JSON.stringify(receivers),
					pot.id,
					pot.id,
					pot.version,
				),
				sql(
					'UPDATE pots SET closed_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ? AND closed_at IS NULL',
					now,
					now,
					pot.id,
					pot.version,
				),
			]);
			if (changes[1] === 1) return { ok: true };
		}
		throw new Error('pot keeps changing while closing');
	}

	/** Deletes pots without activity since `cutoff` (ms timestamp). Returns the number of deleted pots. */
	async deleteInactiveSince(cutoff: number): Promise<number> {
		const [deleted] = await this.#db.batch([sql('DELETE FROM pots WHERE updated_at < ?', cutoff)]);
		return deleted ?? 0;
	}

	#touch(potId: string) {
		return sql('UPDATE pots SET updated_at = ?, version = version + 1 WHERE id = ?', this.#now(), potId);
	}
}
