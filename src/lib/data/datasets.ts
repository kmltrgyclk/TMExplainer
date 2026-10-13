import { SPECS, DATASET_IDS, type DatasetId, type DatasetSpec } from './specs';
import xorModel from './pretrained-xor.json';
import digitsModel from './pretrained-digits.json';
import type { Config } from '../tm/machine';

export type Pretrained = {
	config: Config;
	states: string[];
	history: { epoch: number; accuracy: number }[];
};

export type Dataset = DatasetSpec & { pretrained: Pretrained };

const MODELS: Record<DatasetId, Pretrained> = { xor: xorModel, digits: digitsModel };

export const DATASETS: Record<DatasetId, Dataset> = Object.fromEntries(
	DATASET_IDS.map((id) => [id, { ...SPECS[id], pretrained: MODELS[id] }])
) as Record<DatasetId, Dataset>;

export { DATASET_IDS, type DatasetId };
