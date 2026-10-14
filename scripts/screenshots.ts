// Screenshots of all pages on a phone, using the demo pot from scripts/demo.ts.
// Usage: npm run screenshots [-- output-dir]   (default: screenshots/; set CHROME if Chrome isn't found)
// For each page: NN-name.png (the first screen, as seen on the phone) and NN-name-full.png (the whole page).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DEMO } from './demo.ts';
import { createDemoPot, startBrowser, startServer } from './lib/harness.ts';

// iPhone 15
const PHONE = { width: 393, height: 852, deviceScaleFactor: 3 };

const outDir = resolve(process.argv[2] ?? 'screenshots');
mkdirSync(outDir, { recursive: true });

const server = await startServer({ publicUrl: 'https://wichteltopf.de' });
const pot = await createDemoPot(server, DEMO);
const browser = await startBrowser();
await browser.reduceMotion(); // no snowflakes, so the screenshots are reproducible
await browser.setViewport(PHONE.width, PHONE.height, PHONE.deviceScaleFactor);

let counter = 0;
async function shoot(name: string, path: string): Promise<void> {
	const file = `${String(++counter).padStart(2, '0')}-${name}`;
	await browser.open(server.base + path);
	writeFileSync(join(outDir, `${file}.png`), await browser.screenshot());
	writeFileSync(join(outDir, `${file}-full.png`), await browser.fullPageScreenshot());
	console.log(`✔ ${file}`);
}

const [firstPerson] = pot.personalPaths as [string];

// before the draw
await shoot('start', '/');
await shoot('pot', pot.potPath);
await shoot('joined', `${firstPerson}?neu`);
await shoot('admin', pot.adminPath);

// after the draw
await pot.close();
await shoot('result', pot.potPath);
await shoot('personal-result', firstPerson);
await shoot('admin-result', pot.adminPath);

// other pages
await shoot('privacy', '/datenschutz');
await shoot('not-found', '/does-not-exist');

console.log(`\n${counter * 2} screenshots in ${outDir}`);
process.exit(0);
