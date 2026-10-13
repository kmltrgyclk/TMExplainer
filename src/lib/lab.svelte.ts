import {
	accuracy,
	createMachine,
	importMachine,
	infer,
	trainStep,
	type Config,
	type Machine,
	type StepTrace
} from './tm/machine';
import { noisyXor, xorLabel } from './tm/noisyxor';
import { createRng, shuffle } from './tm/rng';
import { DATA_SEED, DEFAULT_CONFIG, MAX_EPOCHS } from './tm/defaults';
import pretrained from './tm/pretrained.json';

export type Point = { epoch: number; accuracy: number };
export type Source = 'manual' | 'train' | 'test';

const STEPS_PER_FRAME = 1250;

class Lab {
	data = noisyXor(DATA_SEED);
	machine: Machine = createMachine(DEFAULT_CONFIG);
	order: number[] = [];
	cursor = 0;

	version = $state(0);
	config = $state<Config>({ ...DEFAULT_CONFIG });
	epoch = $state(0);
	steps = $state(0);
	history = $state<Point[]>([]);
	input = $state<number[]>([]);
	label = $state<number | null>(null);
	source = $state<Source>('test');
	trace = $state.raw<StepTrace | null>(null);
	selected = $state<{ cls: number; clause: number } | null>(null);
	playing = $state(false);
	guideOpen = $state(true);
	guidePage = $state(0);
	region = $state<string | null>(null);
	view = $state<'circuit' | 'matrix'>('circuit');

	inference = $derived.by(() => {
		this.version;
		return infer(this.machine, this.input);
	});

	trueLabel = $derived(xorLabel(this.input));

	constructor() {
		this.loadTrained();
	}

	touch() {
		this.version++;
	}

	reseed(epochs: number) {
		this.machine.rng = createRng(this.machine.config.seed * 7919 + epochs);
	}

	loadTrained() {
		this.stop();
		this.machine = importMachine(pretrained);
		this.config = { ...pretrained.config };
		this.history = pretrained.history.map((p) => ({ ...p }));
		this.epoch = this.history[this.history.length - 1].epoch;
		this.steps = this.epoch * this.data.train.X.length;
		this.reseed(this.epoch);
		this.startEpoch();
		this.trace = null;
		this.selected = { cls: 1, clause: 0 };
		this.showTest(this.firstTestIndex(1));
		this.touch();
	}

	reset(config: Config = this.config) {
		this.stop();
		this.config = { ...config };
		this.machine = createMachine({ ...config });
		this.epoch = 0;
		this.steps = 0;
		this.history = [{ epoch: 0, accuracy: this.testAccuracy() }];
		this.startEpoch();
		this.trace = null;
		this.selected = null;
		this.touch();
	}

	setLive(key: 'T' | 's', value: number) {
		this.config[key] = value;
		this.machine.config[key] = value;
		this.touch();
	}

	firstTestIndex(y: number) {
		return this.data.test.Y.findIndex((label, i) => label === y && this.data.test.X[i][2] === 0);
	}

	startEpoch() {
		this.order = shuffle(this.machine.rng, this.data.train.X.length);
		this.cursor = 0;
	}

	testAccuracy() {
		return accuracy(this.machine, this.data.test.X, this.data.test.Y);
	}

	advance(record: boolean): StepTrace | null {
		const i = this.order[this.cursor];
		const trace = trainStep(this.machine, this.data.train.X[i], this.data.train.Y[i], record);
		this.cursor++;
		this.steps++;
		if (this.cursor === this.order.length) {
			this.epoch++;
			this.history.push({ epoch: this.epoch, accuracy: this.testAccuracy() });
			this.startEpoch();
		}
		return trace;
	}

	nextIndex() {
		return this.order[this.cursor];
	}

	step() {
		this.stop();
		const i = this.nextIndex();
		this.input = Array.from(this.data.train.X[i]);
		this.label = this.data.train.Y[i];
		this.source = 'train';
		this.trace = this.advance(true);
		this.touch();
	}

	runEpoch() {
		this.stop();
		this.trace = null;
		const target = this.epoch + 1;
		while (this.epoch < target) this.advance(false);
		this.touch();
	}

	play() {
		if (this.playing) return this.stop();
		if (this.epoch >= MAX_EPOCHS) return;
		this.playing = true;
		this.trace = null;
		const frame = () => {
			if (!this.playing) return;
			for (let n = 0; n < STEPS_PER_FRAME && this.epoch < MAX_EPOCHS; n++) this.advance(false);
			this.touch();
			if (this.epoch >= MAX_EPOCHS) this.playing = false;
			else requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}

	stop() {
		this.playing = false;
	}

	showTest(i: number) {
		this.input = Array.from(this.data.test.X[i]);
		this.label = this.data.test.Y[i];
		this.source = 'test';
		this.trace = null;
	}

	randomTest() {
		this.showTest(Math.floor(Math.random() * this.data.test.X.length));
	}

	toggle(k: number) {
		const next = [...this.input];
		next[k] = next[k] ? 0 : 1;
		this.input = next;
		this.label = null;
		this.source = 'manual';
		this.trace = null;
	}

	select(cls: number, clause: number) {
		const same = this.selected?.cls === cls && this.selected?.clause === clause;
		this.selected = same ? null : { cls, clause };
	}
}

export const lab = new Lab();
