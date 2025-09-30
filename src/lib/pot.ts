import { Person } from './person.ts';

export interface Pot {
	theme: string;
	adminCode: string;
	id: string;
	personList: Person[];
	closed: boolean;
}
