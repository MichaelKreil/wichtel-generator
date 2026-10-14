import { pick } from './random.ts';

export interface Theme {
	id: string;
	/** Dark background photo → light text. */
	dark: boolean;
	/** Where the content panel sits so the photo's motif stays visible. */
	align: 'left' | 'center';
}

// Background photos live in assets/backgrounds/<id>.jpg; run `npm run images` after adding one.
export const THEMES: readonly Theme[] = [
	{ id: 'bag', dark: false, align: 'left' },
	{ id: 'ball', dark: true, align: 'left' },
	{ id: 'candle', dark: true, align: 'left' },
	{ id: 'christmas1', dark: false, align: 'left' },
	{ id: 'christmas2', dark: false, align: 'left' },
	{ id: 'christmas3', dark: false, align: 'left' },
	{ id: 'decoration', dark: false, align: 'left' },
	{ id: 'gift1', dark: false, align: 'left' },
	{ id: 'gift2', dark: false, align: 'left' },
	{ id: 'gift3', dark: false, align: 'left' },
	{ id: 'santa', dark: false, align: 'left' },
	{ id: 'silver', dark: false, align: 'center' },
	{ id: 'snow1', dark: false, align: 'center' },
	{ id: 'snow2', dark: false, align: 'center' },
	{ id: 'snow3', dark: false, align: 'center' },
	{ id: 'snowfall', dark: false, align: 'center' },
	{ id: 'snowflake', dark: false, align: 'left' },
	{ id: 'snowman', dark: false, align: 'left' },
	{ id: 'tree1', dark: true, align: 'left' },
	{ id: 'tree2', dark: false, align: 'left' },
	{ id: 'tree3', dark: true, align: 'left' },
	{ id: 'tree4', dark: false, align: 'left' },
	{ id: 'tree5', dark: false, align: 'left' },
	{ id: 'tree6', dark: false, align: 'left' },
	{ id: 'tree7', dark: false, align: 'left' },
	{ id: 'tree8', dark: false, align: 'left' },
	{ id: 'tree9', dark: false, align: 'left' },
	{ id: 'wood1', dark: true, align: 'left' },
	{ id: 'wood2', dark: false, align: 'left' },
];

const byId = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id: unknown): Theme | undefined {
	return typeof id === 'string' ? byId.get(id) : undefined;
}

export function randomTheme(): Theme {
	return pick(THEMES);
}

/** Per-theme CSS: background images and tone. Served as /static/themes.css. */
export function themesCss(): string {
	return THEMES.map(
		({ id, dark, align }) =>
			`[data-theme="${id}"]{--bg-sm:url(/static/img/bg/${id}-sm.webp);--bg-lg:url(/static/img/bg/${id}-lg.webp)}` +
			`[data-theme="${id}"]{${dark ? '--fg:#fff;--fg-inverse:#000;--field:rgb(255 255 255/.12);--field-hover:rgb(255 255 255/.22);--glass:blur(15px) brightness(80%)' : ''}}` +
			(align === 'center' ? `[data-theme="${id}"]{--panel-start:auto;--panel-end:auto}` : ''),
	)
		.join('\n')
		.replace(/\[data-theme="[^"]+"\]\{\}/g, '');
}
