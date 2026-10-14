/** Returns true if the request identified by `key` is allowed. */
export type RateLimiter = (key: string) => Promise<boolean>;

export interface RateLimiters {
	/** Creating pots */
	create: RateLimiter;
	/** All other form submissions */
	write: RateLimiter;
}

/** Fixed-window limiter in memory, for the Node server (single process). */
export function memoryRateLimiter(limit: number, periodMs: number, now: () => number = Date.now): RateLimiter {
	let windowStart = now();
	let counts = new Map<string, number>();
	return async (key) => {
		if (now() - windowStart >= periodMs) {
			windowStart = now();
			counts = new Map();
		}
		const count = (counts.get(key) ?? 0) + 1;
		counts.set(key, count);
		return count <= limit;
	};
}

/** The subset of Cloudflare's rate limiting binding that we use. */
export interface RateLimitBinding {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export function bindingRateLimiter(binding: RateLimitBinding): RateLimiter {
	return async (key) => (await binding.limit({ key })).success;
}
