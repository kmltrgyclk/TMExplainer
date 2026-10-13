import raw from './digits.json';

export const DIGIT_SIDE = 8;
export const DIGIT_FEATURES = DIGIT_SIDE * DIGIT_SIDE;

function decode(hex: string): Uint8Array {
	const bits = new Uint8Array(DIGIT_FEATURES);
	for (let i = 0; i < hex.length; i++) {
		const nibble = parseInt(hex[i], 16);
		for (let b = 0; b < 4; b++) bits[i * 4 + b] = (nibble >> (3 - b)) & 1;
	}
	return bits;
}

export function digits() {
	return {
		train: { X: raw.train.map(decode), Y: raw.trainLabels },
		test: { X: raw.test.map(decode), Y: raw.testLabels }
	};
}
