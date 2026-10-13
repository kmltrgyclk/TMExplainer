import { writeFileSync } from 'node:fs';
import { accuracy, createMachine, exportMachine, trainEpoch } from '../src/lib/tm/machine';
import { DATASET_IDS, SPECS } from '../src/lib/data/specs';

for (const id of DATASET_IDS) {
	const spec = SPECS[id];
	const machine = createMachine(spec.config);
	const score = () => accuracy(machine, spec.test.X, spec.test.Y);
	const history = [{ epoch: 0, accuracy: score() }];
	for (let epoch = 1; epoch <= spec.pretrainEpochs; epoch++) {
		trainEpoch(machine, spec.train.X, spec.train.Y);
		history.push({ epoch, accuracy: score() });
	}
	writeFileSync(`src/lib/data/pretrained-${id}.json`, JSON.stringify({ ...exportMachine(machine), history }));
	console.log(id, history.map((h) => h.accuracy.toFixed(3)).join(' '));
}
