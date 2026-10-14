import type { Database, Row, Statement, Value } from './db.ts';

// The subset of Cloudflare's D1 binding that we use.
export interface D1PreparedStatement {
	bind(...values: Value[]): D1PreparedStatement;
	all<T = Row>(): Promise<{ results: T[] }>;
	first<T = Row>(): Promise<T | null>;
}

export interface D1Binding {
	prepare(sql: string): D1PreparedStatement;
	batch(statements: D1PreparedStatement[]): Promise<{ meta: { changes: number } }[]>;
}

export class D1Database implements Database {
	readonly #d1: D1Binding;

	constructor(d1: D1Binding) {
		this.#d1 = d1;
	}

	async all(statement: Statement): Promise<Row[]> {
		return (await this.#prepare(statement).all<Row>()).results;
	}

	async first(statement: Statement): Promise<Row | undefined> {
		return (await this.#prepare(statement).first<Row>()) ?? undefined;
	}

	async batch(statements: Statement[]): Promise<number[]> {
		const results = await this.#d1.batch(statements.map((s) => this.#prepare(s)));
		return results.map((result) => result.meta.changes);
	}

	#prepare({ sql, params }: Statement): D1PreparedStatement {
		return this.#d1.prepare(sql).bind(...params);
	}
}
