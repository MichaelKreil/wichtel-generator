/**
 * Minimal async SQL interface, implemented for node:sqlite (src/db-node.ts) and Cloudflare D1 (src/db-d1.ts).
 */
export type Value = string | number | null;
export type Row = Record<string, Value>;

export interface Statement {
	sql: string;
	params: Value[];
}

export function sql(text: string, ...params: Value[]): Statement {
	return { sql: text, params };
}

export interface Database {
	all(statement: Statement): Promise<Row[]>;
	first(statement: Statement): Promise<Row | undefined>;
	/** Runs all statements in one transaction. Returns the number of changed rows per statement. */
	batch(statements: Statement[]): Promise<number[]>;
}

export function isUniqueViolation(error: unknown): boolean {
	return /UNIQUE constraint failed/.test(String(error));
}
