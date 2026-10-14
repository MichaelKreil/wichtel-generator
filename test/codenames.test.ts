import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CODE_NAME_LISTS, codeNamesFor, DEFAULT_LIST_ID, getCodeNameList } from '../src/codenames.ts';

describe('code name lists', () => {
	it('have unique ids and enough unique, clean names', () => {
		assert.equal(new Set(CODE_NAME_LISTS.map((list) => list.id)).size, CODE_NAME_LISTS.length);
		for (const list of CODE_NAME_LISTS) {
			assert.equal(new Set(list.names).size, list.names.length, `duplicates in ${list.id}`);
			assert.ok(list.names.length >= 25, `${list.id} has only ${list.names.length} names`);
			for (const name of list.names) assert.match(name, /^\S(.*\S)?$/, `${list.id}: "${name}"`);
		}
	});

	it('has a default list', () => {
		assert.ok(getCodeNameList(DEFAULT_LIST_ID));
	});

	it('falls back to the default list for unknown ids', () => {
		assert.equal(getCodeNameList('nope'), undefined);
		assert.equal(codeNamesFor('nope'), getCodeNameList(DEFAULT_LIST_ID)?.names);
		assert.equal(codeNamesFor('mittelerde'), getCodeNameList('mittelerde')?.names);
	});
});
