"use strict"

const fs = require('fs');
const {resolve} = require('path');

const backgroundFolder = resolve(__dirname, '../web/images/background');

let themes = fs.readdirSync(backgroundFolder);
themes = themes.filter(i => i.endsWith('.jpg'));
themes = themes.map(filename => {
	let parts = filename.split(/[_x\.]/g);
	return {
		name:parts[0],
		color:color(parts[1][0]),
		posX:  posX(parts[1][1]),
		posY:  posY(parts[1][2]),
		width: parseInt(parts[2],10),
		height:parseInt(parts[3],10),
		filename,
	}
})
themes.sort((a,b) => a.name < b.name ? -1 : 1);
themes.forEach((t,i) => t.colLeft = 25*(i % 4));

fs.writeFileSync(resolve(__dirname, 'themes.json'), JSON.stringify(themes, null, '\t'));

function color(char) {
	switch (char) {
		case 'w': return {text:'black',white:true};
		case 'b': return {text:'white',black:true};
		default: throw Error(char);
	}
}

function posX(char) {
	switch (char) {
		case 'l': return {left:true};
		case 'c': return {center:true};
		default: throw Error(char);
	}
}

function posY(char) {
	switch (char) {
		case 'c': return 'center';
		case 'b': return 'bottom';
		default: throw Error(char);
	}
}
