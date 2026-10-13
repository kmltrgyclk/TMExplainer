import { describe, expect, it } from 'vitest';
import {
	accuracy,
	clauseLiterals,
	createMachine,
	infer,
	INCLUDE_FROM,
	TYPE_IA,
	TYPE_IB,
	TYPE_II,
	trainEpoch,
	trainStep
} from '../src/lib/tm/machine';
import { noisyXor } from '../src/lib/tm/noisyxor';

const config = { features: 12, classes: 2, clauses: 10, T: 15, s: 3.9, boost: false, seed: 42 };

describe('inference', () => {
	it('treats empty clauses as 0 at inference', () => {
		const tm = createMachine(config);
		const r = infer(tm, new Uint8Array(12));
		expect(r.outputs.every((o) => o.every((v) => v === 0))).toBe(true);
		expect(r.sums).toEqual([0, 0]);
	});

	it('evaluates a hand-set clause as an AND of included literals', () => {
		const tm = createMachine(config);
		tm.states[1][0 * 24 + 0] = INCLUDE_FROM;
		tm.states[1][0 * 24 + 13] = 200;
		const hit = new Uint8Array(12);
		hit[0] = 1;
		const miss = new Uint8Array(12);
		miss[0] = 1;
		miss[1] = 1;
		expect(infer(tm, hit).outputs[1][0]).toBe(1);
		expect(infer(tm, hit).prediction).toBe(1);
		expect(infer(tm, miss).outputs[1][0]).toBe(0);
	});
});

describe('feedback', () => {
	it('records only valid feedback kinds', () => {
		const tm = createMachine(config);
		const data = noisyXor(1, 200, 0);
		for (let i = 0; i < 200; i++) {
			const t = trainStep(tm, data.train.X[i], data.train.Y[i])!;
			for (const f of t.feedback) {
				for (let j = 0; j < 10; j++) {
					for (let k = 0; k < 24; k++) {
						const kind = f.kinds[j * 24 + k];
						if (!f.selected[j]) expect(kind).toBe(0);
						if (kind === TYPE_II) expect(t.literals[k]).toBe(0);
						if (kind === TYPE_IA) expect(t.literals[k] && f.outputs[j]).toBe(1);
						if (kind === TYPE_IB) expect(t.literals[k] && f.outputs[j]).toBe(0);
					}
				}
			}
		}
	});

	it('is reproducible for a fixed seed', () => {
		const data = noisyXor(3, 500, 0);
		const a = createMachine(config);
		const b = createMachine(config);
		trainEpoch(a, data.train.X, data.train.Y);
		trainEpoch(b, data.train.X, data.train.Y);
		expect(a.states).toEqual(b.states);
	});
});

describe('learning', () => {
	it('learns noisy XOR', () => {
		const data = noisyXor(7);
		const tm = createMachine(config);
		for (let e = 0; e < 200; e++) trainEpoch(tm, data.train.X, data.train.Y);
		const acc = accuracy(tm, data.test.X, data.test.Y);
		const rules = Array.from({ length: 10 }, (_, j) => clauseLiterals(tm, 1, j));
		console.log('test accuracy', acc, 'class 1 clauses', JSON.stringify(rules));
		expect(acc).toBeGreaterThan(0.95);
	}, 60000);
});
