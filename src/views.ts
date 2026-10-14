import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import { type Exclusion, MAX_NAME_LENGTH, MIN_PARTICIPANTS, type Participant } from './store.ts';
import { THEMES } from './themes.ts';

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

export interface ResultRow {
	codeName: string;
	receiver: string;
}

function layout(theme: string, title: string, content: Html): Html {
	return html`<!doctype html>
<html lang="de">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="referrer" content="no-referrer">
	<title>${title} · Wichtel-Generator</title>
	<link rel="icon" href="data:,">
	<link rel="stylesheet" href="/static/style.css">
	<link rel="stylesheet" href="/static/themes.css">
	<script src="/static/app.js" defer></script>
</head>
<body data-theme="${theme}">
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

function copyField(label: string, url: string): Html {
	return html`<div class="copy">
		<label>${label}<input type="text" readonly value="${url}"></label>
		<button type="button" class="secondary" data-copy>Kopieren</button>
	</div>`;
}

export function startPage(theme: string): Html {
	return layout(
		theme,
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
						<input type="radio" name="theme" value="${t.id}" ${t.id === theme ? 'checked' : ''}>
						<img src="/static/img/thumb/${t.id}.webp" alt="Design ${t.id}" width="384" height="256" loading="lazy">
					</label>`,
				)}
			</fieldset>
			<button type="submit">Wichteltopf anlegen</button>
		</form>`,
	);
}

export interface AdminPageProps {
	theme: string;
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
		props.theme,
		'Admin',
		html`<h1>${props.isNew ? 'Wichteltopf angelegt 🎉' : 'Dein Wichteltopf'}</h1>
		${props.error ? html`<p class="error" role="alert">${props.error}</p>` : ''}

		<section>
			<p>Bitte speichere dir beide Links gut ab.</p>
			${copyField('Teilnahme-Link: an alle Wichtel verschicken', props.potUrl)}
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
					? html`<form method="post" action="${adminPath}/ausschluss" class="row">
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
	theme: string;
	potPath: string;
	participants: Participant[];
	me?: Participant;
	error?: string;
}

export function potPage({ theme, potPath, participants, me, error }: PotPageProps): Html {
	const names = participants.map((p) => p.name);
	return layout(
		theme,
		'Wichteltopf',
		html`<h1>Wichteltopf</h1>
		${
			names.length === 0
				? html`<p>Sei die/der Erste beim Wichteln!</p>`
				: html`<p>${joinNames(names)} ${names.length === 1 ? 'macht' : 'machen'} bereits mit.</p>`
		}
		${
			me
				? html`<p>Du bist als <b>${me.name}</b> dabei. Dein geheimer Codename lautet:</p>
			<p class="codename">${me.codeName}</p>`
				: html`<form method="post" action="${potPath}">
			${error ? html`<p class="error" role="alert">${error}</p>` : ''}
			<label for="name"><h2>Dein Vor- und Nachname</h2></label>
			<input type="text" id="name" name="name" maxlength="${MAX_NAME_LENGTH}" autocomplete="name" required autofocus>
			<button type="submit">Mitmachen</button>
		</form>`
		}`,
	);
}

export function joinedPage(theme: string, participant: Participant): Html {
	return layout(
		theme,
		'Du bist dabei',
		html`<h1>Schön, dass du mitmachst!</h1>
		<p>Dein geheimer Codename lautet:</p>
		<p class="codename">${participant.codeName}</p>
		<p>Merk ihn dir gut, am besten schreibst du ihn irgendwo auf. Aber verrate ihn niemandem, denn er ist geheim!</p>
		<p>Sobald der Topf geschlossen ist, findest du unter dem Teilnahme-Link heraus, wen du beschenkst.</p>`,
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

export function resultPage(theme: string, rows: ResultRow[], me?: Participant): Html {
	const mine = me && rows.find((r) => r.codeName === me.codeName);
	return layout(
		theme,
		'Ergebnis',
		html`<h1>Die Ziehung ist abgeschlossen</h1>
		${mine ? html`<p class="codename">Du beschenkst ${mine.receiver}</p>` : ''}
		<p>Suche deinen geheimen Codenamen in der Liste:</p>
		${resultList(rows, me?.codeName)}`,
	);
}

export function errorPage(theme: string, title: string, text: string): Html {
	return layout(
		theme,
		title,
		html`<h1>${title}</h1>
		<p>${text}</p>
		<p>Möchtest du vielleicht einen <a href="/">neuen Wichteltopf anlegen</a>?</p>`,
	);
}
