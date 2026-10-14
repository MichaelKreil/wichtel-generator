import { pick } from './random.ts';

/** A background photo: assets/backgrounds/<id>.jpg, served as WebP from public/static/img (`npm run images`). */
export interface Theme {
	id: string;
	/** Shown as alternative text in the picker */
	label: string;
	/** Average color of the photo: shown while it loads, and as the browser bar color */
	color: string;
	/** Where the card sits on wide screens, so the photo's motif stays visible */
	align: 'left' | 'center';
}

export const THEMES: readonly Theme[] = [
	{ id: 'bag', label: 'Geschenksack', color: '#dab8b9', align: 'left' },
	{ id: 'ball', label: 'Christbaumkugel', color: '#8f5d43', align: 'left' },
	{ id: 'candle', label: 'Kerzenschein', color: '#53260c', align: 'left' },
	{ id: 'christmas1', label: 'Rote Kugeln im Schnee', color: '#92b0bd', align: 'left' },
	{ id: 'christmas2', label: 'Hängende Kugeln', color: '#a9c5dc', align: 'left' },
	{ id: 'christmas3', label: 'Roter Sternenbaum', color: '#8a1b14', align: 'left' },
	{ id: 'decoration', label: 'Strohsterne', color: '#c2bfbb', align: 'left' },
	{ id: 'gift1', label: 'Kleine Päckchen', color: '#cdced0', align: 'left' },
	{ id: 'gift2', label: 'Blaues Geschenk', color: '#c7ddf4', align: 'left' },
	{ id: 'gift3', label: 'Schwarzes Geschenk', color: '#c2b9b3', align: 'left' },
	{ id: 'santa', label: 'Weihnachtsmann', color: '#e9b970', align: 'left' },
	{ id: 'silver', label: 'Silberglanz', color: '#d1d1d1', align: 'center' },
	{ id: 'snow1', label: 'Glitzerschnee', color: '#dad4d2', align: 'center' },
	{ id: 'snow2', label: 'Schneedünen', color: '#e8e7e6', align: 'center' },
	{ id: 'snow3', label: 'Pulverschnee', color: '#e8e9ee', align: 'center' },
	{ id: 'snowfall', label: 'Schneegestöber', color: '#b09aaa', align: 'center' },
	{ id: 'snowflake', label: 'Schneeflocke', color: '#7d8d9e', align: 'left' },
	{ id: 'snowman', label: 'Schneemann', color: '#7e98af', align: 'left' },
	{ id: 'tree1', label: 'Weihnachtsbaum', color: '#751f17', align: 'left' },
	{ id: 'tree2', label: 'Verschneite Tanne', color: '#9da0a4', align: 'left' },
	{ id: 'tree3', label: 'Lichterbaum', color: '#ae1c15', align: 'left' },
	{ id: 'tree4', label: 'Winterwald', color: '#c5bfb0', align: 'left' },
	{ id: 'tree5', label: 'Sternennacht', color: '#bccbd8', align: 'left' },
	{ id: 'tree6', label: 'Tannenzweig', color: '#99866d', align: 'left' },
	{ id: 'tree7', label: 'Einsamer Baum', color: '#d3deeb', align: 'left' },
	{ id: 'tree8', label: 'Raureif', color: '#dee0e5', align: 'left' },
	{ id: 'tree9', label: 'Funkelbaum', color: '#cb5556', align: 'left' },
	{ id: 'wood1', label: 'Dunkles Holz', color: '#59412e', align: 'left' },
	{ id: 'wood2', label: 'Helles Holz', color: '#997c64', align: 'left' },
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

/** Per-theme CSS variables. Written to public/static/themes.css by `npm run assets`. */
export function themesCss(): string {
	return THEMES.map(
		({ id, color, align }) =>
			`[data-theme="${id}"]{--paper-color:${color};--bg-sm:url(/static/img/bg/${id}-sm.webp);--bg-lg:url(/static/img/bg/${id}-lg.webp)${align === 'center' ? ';--card-start:auto' : ''}}`,
	).join('\n');
}
