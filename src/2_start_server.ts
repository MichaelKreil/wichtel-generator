import express, { Response } from 'express';
import { resolve } from '@std/path';
import bodyParser from 'body-parser';
import { Pot } from './lib/pot.ts';
import { Theme, themes } from './lib/themes.ts';
import { Shelf } from './lib/shelf.ts';
import templates from './templates/templates.ts';
import { Template } from 'ventojs/core/environment.js';

const port = Deno.env.get('PORT') ?? 8080;
const basename = Deno.env.get('BASEURL') ?? 'https://wichteln.michael-kreil.de/';
const codeChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const __dirname = new URL('./', import.meta.url).pathname

const names = loadNames('singers.txt');
const databasePath = resolve(__dirname, '../database');



const shelf = new Shelf(databasePath);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/assets', express.static(resolve(__dirname, 'web')));

interface Config {
	[key: string]: unknown;
	id: string;
}

async function respond(res: Response, template: Template, obj: Pot | Config) {
	obj.theme = pot?.theme ?? themes[Math.floor(Math.random() * themes.length)].name;
	obj.adminCode = pot?.adminCode;
	obj.id = pot?.id;
	obj.personList = pot?.getPersonList() ?? [];
	if (obj.personList) {
		if (obj.personList.length <= 1) {
			obj.personList = obj.personList[0];
			obj.personSingle = true;
		} else {
			obj.personList = obj.personList.slice(0, -1).join(', ') + ' und ' + obj.personList.pop();
			obj.personSingle = false;
		}
	}
	obj.themes = themes;
	obj.basename = basename;
	res.end(await template({ obj }));
}

app.get('/', (req, res) => respond(res, templates.start, { id: shelf.generateRandomId() }));

app.post('/:id/feuer', async (req, res) => {
	const pot = await shelf.newPot({
		id: req.params.id,
		theme: req.body.theme,
		adminCode: generateCode()
	});

	if (pot) {
		if (pot.closed) return respond(res, { errorZu: true }, pot);
		if (pot.adminCode) return respond(res, { errorBenutzung: true }, pot);
	}

	respond(res, templates.init, pot)
});

/*
app.get('/:id', async (req, res) => {
	let id = secureID(req.params.id);
	let topf = await getTopf(id);

	if (!topf) return respond(res, { errorNotFound: true });
	if (topf.closed) return respond(res, { ergebnis: true, liste: generateList(topf) }, topf);

	respond(res, { topf: true, cookie: generateCode() }, topf);
});

app.post('/:id/danke', async (req, res) => {
	let id = secureID(req.params.id);
	let topf = await getTopf(id);

	if (!topf) return respond(res, { errorNotFound: true });
	if (topf.closed) return respond(res, { ergebnis: true, liste: generateList(topf) }, topf);

	let name = ("" + req.body.name).trim();
	let cookie = req.body.cookie;
	let codeName;
	let person = topf.persons.find(p => (p.cookie === cookie) && (p.name === name));
	if (person) {
		codeName = person.codeName
	} else {
		do { codeName = generateName() }
		while (topf.persons.some(e => e.codeName === codeName))
		topf.persons.push({ name, codeName, cookie });
	}

	await setTopf(id, topf);

	respond(res, { danke: true, codeName }, topf);
});

app.get('/:id/deckelzu/:adminCode', async (req, res) => {
	let id = secureID(req.params.id);
	let adminCode = req.params.adminCode;
	let topf = await getTopf(id);

	if (!topf) return respond(res, { errorNotFound: true });
	if (topf.adminCode !== adminCode) return respond(res, { errorNichtDeiner: true }, topf);
	if (topf.closed) return respond(res, { ergebnis: true, liste: generateList(topf) }, topf);

	respond(res, { schliessen: true }, topf)
});

app.post('/:id/deckelzu/:adminCode', async (req, res) => {
	let id = secureID(req.params.id);
	let adminCode = req.params.adminCode;
	let topf = await getTopf(id);

	if (!topf) return respond(res, { errorNotFound: true });
	if (topf.adminCode !== adminCode) return respond(res, { errorNichtDeiner: true }, topf);

	topf.closed = true;
	topf.persons.forEach(e => e.order = Math.random());
	topf.persons.sort((a, b) => a.order - b.order);
	await setTopf(id, topf);

	return respond(res, { ergebnis: true, liste: generateList(topf) }, topf);
});
*/
const server = app.listen(port, () => {
	console.log('listening at port ' + port)
})

process.on('SIGTERM', () => {
	console.log('SIGTERM signal received: closing HTTP server')
	server.close(() => console.log('HTTP server closed'))
})



function generateCode() {
	let code = [];
	for (let i = 0; i < 12; i++) code.push(codeChars[Math.floor(Math.random() * codeChars.length)]);
	return code.join('');
}

function generateName() {
	let i = Math.floor(Math.random() * names.length);
	return names[i];
}

function generateList(topf: Topf) {
	const list = [];
	const n = topf.persons.length;
	for (let i = 0; i < n; i++) {
		list.push({
			name: topf.persons[i].name,
			codeName: topf.persons[(i + 1) % n].codeName,
		})
	}
	//console.log(topf.persons);
	//console.log(list);
	list.sort((a, b) => a.codeName < b.codeName ? -1 : 1);
	return list;
}

function loadNames(filename: string): string[] {
	const names = Deno.readTextFileSync(resolve(__dirname, 'data', filename))
		.split('\n')
		.filter(l => l.length > 3)
		.map(l => l.replace(/_/g, ' '));
	console.log(names.length + ' names found: ' + names.join(', '));
	return names;
}
