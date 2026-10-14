// Demo data for screenshots: one pot with five fake people.
export interface Demo {
	/** Background theme id from src/themes.ts */
	theme: string;
	/** Code name list id from src/codenames.ts */
	codeNames: string;
	participants: string[];
	/** Pairs of participants who must not draw each other */
	exclusions: [string, string][];
}

export const DEMO: Demo = {
	theme: 'snowman',
	codeNames: 'waldtiere',
	participants: ['Anna Schmidt', 'Ben Müller', 'Carla Weiß', 'David Fischer', 'Emma Wagner'],
	exclusions: [['Anna Schmidt', 'Ben Müller']],
};
