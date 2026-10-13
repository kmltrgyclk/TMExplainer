import type { Config } from '../tm/machine';
import { noisyXor, xorLabel, XOR_FEATURES } from '../tm/noisyxor';
import { digits, DIGIT_FEATURES, DIGIT_SIDE } from './digits';

export type DatasetId = 'xor' | 'digits';
export type Split = { X: Uint8Array[]; Y: number[] };

export type DatasetSpec = {
	id: DatasetId;
	name: string;
	features: number;
	classes: number;
	classTex: string[];
	classNames: string[];
	grid: { rows: number; cols: number } | null;
	config: Config;
	clauseOptions: number[];
	pretrainEpochs: number;
	maxEpochs: number;
	train: Split;
	test: Split;
	truth: ((x: ArrayLike<number>) => number) | null;
	initialTest: number;
};

const XOR_SEED = 2026;

function xorSpec(): DatasetSpec {
	const data = noisyXor(XOR_SEED);
	return {
		id: 'xor',
		name: 'Noisy XOR',
		features: XOR_FEATURES,
		classes: 2,
		classTex: ['x_1 = x_2', 'x_1 \\neq x_2'],
		classNames: ['$x_1 = x_2$ (XOR is 0)', '$x_1 \\neq x_2$ (XOR is 1)'],
		grid: null,
		config: { features: XOR_FEATURES, classes: 2, clauses: 10, T: 15, s: 3.9, boost: false, seed: 1 },
		clauseOptions: [2, 4, 6, 8, 10, 12, 16, 20],
		pretrainEpochs: 40,
		maxEpochs: 200,
		train: data.train,
		test: data.test,
		truth: xorLabel,
		initialTest: data.test.Y.findIndex((y, i) => y === 1 && data.test.X[i][2] === 0)
	};
}

function digitsSpec(): DatasetSpec {
	const data = digits();
	const labels = Array.from({ length: 10 }, (_, d) => String(d));
	return {
		id: 'digits',
		name: 'Digits',
		features: DIGIT_FEATURES,
		classes: 10,
		classTex: labels,
		classNames: labels.map((d) => `Digit ${d}`),
		grid: { rows: DIGIT_SIDE, cols: DIGIT_SIDE },
		config: { features: DIGIT_FEATURES, classes: 10, clauses: 40, T: 15, s: 3, boost: false, seed: 1 },
		clauseOptions: [10, 20, 40, 60, 100],
		pretrainEpochs: 20,
		maxEpochs: 60,
		train: data.train,
		test: data.test,
		truth: null,
		initialTest: data.test.Y.findIndex((y) => y === 3)
	};
}

export const SPECS: Record<DatasetId, DatasetSpec> = { xor: xorSpec(), digits: digitsSpec() };
export const DATASET_IDS: DatasetId[] = ['xor', 'digits'];
