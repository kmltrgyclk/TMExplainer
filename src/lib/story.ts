export type Beat = { id: string; title: string; region: string };

export const BEATS: Beat[] = [
	{ id: 'example', title: 'Training example', region: 'input' },
	{ id: 'vote', title: 'Class sums', region: 'votes' },
	{ id: 'probability', title: 'Feedback probability', region: 'story' },
	{ id: 'select', title: 'Clauses picked', region: 'bank' },
	{ id: 'move', title: 'Automata move', region: 'detail' },
	{ id: 'result', title: 'After the update', region: 'votes' }
];

export const BEAT = Object.fromEntries(BEATS.map((b, i) => [b.id, i])) as Record<string, number>;
export const BEAT_MS = 1600;
