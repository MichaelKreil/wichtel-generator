import { readFileSync } from 'node:fs';
import { serveStatic } from '@hono/node-server/serve-static';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { secureHeaders } from 'hono/secure-headers';
import { cleanName, type Participant, type Pot, type Store } from './store.ts';
import { getTheme, randomTheme, themesCss } from './themes.ts';
import { adminPage, errorPage, joinedPage, potPage, type ResultRow, resultPage, startPage } from './views.ts';

export interface AppOptions {
	store: Store;
	baseUrl?: string;
}

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export function loadCodeNames(path = new URL('../data/codenames.txt', import.meta.url)): string[] {
	const names = readFileSync(path, 'utf8')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	return [...new Set(names)];
}

export function createApp({ store, baseUrl }: AppOptions): Hono {
	const app = new Hono();
	const css = themesCss();

	/** Public origin, e.g. "https://wichteln.example.org". Behind a proxy, BASEURL should be set. */
	const origin = (c: Context): string => {
		if (baseUrl) return baseUrl;
		const url = new URL(c.req.url);
		const proto = c.req.header('x-forwarded-proto') ?? url.protocol.replace(':', '');
		return `${proto}://${c.req.header('host') ?? url.host}`;
	};

	app.use(
		secureHeaders({
			contentSecurityPolicy: {
				defaultSrc: ["'self'"],
				imgSrc: ["'self'", 'data:'],
				baseUri: ["'none'"],
				formAction: ["'self'"],
				frameAncestors: ["'none'"],
				objectSrc: ["'none'"],
			},
			referrerPolicy: 'no-referrer',
		}),
	);
	app.use(csrf({ origin: (requestOrigin, c) => requestOrigin === origin(c) }));
	app.use(bodyLimit({ maxSize: 16 * 1024 }));

	app.get('/healthz', (c) => c.text('ok'));

	app.get('/static/themes.css', (c) => {
		c.header('Cache-Control', 'public, max-age=86400');
		return c.body(css, 200, { 'Content-Type': 'text/css; charset=utf-8' });
	});
	app.use(
		'/static/*',
		serveStatic({
			root: new URL('../public', import.meta.url).pathname,
			rewriteRequestPath: (path) => path.replace(/^\/static/, ''),
			onFound: (_path, c) => {
				c.header('Cache-Control', 'public, max-age=86400');
			},
		}),
	);

	app.get('/', (c) => c.html(startPage(randomTheme().id)));

	app.post('/neu', async (c) => {
		const body = await c.req.parseBody();
		const theme = getTheme(body.theme) ?? randomTheme();
		const pot = store.createPot(theme.id);
		return c.redirect(`${adminPath(pot)}?neu`, 303);
	});

	// --- participants ---

	const cookieName = (pot: Pot) => `wichtel_${pot.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
	const currentParticipant = (c: Context, pot: Pot): Participant | undefined => {
		const token = getCookie(c, cookieName(pot));
		return token ? store.listParticipants(pot.id).find((p) => p.token === token) : undefined;
	};

	app.get('/:pot', (c) => {
		const pot = store.getPot(c.req.param('pot'));
		if (!pot) return notFound(c);
		const me = currentParticipant(c, pot);
		if (pot.closedAt !== null) return c.html(resultPage(pot.theme, results(pot), me));
		return c.html(
			potPage({ theme: pot.theme, potPath: potPath(pot), participants: store.listParticipants(pot.id), me }),
		);
	});

	app.post('/:pot', async (c) => {
		const pot = store.getPot(c.req.param('pot'));
		if (!pot) return notFound(c);
		if (pot.closedAt !== null) return c.redirect(potPath(pot), 303);

		const name = cleanName((await c.req.parseBody()).name);
		const showError = (error: string) =>
			c.html(
				potPage({ theme: pot.theme, potPath: potPath(pot), participants: store.listParticipants(pot.id), error }),
				400,
			);
		if (name.length < 2) return showError('Bitte gib deinen Namen ein.');

		const result = store.join(pot, name, getCookie(c, cookieName(pot)));
		if (!result.ok) {
			switch (result.error) {
				case 'closed':
					return c.redirect(potPath(pot), 303);
				case 'name-taken':
					return showError(
						`„${name}“ ist schon im Topf. Bitte gib deinen vollen Namen an, damit man euch unterscheiden kann.`,
					);
				case 'full':
					return showError('Der Wichteltopf ist leider voll.');
			}
		}

		setCookie(c, cookieName(pot), result.participant.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
			secure: origin(c).startsWith('https:'),
			maxAge: COOKIE_MAX_AGE,
		});
		return c.html(joinedPage(pot.theme, result.participant));
	});

	// --- admin ---

	const admin = new Hono<{ Variables: { pot: Pot } }>();

	admin.use(async (c, next) => {
		const pot = store.getPot(c.req.param('pot') ?? '');
		if (!pot || !store.isAdmin(pot, c.req.param('token') ?? '')) return notFound(c);
		c.set('pot', pot);
		await next();
	});

	const renderAdmin = (c: Context, pot: Pot, error?: string) => {
		const participants = store.listParticipants(pot.id);
		return c.html(
			adminPage({
				theme: pot.theme,
				potUrl: origin(c) + potPath(pot),
				adminUrl: origin(c) + adminPath(pot),
				adminPath: adminPath(pot),
				isNew: c.req.query('neu') !== undefined,
				closed: pot.closedAt !== null,
				participants,
				exclusions: store.listExclusions(pot.id),
				drawPossible: store.canDraw(pot.id),
				error,
				result: pot.closedAt !== null ? results(pot) : undefined,
			}),
			error ? 400 : 200,
		);
	};

	admin.get('/', (c) => renderAdmin(c, c.var.pot));

	admin.post('/entfernen', async (c) => {
		const body = await c.req.parseBody();
		store.removeParticipant(c.var.pot, Number(body.participant));
		return c.redirect(adminPath(c.var.pot), 303);
	});

	admin.post('/ausschluss', async (c) => {
		const body = await c.req.parseBody();
		store.addExclusion(c.var.pot, Number(body.a), Number(body.b));
		return c.redirect(adminPath(c.var.pot), 303);
	});

	admin.post('/ausschluss-entfernen', async (c) => {
		const body = await c.req.parseBody();
		store.removeExclusion(c.var.pot, Number(body.a), Number(body.b));
		return c.redirect(adminPath(c.var.pot), 303);
	});

	admin.post('/schliessen', (c) => {
		const result = store.closePot(c.var.pot);
		if (!result.ok && result.error !== 'closed') {
			const message =
				result.error === 'too-few'
					? 'Zum Auslosen braucht es mindestens drei Wichtel.'
					: 'Mit diesen Ausschlüssen ist keine Auslosung möglich.';
			return renderAdmin(c, c.var.pot, message);
		}
		return c.redirect(adminPath(c.var.pot), 303);
	});

	app.route('/:pot/admin/:token', admin);

	app.notFound(notFound);

	function results(pot: Pot): ResultRow[] {
		const participants = store.listParticipants(pot.id);
		const nameOf = new Map(participants.map((p) => [p.id, p.name]));
		return participants
			.map((p) => ({ codeName: p.codeName, receiver: nameOf.get(p.receiverId ?? -1) ?? '?' }))
			.sort((a, b) => a.codeName.localeCompare(b.codeName, 'de'));
	}

	return app;
}

function potPath(pot: Pot): string {
	return `/${pot.id}`;
}

function adminPath(pot: Pot): string {
	return `/${pot.id}/admin/${pot.adminToken}`;
}

function notFound(c: Context) {
	return c.html(
		errorPage(
			randomTheme().id,
			'Seite nicht gefunden',
			'Hast du den richtigen Link geöffnet? Alte Wichteltöpfe werden nach einiger Zeit gelöscht.',
		),
		404,
	);
}
