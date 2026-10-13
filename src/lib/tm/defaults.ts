import type { Config } from './machine';

export const DATA_SEED = 2026;
export const PRETRAINED_EPOCHS = 40;
export const MAX_EPOCHS = 200;

export const DEFAULT_CONFIG: Config = {
	features: 12,
	classes: 2,
	clauses: 10,
	T: 15,
	s: 3.9,
	boost: false,
	seed: 1
};
