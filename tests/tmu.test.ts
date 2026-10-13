import { describe, expect, it } from 'vitest';
import golden from './fixtures/tmu_golden.json';
import { importMachine, infer } from '../src/lib/tm/machine';

describe('agreement with tmu', () => {
	const machine = importMachine(golden);

	it('matches tmu class sums and predictions on every probe input', () => {
		let sumMismatches = 0;
		let predictionMismatches = 0;
		golden.X.forEach((x, i) => {
			const r = infer(machine, x);
			if (r.sums[0] !== golden.sums[i][0] || r.sums[1] !== golden.sums[i][1]) sumMismatches++;
			if (r.prediction !== golden.predictions[i]) predictionMismatches++;
		});
		console.log(`inputs ${golden.X.length}, sum mismatches ${sumMismatches}, prediction mismatches ${predictionMismatches}, tmu test accuracy ${golden.testAccuracy}`);
		expect(sumMismatches).toBe(0);
		expect(predictionMismatches).toBe(0);
	});
});
