import { pick } from './random.ts';

/** A background photo: assets/backgrounds/<id>.jpg, served as WebP from public/static/img (`npm run images`). */
export interface Theme {
	id: string;
	/** Shown as alternative text in the picker */
	label: string;
	/** Average color of the photo: shown while it loads, and as the browser bar color */
	color: string;
	/** Light tint of the photo's main color for the content card, so dark text stays readable */
	card: string;
	/** Where the card sits on wide screens, so the photo's motif stays visible */
	align: 'left' | 'center';
}

export const THEMES: readonly Theme[] = [
	{ id: 'bag', label: 'Geschenksack', color: '#dab8b9', card: '#fddedb', align: 'left' },
	{ id: 'ball', label: 'Christbaumkugel', color: '#8f5d43', card: '#fbe0d3', align: 'left' },
	{ id: 'candle', label: 'Kerzenschein', color: '#53260c', card: '#fbe0d2', align: 'left' },
	{ id: 'christmas1', label: 'Rote Kugeln im Schnee', color: '#92b0bd', card: '#dfe8ed', align: 'left' },
	{ id: 'christmas2', label: 'Hängende Kugeln', color: '#a9c5dc', card: '#d7e8fe', align: 'left' },
	{ id: 'christmas3', label: 'Roter Sternenbaum', color: '#8a1b14', card: '#fdded9', align: 'left' },
	{ id: 'decoration', label: 'Strohsterne', color: '#c2bfbb', card: '#ebe5de', align: 'left' },
	{ id: 'gift1', label: 'Kleine Päckchen', color: '#cdced0', card: '#ece5de', align: 'left' },
	{ id: 'gift2', label: 'Blaues Geschenk', color: '#c7ddf4', card: '#d6e8fe', align: 'left' },
	{ id: 'gift3', label: 'Schwarzes Geschenk', color: '#c2b9b3', card: '#ece5de', align: 'left' },
	{ id: 'santa', label: 'Weihnachtsmann', color: '#e9b970', card: '#f5e3cd', align: 'left' },
	{ id: 'silver', label: 'Silberglanz', color: '#d1d1d1', card: '#ebe4eb', align: 'center' },
	{ id: 'snow1', label: 'Glitzerschnee', color: '#dad4d2', card: '#eee4e1', align: 'center' },
	{ id: 'snow2', label: 'Schneedünen', color: '#e8e7e6', card: '#e8e6dd', align: 'center' },
	{ id: 'snow3', label: 'Pulverschnee', color: '#e8e9ee', card: '#e2e6ef', align: 'center' },
	{ id: 'snowfall', label: 'Schneegestöber', color: '#b09aaa', card: '#f2dff4', align: 'center' },
	{ id: 'snowflake', label: 'Schneeflocke', color: '#7d8d9e', card: '#e0e7ee', align: 'left' },
	{ id: 'snowman', label: 'Schneemann', color: '#7e98af', card: '#d5e9fd', align: 'left' },
	{ id: 'tree1', label: 'Weihnachtsbaum', color: '#751f17', card: '#fdded8', align: 'left' },
	{ id: 'tree2', label: 'Verschneite Tanne', color: '#9da0a4', card: '#e2e6ee', align: 'left' },
	{ id: 'tree3', label: 'Lichterbaum', color: '#ae1c15', card: '#fdded8', align: 'left' },
	{ id: 'tree4', label: 'Winterwald', color: '#c5bfb0', card: '#e9e6dd', align: 'left' },
	{ id: 'tree5', label: 'Sternennacht', color: '#bccbd8', card: '#d5e9fd', align: 'left' },
	{ id: 'tree6', label: 'Tannenzweig', color: '#99866d', card: '#f5e3cd', align: 'left' },
	{ id: 'tree7', label: 'Einsamer Baum', color: '#d3deeb', card: '#e1e7ee', align: 'left' },
	{ id: 'tree8', label: 'Raureif', color: '#dee0e5', card: '#e2e6ee', align: 'left' },
	{ id: 'tree9', label: 'Funkelbaum', color: '#cb5556', card: '#fddedb', align: 'left' },
	{ id: 'wood1', label: 'Dunkles Holz', color: '#59412e', card: '#f9e1d0', align: 'left' },
	{ id: 'wood2', label: 'Helles Holz', color: '#997c64', card: '#f8e1cf', align: 'left' },
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
		({ id, color, card, align }) =>
			`[data-theme="${id}"]{--paper-color:${color};--card:${card};--bg-sm:url(/static/img/bg/${id}-sm.webp);--bg-lg:url(/static/img/bg/${id}-lg.webp)${align === 'center' ? ';--card-start:auto' : ''}}`,
	).join('\n');
}
