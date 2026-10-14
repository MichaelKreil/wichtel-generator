import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Database, Row, Statement } from './db.ts';

const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url);

export class NodeDatabase implements Database {
	readonly #db: DatabaseSync;

	constructor(path: string) {
		if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
		this.#db = new DatabaseSync(path);
		this.#db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
		this.#migrate();
	}

	async all({ sql, params }: Statement): Promise<Row[]> {
		return this.#db.prepare(sql).all(...params) as Row[];
	}

	async first({ sql, params }: Statement): Promise<Row | undefined> {
		return this.#db.prepare(sql).get(...params) as Row | undefined;
	}

	async batch(statements: Statement[]): Promise<number[]> {
		this.#db.exec('BEGIN');
		try {
			const changes = statements.map(({ sql, params }) => Number(this.#db.prepare(sql).run(...params).changes));
			this.#db.exec('COMMIT');
			return changes;
		} catch (error) {
			this.#db.exec('ROLLBACK');
			throw error;
		}
	}

	close(): void {
		this.#db.close();
	}

	/** Applies migrations/NNNN_*.sql in order; the last applied number is kept in PRAGMA user_version. */
	#migrate(): void {
		const current = Number((this.#db.prepare('PRAGMA user_version').get() as Row).user_version);
		const files = readdirSync(MIGRATIONS_DIR)
			.filter((file) => /^\d{4}_.*\.sql$/.test(file))
			.sort();
		for (const file of files) {
			const version = Number.parseInt(file, 10);
			if (version <= current) continue;
			this.#db.exec('BEGIN');
			this.#db.exec(readFileSync(new URL(file, MIGRATIONS_DIR), 'utf8'));
			this.#db.exec(`PRAGMA user_version = ${version}`);
			this.#db.exec('COMMIT');
		}
	}
}
