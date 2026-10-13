import { createRng } from './rng';

export type Dataset = {
	X: Uint8Array[];
	Y: number[];
};

export type NoisyXor = {
	features: number;
	names: string[];
	train: Dataset;
	test: Dataset;
};

export const XOR_FEATURES = 12;

export function xorLabel(x: ArrayLike<number>): number {
	return x[0] ^ x[1];
}

function sample(rng: () => number, size: number, noise: number): Dataset {
	const X: Uint8Array[] = [];
	const Y: number[] = [];
	for (let i = 0; i < size; i++) {
		const x = new Uint8Array(XOR_FEATURES);
		for (let k = 0; k < XOR_FEATURES; k++) x[k] = rng() < 0.5 ? 1 : 0;
		const y = xorLabel(x);
		X.push(x);
		Y.push(rng() < noise ? 1 - y : y);
	}
	return { X, Y };
}

export function noisyXor(seed: number, trainSize = 5000, testSize = 5000, noise = 0.4): NoisyXor {
	const rng = createRng(seed);
	const names = Array.from({ length: XOR_FEATURES }, (_, k) => `x${k + 1}`);
	return {
		features: XOR_FEATURES,
		names,
		train: sample(rng, trainSize, noise),
		test: sample(rng, testSize, 0)
	};
}
