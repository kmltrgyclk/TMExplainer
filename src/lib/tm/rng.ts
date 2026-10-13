export type Rng = () => number;

export function createRng(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function randomInt(rng: Rng, n: number): number {
	return Math.floor(rng() * n);
}

export function shuffle(rng: Rng, n: number): number[] {
	const order = Array.from({ length: n }, (_, i) => i);
	for (let i = n - 1; i > 0; i--) {
		const j = randomInt(rng, i + 1);
		[order[i], order[j]] = [order[j], order[i]];
	}
	return order;
}
