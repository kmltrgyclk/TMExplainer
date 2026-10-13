import { writeFileSync } from 'node:fs';
import { accuracy, createMachine, exportMachine, trainEpoch } from '../src/lib/tm/machine';
import { noisyXor } from '../src/lib/tm/noisyxor';
import { DATA_SEED, DEFAULT_CONFIG, PRETRAINED_EPOCHS } from '../src/lib/tm/defaults';

const data = noisyXor(DATA_SEED);
const machine = createMachine(DEFAULT_CONFIG);
const history = [{ epoch: 0, accuracy: accuracy(machine, data.test.X, data.test.Y) }];
for (let epoch = 1; epoch <= PRETRAINED_EPOCHS; epoch++) {
	trainEpoch(machine, data.train.X, data.train.Y);
	history.push({ epoch, accuracy: accuracy(machine, data.test.X, data.test.Y) });
}
writeFileSync('src/lib/tm/pretrained.json', JSON.stringify({ ...exportMachine(machine), history }));
console.log(history.map((h) => h.accuracy.toFixed(3)).join(' '));
