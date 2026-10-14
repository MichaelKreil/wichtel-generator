// Mobile usability check: renders every page in Chrome at phone widths and fails on
// horizontal scrolling, inputs that make iOS zoom (< 16px) and tap targets smaller than 44px.
// Usage: npm run test:mobile   (set CHROME to the browser binary if it isn't found)
import type { Demo } from './demo.ts';
import { createDemoPot, startBrowser, startServer } from './lib/harness.ts';

const WIDTHS = [320, 390];

// long names are the hardest case for narrow layouts
const LONG_NAMES: Demo = {
	theme: 'snowman',
	codeNames: 'schauspiel',
	participants: ['Anna-Katharina Müller-Lüdenscheidt', 'Ben Schmidt', 'Carla Weiß', 'Maximilian von Hohenzollern'],
	exclusions: [['Anna-Katharina Müller-Lüdenscheidt', 'Ben Schmidt']],
};

const server = await startServer();
const open = await createDemoPot(server, LONG_NAMES);
const closed = await createDemoPot(server, LONG_NAMES);
await closed.close();

const pages: Record<string, string> = {
	start: '/',
	pot: open.potPath,
	personal: open.personalPaths[0] as string,
	admin: open.adminPath,
	result: closed.potPath,
	'personal result': closed.personalPaths[0] as string,
	'admin result': closed.adminPath,
	'not found': '/does-not-exist',
	privacy: '/datenschutz',
};

// runs in the page; returns a list of problems
const audit = `(() => {
	const problems = [];
	if (document.documentElement.scrollWidth > innerWidth)
		problems.push('scrolls horizontally: ' + document.documentElement.scrollWidth + 'px content in ' + innerWidth + 'px');
	const describe = (el) => el.tagName.toLowerCase() + ' "' + (el.textContent || el.value || '').trim().slice(0, 30) + '"';
	for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=radio]), select, textarea')) {
		const size = parseFloat(getComputedStyle(el).fontSize);
		if (size < 16) problems.push(describe(el) + ': font ' + size + 'px makes iOS zoom in');
	}
	// buttons, fields and the design thumbnails; links inside text are exempt
	for (const el of document.querySelectorAll('button, .button, input:not([type=hidden]):not([type=radio]), select, .themes label, .lists label')) {
		const box = el.getBoundingClientRect();
		if (!box.width || getComputedStyle(el).visibility === 'hidden') continue;
		if (box.height < 44 || box.width < 44) problems.push(describe(el) + ': tap target ' + Math.round(box.width) + 'x' + Math.round(box.height) + 'px');
	}
	return problems;
})()`;

const browser = await startBrowser();
let failures = 0;
for (const width of WIDTHS) {
	await browser.setViewport(width, 800);
	for (const [name, path] of Object.entries(pages)) {
		await browser.open(server.base + path);
		const problems = [...new Set(await browser.evaluate<string[]>(audit))];
		failures += problems.length;
		console.log(`${problems.length ? '✖' : '✔'} ${width}px ${name}`);
		for (const problem of problems) console.log(`    ${problem}`);
	}
}

console.log(failures ? `\n${failures} problem(s) found` : '\nall pages are fine on phones');
process.exit(failures ? 1 : 0);
