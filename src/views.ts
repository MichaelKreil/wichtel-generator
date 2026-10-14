import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import { type Exclusion, MAX_NAME_LENGTH, MIN_PARTICIPANTS, type Participant } from './store.ts';
import { THEMES } from './themes.ts';

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

export interface ResultRow {
	codeName: string;
	receiver: string;
}

/** What every page needs: the background theme, and the public origin for absolute URLs. */
export interface Page {
	theme: string;
	origin: string;
}

interface LayoutOptions {
	/** Shown in link previews (WhatsApp, Signal, …) and search results. */
	description?: string;
	/** Only the start page should appear in search engines. */
	index?: boolean;
}

const DEFAULT_DESCRIPTION = 'Kostenloser Online-Wichteltopf: Namen eintragen, geheim auslosen, fertig.';

function layout(page: Page, title: string, content: Html, options: LayoutOptions = {}): Html {
	const description = options.description ?? DEFAULT_DESCRIPTION;
	return html`<!doctype html>
<html lang="de">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="referrer" content="no-referrer">
	<title>${title} · Wichtel-Generator</title>
	<meta name="description" content="${description}">
	${options.index ? '' : html`<meta name="robots" content="noindex">`}
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="Wichtel-Generator">
	<meta property="og:title" content="${title}">
	<meta property="og:description" content="${description}">
	<meta property="og:image" content="${page.origin}/static/og.jpg">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta name="twitter:card" content="summary_large_image">
	<link rel="icon" href="/static/icon.svg" type="image/svg+xml">
	<link rel="apple-touch-icon" href="/apple-touch-icon.png">
	<meta name="theme-color" content="#a4161a">
	<link rel="stylesheet" href="/static/style.css">
	<link rel="stylesheet" href="/static/themes.css">
	<script src="/static/app.js" defer></script>
</head>
<body data-theme="${page.theme}">
	<main>${content}</main>
	<canvas id="snow" aria-hidden="true"></canvas>
</body>
</html>`;
}

/** "Anna", "Anna und Ben", "Anna, Ben und Carla" */
function joinNames(names: string[]): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`;
}

/** A link with copy button, and a share button (where the device supports it) if `shareText` is given. */
function copyField(label: string, url: string, shareText?: string): Html {
	return html`<div class="copy">
		<label>${label}<input type="text" readonly value="${url}"></label>
		<div class="copy-actions">
			${shareText ? html`<button type="button" data-share="${shareText}" hidden>Teilen</button>` : ''}
			<button type="button" class="secondary" data-copy>Kopieren</button>
		</div>
	</div>`;
}

export function startPage(page: Page): Html {
	return layout(
		page,
		'Wichteltopf anlegen',
		html`<h1>Wichtel-Generator</h1>
		<p>Hier kannst du kostenlos einen Online-Wichteltopf einrichten.</p>

		<h2>Wie funktioniert es?</h2>
		<p>Beim Wichteln, auch bekannt als Julklapp, Secret Santa oder &bdquo;Engerl und Bengerl&ldquo;, beschenken sich Freund*innen und Kolleg*innen gegenseitig.</p>
		<ol>
			<li>Du legst einen Wichteltopf an und bekommst zwei Links.</li>
			<li>Den <b>Teilnahme-Link</b> schickst du an alle. Wer seinen Namen in den Topf wirft, bekommt einen geheimen Codenamen, den man sich merken muss und niemandem verraten darf.</li>
			<li>Wenn alle dabei sind, schließt du mit dem <b>Admin-Link</b> den Topf. Jetzt wird ausgelost, und jeder Codename bekommt eine Person zugewiesen, die er beschenkt.</li>
		</ol>

		<form method="post" action="/neu">
			<fieldset class="themes">
				<legend><h2>Wähle ein Design</h2></legend>
				${THEMES.map(
					(t) => html`<label>
						<input type="radio" name="theme" value="${t.id}" ${t.id === page.theme ? 'checked' : ''}>
						<img src="/static/img/thumb/${t.id}.webp" alt="Design ${t.id}" width="384" height="256" loading="lazy">
					</label>`,
				)}
			</fieldset>
			<button type="submit" class="sticky">Wichteltopf anlegen</button>
		</form>`,
		{ index: true },
	);
}

export interface AdminPageProps {
	page: Page;
	potUrl: string;
	adminUrl: string;
	adminPath: string;
	isNew: boolean;
	closed: boolean;
	participants: Participant[];
	exclusions: Exclusion[];
	drawPossible: boolean;
	error?: string;
	result?: ResultRow[];
}

export function adminPage(props: AdminPageProps): Html {
	const { participants, exclusions, adminPath } = props;
	const nameOf = new Map(participants.map((p) => [p.id, p.name]));
	const options = (selected: number) =>
		participants.map((p, i) => html`<option value="${p.id}" ${i === selected ? 'selected' : ''}>${p.name}</option>`);

	return layout(
		props.page,
		'Admin',
		html`<h1>${props.isNew ? 'Wichteltopf angelegt 🎉' : 'Dein Wichteltopf'}</h1>
		${props.error ? html`<p class="error" role="alert">${props.error}</p>` : ''}

		<section>
			<p>Bitte speichere dir beide Links gut ab.</p>
			${copyField('Teilnahme-Link: an alle Wichtel verschicken', props.potUrl, 'Wir wichteln! Wirf hier deinen Namen in den Wichteltopf:')}
			${copyField('Admin-Link: geheim! Nur damit kannst du den Topf verwalten und schließen.', props.adminUrl)}
		</section>

		${
			props.closed
				? html`<h2>Die Ziehung ist abgeschlossen</h2>${resultList(props.result ?? [])}`
				: html`
		<section>
			<h2>Im Topf (${participants.length})</h2>
			${
				participants.length === 0
					? html`<p>Noch niemand. Verschicke den Teilnahme-Link!</p>`
					: html`<ul class="list">
				${participants.map(
					(p) => html`<li>
						<span>${p.name}</span>
						<form method="post" action="${adminPath}/entfernen" data-confirm="${p.name} wirklich aus dem Topf entfernen?">
							<input type="hidden" name="participant" value="${p.id}">
							<button type="submit" class="small secondary">Entfernen</button>
						</form>
					</li>`,
				)}
			</ul>`
			}
		</section>

		<section>
			<h2>Ausschlüsse</h2>
			<p>Wer soll sich nicht gegenseitig ziehen, z.&nbsp;B. Paare?</p>
			${
				exclusions.length > 0
					? html`<ul class="list">
				${exclusions.map(
					(e) => html`<li>
						<span>${nameOf.get(e.a)} ⟷ ${nameOf.get(e.b)}</span>
						<form method="post" action="${adminPath}/ausschluss-entfernen">
							<input type="hidden" name="a" value="${e.a}">
							<input type="hidden" name="b" value="${e.b}">
							<button type="submit" class="small secondary">Entfernen</button>
						</form>
					</li>`,
				)}
			</ul>`
					: ''
			}
			${
				participants.length >= 2
					? html`<form method="post" action="${adminPath}/ausschluss" class="pair">
				<select name="a" required aria-label="Erste Person">${options(0)}</select>
				<span>⟷</span>
				<select name="b" required aria-label="Zweite Person">${options(1)}</select>
				<button type="submit" class="secondary">Hinzufügen</button>
			</form>`
					: ''
			}
		</section>

		<section>
			<h2>Topf schließen und auslosen</h2>
			${
				participants.length < MIN_PARTICIPANTS
					? html`<p>Zum Auslosen braucht es mindestens ${MIN_PARTICIPANTS} Wichtel.</p>`
					: !props.drawPossible
						? html`<p class="error">Mit diesen Ausschlüssen ist keine Auslosung möglich. Bitte entferne einen Ausschluss.</p>`
						: html`<p>Danach können keine weiteren Wichtel mehr mitmachen.</p>
			<form method="post" action="${adminPath}/schliessen" data-confirm="Topf jetzt wirklich schließen und auslosen?">
				<button type="submit">Topf schließen und auslosen</button>
			</form>`
			}
		</section>`
		}`,
	);
}

export interface PotPageProps {
	page: Page;
	potPath: string;
	participants: Participant[];
	error?: string;
}

export function potPage({ page, potPath, participants, error }: PotPageProps): Html {
	const names = participants.map((p) => p.name);
	return layout(
		page,
		'Mach mit beim Wichteln!',
		html`<h1>Wichteltopf</h1>
		${
			names.length === 0
				? html`<p>Sei die/der Erste beim Wichteln!</p>`
				: html`<p>${joinNames(names)} ${names.length === 1 ? 'macht' : 'machen'} bereits mit.</p>`
		}
		<form method="post" action="${potPath}">
			${error ? html`<p class="error" role="alert">${error}</p>` : ''}
			<h2><label for="name">Dein Vor- und Nachname</label></h2>
			<input type="text" id="name" name="name" maxlength="${MAX_NAME_LENGTH}" autocomplete="name" required>
			<button type="submit">Mitmachen</button>
		</form>`,
		{ description: 'Wirf deinen Namen in den Wichteltopf und bekomme deinen geheimen Codenamen.' },
	);
}

export interface PersonalPageProps {
	page: Page;
	participant: Participant;
	personalUrl: string;
	isNew: boolean;
	/** Set once the pot is closed. */
	result?: ResultRow[];
}

/** A participant's own page, reachable via their personal link from any device. */
export function personalPage({ page, participant, personalUrl, isNew, result }: PersonalPageProps): Html {
	if (result) {
		const mine = result.find((r) => r.codeName === participant.codeName);
		return layout(
			page,
			'Ergebnis',
			html`<h1>Die Ziehung ist abgeschlossen</h1>
			<p>Hallo ${participant.name}, dein geheimer Codename ist <b>${participant.codeName}</b>.</p>
			${mine ? html`<p class="codename">Du beschenkst ${mine.receiver}</p>` : ''}
			<h2>Alle Ergebnisse</h2>
			${resultList(result, participant.codeName)}`,
		);
	}
	return layout(
		page,
		'Du bist dabei',
		html`<h1>${isNew ? 'Schön, dass du mitmachst!' : 'Du bist dabei'}</h1>
		<p>Du bist als <b>${participant.name}</b> im Topf. Dein geheimer Codename lautet:</p>
		<p class="codename">${participant.codeName}</p>
		<p>Verrate ihn niemandem, denn er ist geheim!</p>
		<h2>Dein persönlicher Link</h2>
		<p>Speichere dir diesen Link. Damit siehst du jederzeit deinen Codenamen und nach der Auslosung, wen du beschenkst, auch auf einem anderen Gerät.</p>
		${copyField('Persönlicher Link: nur für dich', personalUrl, 'Mein persönlicher Wichtel-Link:')}`,
	);
}

function resultList(rows: ResultRow[], myCodeName?: string): Html {
	return html`<ul class="result">
		${rows.map(
			(r) =>
				html`<li ${r.codeName === myCodeName ? html`class="me"` : ''}>»<b>${r.codeName}</b>« beschenkt <b>${r.receiver}</b></li>`,
		)}
	</ul>`;
}

export function resultPage(page: Page, rows: ResultRow[]): Html {
	return layout(
		page,
		'Ergebnis',
		html`<h1>Die Ziehung ist abgeschlossen</h1>
		<p>Suche deinen geheimen Codenamen in der Liste, oder öffne deinen persönlichen Link.</p>
		${resultList(rows)}`,
	);
}

export function errorPage(page: Page, title: string, text: string, offerNewPot = true): Html {
	return layout(
		page,
		title,
		html`<h1>${title}</h1>
		<p>${text}</p>
		${offerNewPot ? html`<p>Möchtest du vielleicht einen <a href="/">neuen Wichteltopf anlegen</a>?</p>` : ''}`,
	);
}
