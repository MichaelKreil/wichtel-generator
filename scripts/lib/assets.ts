import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** The files that pages link with a version (?v=…), so browsers fetch them again after every change. */
export const VERSIONED_FILES = ['public/static/style.css', 'public/static/app.js', 'public/static/themes.css'];

/** Short hash over the versioned files. */
export function assetVersion(): string {
	const hash = createHash('sha256');
	for (const file of VERSIONED_FILES) hash.update(readFileSync(new URL(`../../${file}`, import.meta.url)));
	return hash.digest('hex').slice(0, 10);
}
