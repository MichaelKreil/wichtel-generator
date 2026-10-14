import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CODE_NAME_LISTS, codeNamesFor, getCodeNameList, MIXED_LIST } from '../src/codenames.ts';

describe('code name lists', () => {
	it('have unique ids and enough unique, clean names', () => {
		assert.equal(new Set(CODE_NAME_LISTS.map((list) => list.id)).size, CODE_NAME_LISTS.length);
		for (const list of CODE_NAME_LISTS) {
			assert.equal(new Set(list.names).size, list.names.length, `duplicates in ${list.id}`);
			assert.ok(list.names.length >= 30, `${list.id} has only ${list.names.length} names`);
			for (const name of list.names) assert.match(name, /^\S(.*\S)?$/, `${list.id}: "${name}"`);
		}
	});

	it('mixes all names into one list', () => {
		const all = new Set(CODE_NAME_LISTS.filter((list) => list !== MIXED_LIST).flatMap((list) => list.names));
		assert.deepEqual(new Set(MIXED_LIST.names), all);
	});

	it('falls back to all names for unknown lists', () => {
		assert.equal(getCodeNameList('nope'), undefined);
		assert.equal(codeNamesFor('nope'), MIXED_LIST.names);
		assert.equal(codeNamesFor('sterne'), getCodeNameList('sterne')?.names);
	});
});
