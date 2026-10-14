import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { safeEqual } from './random.ts';
import type { RateLimiters } from './rate-limit.ts';
import { canDraw, cleanName, type Participant, type Pot, type Store } from './store.ts';
import { getTheme, randomTheme } from './themes.ts';
import {
	adminPage,
	messagePage,
	type Page,
	personalPage,
	potPage,
	type ResultRow,
	resultPage,
	startPage,
} from './views.ts';

export interface AppOptions {
	store: Store;
	baseUrl?: string;
	/** Per-IP limits for form submissions, to protect the database quota. */
	rateLimiters?: RateLimiters;
}

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/** The app without static file serving, which is done by Cloudflare or by src/server.ts. */
export function createApp({ store, baseUrl, rateLimiters }: AppOptions): Hono {
	const app = new Hono();

	/** Public origin, e.g. "https://wichteln.example.org". Behind a proxy, BASEURL should be set. */
	const origin = (c: Context): string => {
		if (baseUrl) return baseUrl;
		const url = new URL(c.req.url);
		const proto = c.req.header('x-forwarded-proto') ?? url.protocol.replace(':', '');
		return `${proto}://${c.req.header('host') ?? url.host}`;
	};
	const page = (c: Context, theme: string = randomTheme().id): Page => ({ theme, origin: origin(c) });
	const notFound = (c: Context) =>
		c.html(
			messagePage(
				page(c),
				'Seite nicht gefunden',
				'Hast du den richtigen Link geöffnet? Alte Wichteltöpfe werden nach einiger Zeit gelöscht.',
			),
			404,
		);

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
	// Pages contain names, code names and admin links: never store them in any cache.
	app.use(async (c, next) => {
		await next();
		if (c.res.headers.get('Content-Type')?.startsWith('text/html')) c.header('Cache-Control', 'no-store');
	});
	app.use(async (c, next) => {
		if (c.req.method !== 'POST' || !rateLimiters) return next();
		// Cloudflare sets cf-connecting-ip; behind other proxies x-forwarded-for
		const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
		const limiter = c.req.path === '/neu' ? rateLimiters.create : rateLimiters.write;
		if (await limiter(ip)) return next();
		return c.html(
			messagePage(page(c), 'Zu viele Anfragen', 'Bitte warte eine Minute und versuche es dann noch einmal.', false),
			429,
		);
	});

	app.get('/healthz', (c) => c.text('ok'));

	app.get('/', (c) => c.html(startPage(page(c))));

	app.post('/neu', async (c) => {
		const body = await c.req.parseBody();
		const theme = getTheme(body.theme) ?? randomTheme();
		const pot = await store.createPot(theme.id);
		return c.redirect(`${adminPath(pot)}?neu`, 303);
	});

	// --- participants ---

	const cookieName = (pot: Pot) => `wichtel_${pot.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
	const findByToken = (participants: Participant[], token: string | undefined) =>
		token ? participants.find((p) => safeEqual(p.token, token)) : undefined;

	/** Remembers the participant in this browser, so the pot link leads to their personal page. */
	const rememberParticipant = (c: Context, pot: Pot, participant: Participant) =>
		setCookie(c, cookieName(pot), participant.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
			secure: origin(c).startsWith('https:'),
			maxAge: COOKIE_MAX_AGE,
		});

	app.get('/:pot', async (c) => {
		const pot = await store.getPot(c.req.param('pot'));
		if (!pot) return notFound(c);
		const participants = await store.listParticipants(pot.id);
		const me = findByToken(participants, getCookie(c, cookieName(pot)));
		if (me) return c.redirect(personalPath(pot, me), 303);
		if (pot.closedAt !== null) return c.html(resultPage(page(c, pot.theme), results(participants)));
		return c.html(potPage({ page: page(c, pot.theme), potPath: potPath(pot), participants }));
	});

	app.get('/:pot/ich/:token', async (c) => {
		const pot = await store.getPot(c.req.param('pot'));
		if (!pot) return notFound(c);
		const participants = await store.listParticipants(pot.id);
		const me = findByToken(participants, c.req.param('token'));
		if (!me) return notFound(c);
		rememberParticipant(c, pot, me);
		return c.html(
			personalPage({
				page: page(c, pot.theme),
				participant: me,
				personalPath: personalPath(pot, me),
				personalUrl: origin(c) + personalPath(pot, me),
				isNew: c.req.query('neu') !== undefined,
				result: pot.closedAt !== null ? results(participants) : undefined,
			}),
		);
	});

	app.post('/:pot/ich/:token/austragen', async (c) => {
		const pot = await store.getPot(c.req.param('pot'));
		if (!pot) return notFound(c);
		const me = findByToken(await store.listParticipants(pot.id), c.req.param('token'));
		if (!me) return notFound(c);
		// after the draw, removing someone would break the assignment
		if (pot.closedAt !== null) return c.redirect(personalPath(pot, me), 303);
		await store.removeParticipant(pot, me.id);
		deleteCookie(c, cookieName(pot), { path: '/' });
		return c.html(
			messagePage(page(c, pot.theme), 'Du bist ausgetragen', 'Dein Name wurde aus dem Wichteltopf gelöscht.', false),
		);
	});

	app.post('/:pot', async (c) => {
		const pot = await store.getPot(c.req.param('pot'));
		if (!pot) return notFound(c);
		if (pot.closedAt !== null) return c.redirect(potPath(pot), 303);

		const name = cleanName((await c.req.parseBody()).name);
		const showError = async (error: string) =>
			c.html(
				potPage({
					page: page(c, pot.theme),
					potPath: potPath(pot),
					participants: await store.listParticipants(pot.id),
					error,
				}),
				400,
			);
		if (name.length < 2) return showError('Bitte gib deinen Namen ein.');

		const result = await store.join(pot, name, getCookie(c, cookieName(pot)));
		if (!result.ok) {
			switch (result.error) {
				case 'closed':
					return c.redirect(potPath(pot), 303);
				case 'name-taken':
					return showError(
						`„${name}“ ist schon im Topf. Falls du das bist: Öffne deinen persönlichen Link, den du beim Eintragen bekommen hast. Sonst gib bitte deinen vollen Namen an, damit man euch unterscheiden kann.`,
					);
				case 'full':
					return showError('Der Wichteltopf ist leider voll.');
			}
		}

		rememberParticipant(c, pot, result.participant);
		// redirect, so reloading the page doesn't submit the form again
		return c.redirect(`${personalPath(pot, result.participant)}${result.isNew ? '?neu' : ''}`, 303);
	});

	// --- admin ---

	const admin = new Hono<{ Variables: { pot: Pot } }>();

	admin.use(async (c, next) => {
		const pot = await store.getPot(c.req.param('pot') ?? '');
		if (!pot || !store.isAdmin(pot, c.req.param('token') ?? '')) return notFound(c);
		c.set('pot', pot);
		await next();
	});

	const renderAdmin = async (c: Context, pot: Pot, error?: string) => {
		const [participants, exclusions] = await Promise.all([
			store.listParticipants(pot.id),
			store.listExclusions(pot.id),
		]);
		return c.html(
			adminPage({
				page: page(c, pot.theme),
				potUrl: origin(c) + potPath(pot),
				adminUrl: origin(c) + adminPath(pot),
				adminPath: adminPath(pot),
				isNew: c.req.query('neu') !== undefined,
				closed: pot.closedAt !== null,
				participants,
				exclusions,
				drawPossible: canDraw(participants, exclusions),
				error,
				result: pot.closedAt !== null ? results(participants) : undefined,
			}),
			error ? 400 : 200,
		);
	};

	admin.get('/', (c) => renderAdmin(c, c.var.pot));

	admin.post('/entfernen', async (c) => {
		const body = await c.req.parseBody();
		await store.removeParticipant(c.var.pot, Number(body.participant));
		return c.redirect(adminPath(c.var.pot), 303);
	});

	admin.post('/ausschluss', async (c) => {
		const body = await c.req.parseBody();
		await store.addExclusion(c.var.pot, Number(body.a), Number(body.b));
		return c.redirect(adminPath(c.var.pot), 303);
	});

	admin.post('/ausschluss-entfernen', async (c) => {
		const body = await c.req.parseBody();
		await store.removeExclusion(c.var.pot, Number(body.a), Number(body.b));
		return c.redirect(adminPath(c.var.pot), 303);
	});

	admin.post('/schliessen', async (c) => {
		const result = await store.closePot(c.var.pot.id);
		if (!result.ok && result.error !== 'closed') {
			const message =
				result.error === 'too-few'
					? 'Zum Auslosen braucht es mindestens drei Wichtel.'
					: 'Mit diesen Ausschlüssen ist keine Auslosung möglich.';
			return renderAdmin(c, c.var.pot, message);
		}
		return c.redirect(adminPath(c.var.pot), 303);
	});

	admin.post('/loeschen', async (c) => {
		await store.deletePot(c.var.pot.id);
		return c.html(
			messagePage(page(c), 'Topf gelöscht', 'Der Wichteltopf wurde mit allen Namen und Ergebnissen gelöscht.'),
		);
	});

	app.route('/:pot/admin/:token', admin);

	app.notFound(notFound);
	app.onError((error, c) => {
		// intended HTTP errors (e.g. 403 from the CSRF check) keep their response
		if (error instanceof HTTPException) return error.getResponse();
		console.error(error);
		return c.html(
			messagePage(page(c), 'Da ist etwas schiefgelaufen', 'Bitte versuche es in ein paar Minuten noch einmal.', false),
			500,
		);
	});

	return app;
}

function results(participants: Participant[]): ResultRow[] {
	const nameOf = new Map(participants.map((p) => [p.id, p.name]));
	return participants
		.map((p) => ({ codeName: p.codeName, receiver: nameOf.get(p.receiverId ?? -1) ?? '?' }))
		.sort((a, b) => a.codeName.localeCompare(b.codeName, 'de'));
}

function potPath(pot: Pot): string {
	return `/${pot.id}`;
}

function personalPath(pot: Pot, participant: Participant): string {
	return `/${pot.id}/ich/${participant.token}`;
}

function adminPath(pot: Pot): string {
	return `/${pot.id}/admin/${pot.adminToken}`;
}
