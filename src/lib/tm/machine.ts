import { createRng, randomInt, shuffle, type Rng } from './rng';

export const STATE_MAX = 255;
export const INCLUDE_FROM = 128;
export const INITIAL_STATE = 127;

export const NONE = 0;
export const TYPE_IA = 1;
export const TYPE_IB = 2;
export const TYPE_II = 3;

export type Config = {
	features: number;
	classes: number;
	clauses: number;
	T: number;
	s: number;
	boost: boolean;
	seed: number;
};

export type Machine = {
	config: Config;
	literals: number;
	states: Uint8Array[];
	rng: Rng;
};

export type Inference = {
	literals: Uint8Array;
	outputs: Uint8Array[];
	votes: number[];
	sums: number[];
	prediction: number;
};

export type ClassFeedback = {
	cls: number;
	role: 'target' | 'negative';
	sum: number;
	probability: number;
	outputs: Uint8Array;
	selected: Uint8Array;
	before: Uint8Array;
	kinds: Uint8Array;
};

export type StepTrace = {
	x: Uint8Array;
	y: number;
	literals: Uint8Array;
	feedback: ClassFeedback[];
};

export function createMachine(config: Config): Machine {
	const literals = 2 * config.features;
	const states = Array.from({ length: config.classes }, () =>
		new Uint8Array(config.clauses * literals).fill(INITIAL_STATE)
	);
	return { config, literals, states, rng: createRng(config.seed) };
}

export function isPositive(machine: Machine, clause: number): boolean {
	return clause < machine.config.clauses / 2;
}

export function polarity(machine: Machine, clause: number): number {
	return isPositive(machine, clause) ? 1 : -1;
}

export function includes(machine: Machine, cls: number, clause: number, literal: number): boolean {
	return machine.states[cls][clause * machine.literals + literal] >= INCLUDE_FROM;
}

export function toLiterals(x: ArrayLike<number>): Uint8Array {
	const n = x.length;
	const literals = new Uint8Array(2 * n);
	for (let k = 0; k < n; k++) {
		literals[k] = x[k] ? 1 : 0;
		literals[n + k] = x[k] ? 0 : 1;
	}
	return literals;
}

export function clauseOutput(
	machine: Machine,
	cls: number,
	clause: number,
	literals: Uint8Array,
	training: boolean
): number {
	const state = machine.states[cls];
	const base = clause * machine.literals;
	let empty = true;
	for (let k = 0; k < machine.literals; k++) {
		if (state[base + k] < INCLUDE_FROM) continue;
		empty = false;
		if (!literals[k]) return 0;
	}
	return empty && !training ? 0 : 1;
}

function clauseOutputs(machine: Machine, cls: number, literals: Uint8Array, training: boolean) {
	const outputs = new Uint8Array(machine.config.clauses);
	for (let j = 0; j < outputs.length; j++) {
		outputs[j] = clauseOutput(machine, cls, j, literals, training);
	}
	return outputs;
}

function vote(machine: Machine, outputs: Uint8Array): number {
	let sum = 0;
	for (let j = 0; j < outputs.length; j++) sum += outputs[j] * polarity(machine, j);
	return sum;
}

function clamp(value: number, limit: number): number {
	return Math.max(-limit, Math.min(limit, value));
}

export function infer(machine: Machine, x: ArrayLike<number>): Inference {
	const literals = toLiterals(x);
	const outputs: Uint8Array[] = [];
	const votes: number[] = [];
	const sums: number[] = [];
	let prediction = 0;
	for (let c = 0; c < machine.config.classes; c++) {
		const out = clauseOutputs(machine, c, literals, false);
		const v = vote(machine, out);
		outputs.push(out);
		votes.push(v);
		sums.push(clamp(v, machine.config.T));
		if (sums[c] > sums[prediction]) prediction = c;
	}
	return { literals, outputs, votes, sums, prediction };
}

export function predict(machine: Machine, x: ArrayLike<number>): number {
	return infer(machine, x).prediction;
}

function typeI(machine: Machine, cls: number, clause: number, literals: Uint8Array, output: number, kinds?: Uint8Array) {
	const { s, boost } = machine.config;
	const state = machine.states[cls];
	const base = clause * machine.literals;
	const rng = machine.rng;
	for (let k = 0; k < machine.literals; k++) {
		const i = base + k;
		if (output && literals[k]) {
			if (boost || rng() <= (s - 1) / s) {
				if (state[i] < STATE_MAX) state[i]++;
				if (kinds) kinds[i] = TYPE_IA;
			}
		} else if (rng() <= 1 / s) {
			if (state[i] > 0) state[i]--;
			if (kinds) kinds[i] = TYPE_IB;
		}
	}
}

function typeII(machine: Machine, cls: number, clause: number, literals: Uint8Array, output: number, kinds?: Uint8Array) {
	if (!output) return;
	const state = machine.states[cls];
	const base = clause * machine.literals;
	for (let k = 0; k < machine.literals; k++) {
		const i = base + k;
		if (literals[k] || state[i] >= INCLUDE_FROM) continue;
		state[i]++;
		if (kinds) kinds[i] = TYPE_II;
	}
}

function feedback(
	machine: Machine,
	cls: number,
	role: 'target' | 'negative',
	literals: Uint8Array,
	record: boolean
): ClassFeedback | null {
	const { T, clauses } = machine.config;
	const before = record ? machine.states[cls].slice() : new Uint8Array(0);
	const outputs = clauseOutputs(machine, cls, literals, true);
	const sum = clamp(vote(machine, outputs), T);
	const probability = role === 'target' ? (T - sum) / (2 * T) : (T + sum) / (2 * T);
	const selected = new Uint8Array(clauses);
	const kinds = record ? new Uint8Array(clauses * machine.literals) : undefined;
	for (let j = 0; j < clauses; j++) {
		if (machine.rng() > probability) continue;
		selected[j] = 1;
		const wantsMatch = isPositive(machine, j) === (role === 'target');
		if (wantsMatch) typeI(machine, cls, j, literals, outputs[j], kinds);
		else typeII(machine, cls, j, literals, outputs[j], kinds);
	}
	if (!record) return null;
	return { cls, role, sum, probability, outputs, selected, before, kinds: kinds! };
}

export function trainStep(machine: Machine, x: ArrayLike<number>, y: number, record = true): StepTrace | null {
	const literals = toLiterals(x);
	const target = feedback(machine, y, 'target', literals, record);
	let other = randomInt(machine.rng, machine.config.classes);
	while (other === y) other = randomInt(machine.rng, machine.config.classes);
	const negative = feedback(machine, other, 'negative', literals, record);
	if (!record) return null;
	return { x: Uint8Array.from(x), y, literals, feedback: [target!, negative!] };
}

export function trainEpoch(machine: Machine, X: Uint8Array[], Y: number[]): void {
	for (const i of shuffle(machine.rng, X.length)) trainStep(machine, X[i], Y[i], false);
}

export function accuracy(machine: Machine, X: Uint8Array[], Y: number[]): number {
	let correct = 0;
	for (let i = 0; i < X.length; i++) if (predict(machine, X[i]) === Y[i]) correct++;
	return X.length ? correct / X.length : 0;
}

export function clauseLiterals(machine: Machine, cls: number, clause: number): number[] {
	const included: number[] = [];
	for (let k = 0; k < machine.literals; k++) if (includes(machine, cls, clause, k)) included.push(k);
	return included;
}

export function literalName(literal: number, features: number, names?: string[]): string {
	const feature = literal % features;
	const name = names?.[feature] ?? `x${feature + 1}`;
	return literal < features ? name : `¬${name}`;
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
	return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

export function exportMachine(machine: Machine) {
	return {
		config: machine.config,
		states: machine.states.map(toBase64)
	};
}

export function importMachine(data: { config: Config; states: (string | number[])[] }): Machine {
	const machine = createMachine(data.config);
	data.states.forEach((s, c) => machine.states[c].set(typeof s === 'string' ? fromBase64(s) : s));
	return machine;
}
