import { describe, expect, it } from 'vitest';
import { digits, DIGIT_FEATURES } from '../src/lib/data/digits';
import { SPECS } from '../src/lib/data/specs';
import { accuracy, createMachine, trainEpoch } from '../src/lib/tm/machine';

describe('digits dataset', () => {
	const data = digits();

	it('decodes 1,797 binary 8 × 8 images with labels 0 to 9', () => {
		expect(data.train.X.length + data.test.X.length).toBe(1797);
		expect(data.train.X.every((x) => x.length === DIGIT_FEATURES && x.every((b) => b === 0 || b === 1))).toBe(true);
		expect(new Set([...data.train.Y, ...data.test.Y])).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
	});

	it('learns digits with the default settings', () => {
		const machine = createMachine(SPECS.digits.config);
		for (let epoch = 0; epoch < 10; epoch++) trainEpoch(machine, data.train.X, data.train.Y);
		const score = accuracy(machine, data.test.X, data.test.Y);
		console.log('digits test accuracy after 10 epochs', score);
		expect(score).toBeGreaterThan(0.8);
	}, 60000);
});
