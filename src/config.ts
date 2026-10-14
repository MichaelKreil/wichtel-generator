export interface Config {
	port: number;
	/** Public URL of the app, e.g. "https://wichteln.example.org". Derived from the request when unset. */
	baseUrl: string | undefined;
	databasePath: string;
	/** Pots without any activity for this many days are deleted. */
	potTtlDays: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
	return {
		port: parseInteger(env.PORT, 8080),
		baseUrl: env.BASEURL?.replace(/\/+$/, '') || undefined,
		databasePath: env.DATABASE_PATH ?? 'database/wichtel.sqlite',
		potTtlDays: parseInteger(env.POT_TTL_DAYS, 180),
	};
}

function parseInteger(value: string | undefined, fallback: number): number {
	if (value === undefined || value === '') return fallback;
	const number = Number(value);
	if (!Number.isInteger(number) || number < 0) throw new Error(`invalid integer: ${value}`);
	return number;
}
