// A stand-in for Cloudflare's D1 binding, backed by node:sqlite, to test src/db-d1.ts without Cloudflare.
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Value } from '../src/db.ts';
import type { D1Binding, D1PreparedStatement } from '../src/db-d1.ts';

export function fakeD1(): D1Binding {
	const db = new DatabaseSync(':memory:');
	db.exec('PRAGMA foreign_keys = ON');
	const dir = new URL('../migrations/', import.meta.url);
	for (const file of readdirSync(dir).sort()) db.exec(readFileSync(new URL(file, dir), 'utf8'));

	const prepare = (
		sql: string,
		params: Value[] = [],
	): D1PreparedStatement & { run(): { meta: { changes: number } } } => ({
		bind: (...values) => prepare(sql, values),
		all: async <T>() => ({ results: db.prepare(sql).all(...params) as T[] }),
		first: async <T>() => (db.prepare(sql).get(...params) as T | undefined) ?? null,
		run: () => ({ meta: { changes: Number(db.prepare(sql).run(...params).changes) } }),
	});

	return {
		prepare: (sql) => prepare(sql),
		batch: async (statements) => {
			db.exec('BEGIN');
			try {
				const results = statements.map((s) => (s as ReturnType<typeof prepare>).run());
				db.exec('COMMIT');
				return results;
			} catch (error) {
				db.exec('ROLLBACK');
				throw error;
			}
		},
	};
}
