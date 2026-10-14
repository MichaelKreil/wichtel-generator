import { pick } from './random.ts';

/** A wrapping paper: the page background, tiled from public/static/paper/<id>.svg */
export interface Theme {
	id: string;
	label: string;
	/** Main color of the paper, shown while the pattern loads and as the browser bar color */
	color: string;
}

export const THEMES: readonly Theme[] = [
	{ id: 'tanne', label: 'Tannengrün', color: '#1e4634' },
	{ id: 'zuckerstange', label: 'Zuckerstange', color: '#b3241e' },
	{ id: 'schnee', label: 'Schneeflocken', color: '#1d2b4f' },
	{ id: 'wald', label: 'Tannenwald', color: '#d3e6d8' },
	{ id: 'karo', label: 'Holzfällerkaro', color: '#a3201b' },
	{ id: 'bordeaux', label: 'Bordeaux & Gold', color: '#5a1424' },
	{ id: 'lebkuchen', label: 'Lebkuchen', color: '#8b5a36' },
	{ id: 'punkte', label: 'Rote Punkte', color: '#ffffff' },
];

const byId = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id: unknown): Theme | undefined {
	return typeof id === 'string' ? byId.get(id) : undefined;
}

export function randomTheme(): Theme {
	return pick(THEMES);
}

/** A theme by id; unknown ids (e.g. of retired designs) get the first one. */
export function themeOrDefault(id: string): Theme {
	return byId.get(id) ?? (THEMES[0] as Theme);
}

/** Per-theme CSS variables. Written to public/static/themes.css by `npm run themes`. */
export function themesCss(): string {
	return THEMES.map(
		({ id, color }) => `[data-theme="${id}"]{--paper-color:${color};--paper:url(/static/paper/${id}.svg)}`,
	).join('\n');
}
