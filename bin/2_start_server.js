"use strict"

const fs = require('fs');
const express = require('express');
const mustache = require('mustache');
const {resolve} = require('path');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const port = 3000;
const devMode = true;
const basename = 'https://wichtel-generator.develop.brdata-dev.de/'
const codeChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const actors = fs.readFileSync(resolve(__dirname, 'actors.txt'), 'utf8')
	.split('\n')
	.filter(l => l.length > 3)
	.map(l => l.split(' ').map(p => p.replace(/_/g,' ')));
console.log(actors.filter(p => p.length !== 2));

const themes = JSON.parse(fs.readFileSync(resolve(__dirname, 'themes.json'), 'utf8'));

admin.initializeApp({credential:admin.credential.cert(require('../brdata-dev-63bc275af2fb.json'))});
const db = admin.firestore();

const render = (() => {
	if (devMode) {
		return obj => mustache.render(fs.readFileSync(resolve(__dirname, '../templates/main.html'), 'utf8'), obj);
	} else {
		const template = Mustache.parse(fs.readFileSync(resolve(__dirname, '../templates/main.html'), 'utf8'));
		return obj => mustache.render(template, obj);
	}
})()

const app = express();
app.use(bodyParser.urlencoded({extended: true})); 

async function getTopf(id) {
	try {
		let data = await db.collection('wichtel-generator').doc(id).get();
		return JSON.parse(data.data().content);
	} catch (e) {
		return false;
	}
}

async function setTopf(id, topf) {
	let data = {content:JSON.stringify(topf)};
	//console.log('write', topf);
	await db.collection('wichtel-generator').doc(id).set(data);
}

app.use('/assets', express.static(resolve(__dirname, '../web')));

function respond(res, obj, topf) {
	obj.theme = (topf && topf.theme) || themes[Math.floor(Math.random()*themes.length)].name;
	obj.adminCode = topf && topf.adminCode;
	obj.id = topf && topf.id;
	obj.personList = topf && topf.persons && topf.persons.map(p => p.name).sort();
	if (obj.personList) {
		if (obj.personList.length <= 1) {
			obj.personList = obj.personList[0];
			obj.personSingle = true;
		} else {
			obj.personList = obj.personList.slice(0,-1).join(', ')+' und '+obj.personList.pop();
			obj.personSingle = false;
		}
	}
	//console.log(obj);
	obj.themes = themes;
	obj.basename = basename;
	res.end(render(obj));
}

app.get('/', (req, res) => respond(res, {start: {id:generateWichtel()}}));

app.post('/:id/feuer', async (req, res) => {
	let id = req.params.id;
	let theme = req.body.theme;
	let topf = await getTopf(id);

	if (topf) {
		if (topf.closed)    return respond(res, {errorZu:true}, topf);
		if (topf.adminCode) return respond(res, {errorBenutzung:true}, topf);
	} else {
		topf = {id, persons: []}
	}
	 
	topf.adminCode = generateCode();
	topf.theme = theme;
	await setTopf(id, topf);

	respond(res, {init:true}, topf)
});

app.get('/:id', async (req, res) => {
	let id = req.params.id;
	let topf = await getTopf(id);

	if (!topf) return respond(res, {errorNotFound:true});
	if (topf.closed) return respond(res, {ergebnis:true, liste:generateList(topf)}, topf);

	respond(res, {topf:true, cookie:generateCode()}, topf);
});

app.post('/:id/danke', async (req, res) => {
	let id = req.params.id;
	let topf = await getTopf(id);

	if (!topf) return respond(res, {errorNotFound:true});
	if (topf.closed) return respond(res, {ergebnis:true, liste:generateList(topf)}, topf);

	let name = req.body.name;
	let cookie = req.body.cookie;
	let codeName;
	let person = topf.persons.find(p => (p.cookie === cookie) && (p.name === name));
	if (person) {
		codeName = person.codeName
	} else {
		do { codeName = generateName() }
		while (topf.persons.some(e => e.codeName === codeName))
		topf.persons.push({name, codeName, cookie});
	}

	await setTopf(id, topf);

	respond(res, {danke:true, codeName}, topf);
});

app.get('/:id/deckelzu/:adminCode', async (req, res) => {
	let id = req.params.id;
	let adminCode = req.params.adminCode;
	let topf = await getTopf(id);

	if (!topf) return respond(res, {errorNotFound:true});
	if (topf.adminCode !== adminCode) return respond(res, {errorNichtDeiner:true}, topf);
	if (topf.closed) return respond(res, {ergebnis:true, liste:generateList(topf)}, topf);

	respond(res, {schliessen:true}, topf)
});

app.post('/:id/deckelzu/:adminCode', async (req, res) => {
	let id = req.params.id;
	let adminCode = req.params.adminCode;
	let topf = await getTopf(id);
	
	if (!topf) return respond(res, {errorNotFound:true});
	if (topf.adminCode !== adminCode) return respond(res, {errorNichtDeiner:true}, topf);

	topf.closed = true;
	topf.persons.forEach(e => e.order = Math.random());
	topf.persons.sort((a,b) => a.order - b.order);
	await setTopf(id, topf);

	return respond(res, {ergebnis:true, liste:generateList(topf)}, topf);
});

app.listen(port, () => {
	console.log('listening at port '+port)
})

function generateCode() {
	let code = [];
	for (let i = 0; i < 12; i++) code.push(codeChars[Math.floor(Math.random()*codeChars.length)]);
	return code.join('');
}

function generateName() {
	let i = Math.floor(Math.random()*actors.length);
	let j = Math.floor(Math.random()*actors.length);
	if (Math.random() > 0.01) j = i;
	return [
		actors[i][0],
		actors[j][1],
	].join(' ');
}

function generateList(topf) {
	let list = [];
	let n = topf.persons.length;
	for (let i = 0; i < n; i++) {
		list.push({
			name: topf.persons[i].name,
			codeName: topf.persons[(i+1) % n].codeName,
		})
	}
	//console.log(topf.persons);
	//console.log(list);
	list.sort((a,b) => a.codeName < b.codeName ? -1 : 1);
	return list;
}

function randomSave(value, file) {
	let data = [];
	if (fs.existsSync(file)) data = fs.readFileSync(file, 'utf8').split('\n');
	data.push(value);
	data = data.map(e => [e,Math.random()]);
	data.sort((a,b) => a[1]-b[1]);
	data = data.map(e => e[0]);

	fs.writeFileSync(file, data.join('\n'), 'utf8');
}

function generateWichtel() {
	let first = 'Al,Am,Ar,El,Em,Fe,Frie,Fro,Ga,La,Lau,Le,Lei,Ma,Mel,Mar,Mor,Rhe,Ro,Ru,Se,Le,Va,Vi'.split(',');
	let middle = 'ba,be,bi,bo,bu,da,de,di,do,du,fa,fe,fi,fo,fu,ga,ge,gi,go,gu,la,le,li,lo,lu,ma,me,mi,mo,mu,ra,re,ri,ro,ru,va,ve,vi,vo,vu,wa,we,wi,wo,wu'.split(',');
	let last = 'do,in,is,la,las,lin,mag,na,nas,or,ra,run,tea,us,va,var,vin,wen,wyn,ya'.split(',');
	if (Math.random() < 0.5) return fix(r(first)+r(middle)+r(last));
	return fix(r(first)+r(middle)+r(middle)+r(last));
	function r(list) {
		return list[Math.floor(Math.random()*list.length)];
	}
	function fix(name) {
		name = name.split('');
		let lastChar = false;
		return name.filter(c => (c === lastChar) ? false : lastChar = c).join('');
	}
}