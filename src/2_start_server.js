#!/usr/bin/env node

'use strict'

import { readFileSync } from 'node:fs';
import express from 'express';
import mustache from 'mustache';
import { resolve } from 'node:path';
import bodyParser from 'body-parser';
import audit from 'express-requests-logger'

const port = process.env.PORT ?? 8080;
const devMode = true;
const basename = process.env.BASEURL ?? 'https://wichtel-generator.michael-kreil.de/'
const codeChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const __dirname = new URL('./', import.meta.url).pathname

const db = new Map();
const names = loadNames('singer.txt')
const themes = JSON.parse(readFileSync(resolve(__dirname, 'data/themes.json'), 'utf8'));

const render = (() => {
	if (devMode) {
		return obj => mustache.render(readFileSync(resolve(__dirname, 'templates/main.html.mustache'), 'utf8'), obj);
	} else {
		const template = Mustache.parse(readFileSync(resolve(__dirname, 'templates/main.html.mustache'), 'utf8'));
		return obj => mustache.render(template, obj);
	}
})()

const app = express();
app.use(audit())
app.use(bodyParser.urlencoded({ extended: true }));

async function getTopf(id) {
	try {
		return db.get(id);
	} catch (e) {
		return false;
	}
}

async function setTopf(id, topf) {
	db.set(id, topf);
}

app.use('/assets', express.static(resolve(__dirname, 'web')));

function respond(res, obj, topf) {
	obj.theme = (topf && topf.theme) || themes[Math.floor(Math.random() * themes.length)].name;
	obj.adminCode = topf && topf.adminCode;
	obj.id = topf && topf.id;
	obj.personList = topf && topf.persons && topf.persons.map(p => p.name).sort();
	if (obj.personList) {
		if (obj.personList.length <= 1) {
			obj.personList = obj.personList[0];
			obj.personSingle = true;
		} else {
			obj.personList = obj.personList.slice(0, -1).join(', ') + ' und ' + obj.personList.pop();
			obj.personSingle = false;
		}
	}
	//console.log(obj);
	obj.themes = themes;
	obj.basename = basename;
	res.end(render(obj));
}

app.get('/', (req, res) => respond(res, { start: { id: generateWichtel() } }));

app.post('/:id/feuer', async (req, res) => {
	let id = req.params.id;
	let theme = req.body.theme;
	let topf = await getTopf(id);

	if (topf) {
		if (topf.closed) return respond(res, { errorZu: true }, topf);
		if (topf.adminCode) return respond(res, { errorBenutzung: true }, topf);
	} else {
		topf = { id, persons: [] }
	}

	topf.adminCode = generateCode();
	topf.theme = theme;
	await setTopf(id, topf);

	respond(res, { init: true }, topf)
});

app.get('/:id', async (req, res) => {
	let id = req.params.id;
	let topf = await getTopf(id);

	if (!topf) return respond(res, { errorNotFound: true });
	if (topf.closed) return respond(res, { ergebnis: true, liste: generateList(topf) }, topf);

	respond(res, { topf: true, cookie: generateCode() }, topf);
});

app.post('/:id/danke', async (req, res) => {
	let id = req.params.id;
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
	let id = req.params.id;
	let adminCode = req.params.adminCode;
	let topf = await getTopf(id);

	if (!topf) return respond(res, { errorNotFound: true });
	if (topf.adminCode !== adminCode) return respond(res, { errorNichtDeiner: true }, topf);
	if (topf.closed) return respond(res, { ergebnis: true, liste: generateList(topf) }, topf);

	respond(res, { schliessen: true }, topf)
});

app.post('/:id/deckelzu/:adminCode', async (req, res) => {
	let id = req.params.id;
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

const server = app.listen(port, () => {
	console.log('listening at port ' + port)
})

process.on('SIGTERM', () => {
	console.log('SIGTERM signal received: closing HTTP server')
	server.close(() => {
		console.log('HTTP server closed')
	})
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

function generateList(topf) {
	let list = [];
	let n = topf.persons.length;
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

function generateWichtel() {
	let first = 'Al,Am,Ar,El,Em,Fe,Frie,Fro,Ga,La,Lau,Le,Lei,Ma,Mel,Mar,Mor,Rhe,Ro,Ru,Se,Le,Va,Vi'.split(',');
	let middle = 'ba,be,bi,bo,bu,da,de,di,do,du,fa,fe,fi,fo,fu,ga,ge,gi,go,gu,la,le,li,lo,lu,ma,me,mi,mo,mu,ra,re,ri,ro,ru,va,ve,vi,vo,vu,wa,we,wi,wo,wu'.split(',');
	let last = 'do,in,is,la,las,lin,mag,na,nas,or,ra,run,tea,us,va,var,vin,wen,wyn,ya'.split(',');
	if (Math.random() < 0.5) return fix(r(first) + r(middle) + r(last));
	return fix(r(first) + r(middle) + r(middle) + r(last));
	function r(list) {
		return list[Math.floor(Math.random() * list.length)];
	}
	function fix(name) {
		name = name.split('');
		let lastChar = false;
		return name.filter(c => (c === lastChar) ? false : lastChar = c).join('');
	}
}

function loadNames(filename) {
	const names = readFileSync(resolve(__dirname, 'data', filename), 'utf8')
		.split('\n')
		.filter(l => l.length > 3)
		.map(l => l.replace(/_/g, ' '));
	console.log(names);
	return names;
}
