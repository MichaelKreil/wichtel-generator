import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import { ASSET_VERSION } from './asset-version.ts';
import { CODE_NAME_LISTS, DEFAULT_LIST_ID } from './codenames.ts';
import { OPERATOR } from './operator.ts';
import { type Exclusion, MAX_NAME_LENGTH, MIN_PARTICIPANTS, type Participant } from './store.ts';
import { THEMES, themeOrDefault } from './themes.ts';

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
	<title>${title} · Wichteltopf</title>
	<meta name="description" content="${description}">
	${options.index ? '' : html`<meta name="robots" content="noindex">`}
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="Wichteltopf">
	<meta property="og:title" content="${title}">
	<meta property="og:description" content="${description}">
	<meta property="og:image" content="${page.origin}/static/og.jpg">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta name="twitter:card" content="summary_large_image">
	<link rel="icon" href="/static/icon.svg" type="image/svg+xml">
	<link rel="apple-touch-icon" href="/apple-touch-icon.png">
	<meta name="theme-color" content="${themeOrDefault(page.theme).color}">
	<link rel="preload" href="/static/fonts/young-serif-400.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="preload" href="/static/fonts/caveat-600.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="stylesheet" href="/static/style.css?v=${ASSET_VERSION}">
	<link rel="stylesheet" href="/static/themes.css?v=${ASSET_VERSION}">
	<script src="/static/app.js?v=${ASSET_VERSION}" defer></script>
</head>
<body data-theme="${page.theme}">
	<main>
		${content}
		<footer><a href="/datenschutz">Datenschutz</a></footer>
	</main>
</body>
</html>`;
}

/** "Anna", "Anna und Ben", "Anna, Ben und Carla" */
function joinNames(names: string[]): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`;
}

/**
 * A paper gift tag with a punched hole and string, written by hand: the signature element.
 * Each line is a label ("Von:", "Für:") and a value.
 */
function giftTag(lines: [string, string][], size: 'big' | 'small' = 'big', mine = false): Html {
	return html`<div class="tag tag-${size}${mine ? ' tag-mine' : ''}">
		<div class="tag-paper">
			${lines.map(([label, value]) => html`<span class="tag-line"><span class="tag-label">${label}</span> <span class="tag-value">${value}</span></span>`)}
		</div>
	</div>`;
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
		html`<div class="hero">
			<h1>Wichteltopf</h1>
			<p class="lead">Alle werfen ihren Namen in den Topf. Dann wird geheim ausgelost, wer wen beschenkt.</p>
			${giftTag([
				['Von:', '???'],
				['Für:', 'dich'],
			])}
		</div>

		<h2>So geht’s</h2>
		<ol class="steps">
			<li>Lege einen Topf an. Du bekommst einen <b>Teilnahme-Link</b> für alle und einen geheimen <b>Admin-Link</b> für dich.</li>
			<li>Alle tragen sich ein und bekommen einen geheimen Codenamen.</li>
			<li>Wenn alle dabei sind, schließt du den Topf. Jeder Codename bekommt eine Person, die er beschenkt.</li>
		</ol>
		<p class="aside">Auch bekannt als Julklapp, Secret Santa oder „Engerl und Bengerl“. Kostenlos und ohne Anmeldung.</p>

		<form method="post" action="/neu">
			<fieldset class="lists">
				<legend><h2>Wähle die Codenamen</h2></legend>
				${CODE_NAME_LISTS.map(
					(list) => html`<label>
						<input type="radio" name="codenames" value="${list.id}" ${list.id === DEFAULT_LIST_ID ? 'checked' : ''}>
						<span>
							<b>${list.label}</b> <span class="capacity">bis zu ${list.names.length} Personen</span><br>
							<small>z.&nbsp;B. ${list.names.slice(0, 3).join(', ')}</small>
						</span>
					</label>`,
				)}
			</fieldset>

			<fieldset class="themes">
				<legend><h2>Wähle ein Hintergrundbild</h2></legend>
				${THEMES.map(
					(t) => html`<label>
						<input type="radio" name="theme" value="${t.id}" ${t.id === page.theme ? 'checked' : ''}>
						<img class="swatch" src="/static/img/thumb/${t.id}.webp" alt="${t.label}" width="384" height="256" loading="lazy">
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
	/** One per code name in the pot's list */
	maxParticipants: number;
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

/** mailto: link that opens the organiser's mail app with both links, so they can't get lost. */
function linksMail(potUrl: string, adminUrl: string): string {
	const subject = 'Mein Wichteltopf';
	const body = `Teilnahme-Link (an alle Wichtel verschicken):\n${potUrl}\n\nAdmin-Link (geheim, nur für mich):\n${adminUrl}\n`;
	return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
			<a class="button secondary" href="${linksMail(props.potUrl, props.adminUrl)}">Links an mich mailen</a>
		</section>

		${
			props.closed
				? html`<h2>Die Ziehung ist abgeschlossen</h2>${resultList(props.result ?? [])}`
				: html`
		<section>
			<h2>Im Topf (${participants.length} von max. ${props.maxParticipants})</h2>
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
		}

		<section>
			<h2>Topf löschen</h2>
			<p>Löscht alle Namen${props.closed ? ' und das Ergebnis' : ''} endgültig. Ungenutzte Töpfe werden nach 90 Tagen automatisch gelöscht.</p>
			<form method="post" action="${adminPath}/loeschen" data-confirm="Den Wichteltopf mit allen Namen endgültig löschen?">
				<button type="submit" class="secondary">Topf löschen</button>
			</form>
		</section>`,
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
	personalPath: string;
	personalUrl: string;
	isNew: boolean;
	/** Set once the pot is closed. */
	result?: ResultRow[];
}

/** A participant's own page, reachable via their personal link from any device. */
export function personalPage({ page, participant, personalPath, personalUrl, isNew, result }: PersonalPageProps): Html {
	if (result) {
		const mine = result.find((r) => r.codeName === participant.codeName);
		return layout(
			page,
			'Ergebnis',
			html`<h1>Die Ziehung ist abgeschlossen</h1>
			<p>Hallo ${participant.name}! Du beschenkst:</p>
			${
				mine
					? giftTag([
							['Von:', participant.codeName],
							['Für:', mine.receiver],
						])
					: ''
			}
			<h2>Alle Ergebnisse</h2>
			${resultList(result, participant.codeName)}`,
		);
	}
	return layout(
		page,
		'Du bist dabei',
		html`<h1>${isNew ? 'Schön, dass du mitmachst!' : 'Du bist dabei'}</h1>
		<p>Du bist als <b>${participant.name}</b> im Topf. Dein geheimer Codename lautet:</p>
		${giftTag([['Von:', participant.codeName]])}
		<p>Verrate ihn niemandem! Nach der Auslosung steht hier, für wen dein Geschenk ist.</p>
		<h2>Dein persönlicher Link</h2>
		<p>Speichere dir diesen Link. Damit siehst du jederzeit deinen Codenamen und nach der Auslosung, wen du beschenkst, auch auf einem anderen Gerät.</p>
		${copyField('Persönlicher Link: nur für dich', personalUrl, 'Mein persönlicher Wichtel-Link:')}

		<h2>Doch nicht dabei?</h2>
		<p>Bis zur Auslosung kannst du dich wieder austragen. Dein Name wird dann gelöscht.</p>
		<form method="post" action="${personalPath}/austragen" data-confirm="Wirklich aus dem Wichteltopf austragen?">
			<button type="submit" class="secondary">Mich austragen</button>
		</form>`,
	);
}

/** All assignments as small gift tags; the viewer's own one is highlighted. */
function resultList(rows: ResultRow[], myCodeName?: string): Html {
	return html`<ul class="result">
		${rows.map(
			(r) =>
				html`<li>${giftTag(
					[
						['Von:', r.codeName],
						['Für:', r.receiver],
					],
					'small',
					r.codeName === myCodeName,
				)}</li>`,
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

export function messagePage(page: Page, title: string, text: string, offerNewPot = true): Html {
	return layout(
		page,
		title,
		html`<h1>${title}</h1>
		<p>${text}</p>
		${offerNewPot ? html`<p>Möchtest du vielleicht einen <a href="/">neuen Wichteltopf anlegen</a>?</p>` : ''}`,
	);
}

export function privacyPage(page: Page): Html {
	return layout(
		page,
		'Datenschutz',
		html`<h1>Datenschutzerklärung</h1>

		<h2>Verantwortlich</h2>
		<p>
			${OPERATOR.name}<br>
			${OPERATOR.address.map((line) => html`${line}<br>`)}
			E-Mail: <a href="mailto:${OPERATOR.email}">${OPERATOR.email}</a>
		</p>

		<h2>Welche Daten wir speichern</h2>
		<ul>
			<li><b>Wichteltopf:</b> das gewählte Design, Zeitpunkte von Erstellung und letzter Änderung sowie die geheimen Links.</li>
			<li><b>Teilnehmende:</b> der eingegebene Name, der zugeloste Codename und nach der Auslosung, wer wen beschenkt.</li>
			<li><b>Ausschlüsse:</b> welche Teilnehmenden sich nicht gegenseitig ziehen sollen, festgelegt von der Person, die den Topf verwaltet.</li>
		</ul>
		<p>Es gibt keine Benutzerkonten, kein Tracking, keine Analyse-Werkzeuge und keine Inhalte von anderen Anbietern.</p>

		<h2>Wer die Daten sieht</h2>
		<p>Wer den Teilnahme-Link hat, sieht die Namen aller Teilnehmenden und nach der Auslosung die Liste „Codename beschenkt Name“. Wer den Admin-Link hat, sieht zusätzlich die Ausschlüsse, aber nicht, wer welchen Codenamen hat. Den eigenen Codenamen sieht nur, wer den persönlichen Link hat.</p>

		<h2>Cookie</h2>
		<p>Nach dem Eintragen speichern wir ein Cookie mit deinem persönlichen Zugangsschlüssel, damit dich der Teilnahme-Link wiedererkennt. Es ist für diese Funktion technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG) und wird nach einem Jahr oder beim Austragen gelöscht.</p>

		<h2>IP-Adressen</h2>
		<p>Zum Schutz vor Missbrauch wird die IP-Adresse beim Absenden eines Formulars für eine Minute zur Begrenzung der Anfragen verwendet. Wir speichern keine Zugriffsprotokolle mit IP-Adressen.</p>

		<h2>Zweck und Rechtsgrundlage</h2>
		<p>Die Daten werden nur verarbeitet, um das Wichteln durchzuführen (Art. 6 Abs. 1 lit. b DSGVO), und zum Schutz des Dienstes vor Missbrauch (Art. 6 Abs. 1 lit. f DSGVO).</p>

		<h2>Hosting</h2>
		<p>Die Seite läuft bei Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA, als Auftragsverarbeiter. Die Datenbank liegt in der EU. Beim Ausliefern der Seite verarbeitet Cloudflare technisch bedingt auch IP-Adressen; für Übermittlungen in die USA stützt sich Cloudflare auf das EU-U.S. Data Privacy Framework und Standardvertragsklauseln.</p>

		<h2>Speicherdauer</h2>
		<p>Wichteltöpfe werden 90 Tage nach der letzten Änderung automatisch gelöscht. Die Person mit dem Admin-Link kann den Topf jederzeit vorher löschen. Teilnehmende können sich bis zur Auslosung über ihren persönlichen Link selbst austragen. Gelöschte Daten können noch bis zu 7 Tage in Sicherungskopien enthalten sein.</p>

		<h2>Deine Rechte</h2>
		<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, auf Widerspruch und auf Datenübertragbarkeit. Wende dich dafür an die oben genannte E-Mail-Adresse. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.</p>

		<p>Stand: Oktober 2026</p>`,
		{ index: true, description: 'Welche Daten der Wichteltopf speichert und wie lange.' },
	);
}
