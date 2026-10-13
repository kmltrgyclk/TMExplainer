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
import { createRng, shuffle } from './tm/rng';
import { DATASETS, type DatasetId } from './data/datasets';
import { BEAT, BEATS, BEAT_MS } from './story';

export type Point = { epoch: number; accuracy: number };
export type Source = 'manual' | 'train' | 'test';

const FRAME_BUDGET_MS = 12;
const BATCH = 64;

export type Speed = 'slow' | 'normal' | 'fast';
const EPOCHS_PER_SECOND: Record<Speed, number> = { slow: 0.5, normal: 3, fast: Infinity };

class Lab {
	datasetId = $state<DatasetId>('xor');
	dataset = $derived(DATASETS[this.datasetId]);
	machine: Machine = createMachine(DATASETS.xor.config);
	order: number[] = [];
	cursor = 0;

	version = $state(0);
	config = $state<Config>({ ...DATASETS.xor.config });
	epoch = $state(0);
	steps = $state(0);
	history = $state<Point[]>([]);
	input = $state<number[]>([]);
	label = $state<number | null>(null);
	source = $state<Source>('test');
	trace = $state.raw<StepTrace | null>(null);
	selected = $state<{ cls: number; clause: number } | null>(null);
	playing = $state(false);
	speed = $state<Speed>('normal');
	stopAt = $state(DATASETS.xor.maxEpochs);
	guideOpen = $state(true);
	guidePage = $state(0);
	guideRegion = $state<string | null>(null);
	view = $state<'circuit' | 'matrix'>('circuit');
	beat = $state(0);
	storyPlaying = $state(false);
	storyTimer: ReturnType<typeof setTimeout> | null = null;

	moved = $derived(!!this.trace && this.beat >= BEAT.move);

	states = $derived.by(() => {
		this.version;
		const trace = this.trace;
		if (!trace || this.moved) return this.machine.states;
		return this.machine.states.map((s, c) => trace.feedback.find((f) => f.cls === c)?.before ?? s);
	});

	inference = $derived.by(() => {
		this.version;
		return infer({ ...this.machine, states: this.states }, this.input);
	});

	before = $derived.by(() => {
		this.version;
		const trace = this.trace;
		if (!trace) return null;
		const states = this.machine.states.map((s, c) => trace.feedback.find((f) => f.cls === c)?.before ?? s);
		return infer({ ...this.machine, states }, trace.x);
	});

	after = $derived.by(() => {
		this.version;
		return this.trace ? infer(this.machine, this.trace.x) : null;
	});

	region = $derived(this.trace ? BEATS[this.beat].region : this.guideRegion);

	truth = $derived(this.dataset.truth ? this.dataset.truth(this.input) : this.label);

	get data() {
		return this.dataset;
	}

	get extension() {
		return Math.max(10, Math.round(this.dataset.maxEpochs / 4));
	}

	setStopAt(value: number) {
		if (Number.isFinite(value)) this.stopAt = Math.max(1, Math.floor(value));
	}

	get maxEpochs() {
		return this.dataset.maxEpochs;
	}

	constructor() {
		this.loadTrained();
	}

	touch() {
		this.version++;
	}

	reseed(epochs: number) {
		this.machine.rng = createRng(this.machine.config.seed * 7919 + epochs);
	}

	setDataset(id: DatasetId) {
		if (id === this.datasetId) return;
		this.datasetId = id;
		this.view = 'circuit';
		this.guidePage = 0;
		this.stopAt = this.dataset.maxEpochs;
		this.loadTrained();
	}

	loadTrained() {
		this.stop();
		const pretrained = this.dataset.pretrained;
		this.machine = importMachine(pretrained);
		this.config = { ...pretrained.config };
		this.history = pretrained.history.map((p) => ({ ...p }));
		this.epoch = this.history[this.history.length - 1].epoch;
		this.steps = this.epoch * this.data.train.X.length;
		this.reseed(this.epoch);
		this.startEpoch();
		this.clearTrace();
		this.showTest(this.dataset.initialTest);
		this.selected = { cls: this.dataset.test.Y[this.dataset.initialTest], clause: 0 };
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
		this.clearTrace();
		this.selected = null;
		this.touch();
	}

	setLive(key: 'T' | 's', value: number) {
		this.config[key] = value;
		this.machine.config[key] = value;
		this.touch();
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
		this.selected = this.busiestClause(this.trace!);
		this.beat = 0;
		this.touch();
		this.playStory();
	}

	busiestClause(trace: StepTrace) {
		const L = this.machine.literals;
		let best = { cls: trace.y, clause: 0, moves: -1 };
		for (const f of trace.feedback) {
			for (let j = 0; j < this.config.clauses; j++) {
				let moves = 0;
				for (let k = 0; k < L; k++) if (f.kinds[j * L + k]) moves++;
				const preferred = f.role === 'target' ? 0.5 : 0;
				if (moves + preferred > best.moves) best = { cls: f.cls, clause: j, moves: moves + preferred };
			}
		}
		return { cls: best.cls, clause: best.clause };
	}

	playStory() {
		this.pauseStory();
		if (!this.trace || this.beat >= BEATS.length - 1) return;
		this.storyPlaying = true;
		const tick = () => {
			if (!this.storyPlaying || !this.trace) return;
			this.beat++;
			if (this.beat < BEATS.length - 1) this.storyTimer = setTimeout(tick, BEAT_MS);
			else this.storyPlaying = false;
		};
		this.storyTimer = setTimeout(tick, BEAT_MS);
	}

	pauseStory() {
		this.storyPlaying = false;
		if (this.storyTimer) clearTimeout(this.storyTimer);
		this.storyTimer = null;
	}

	goToBeat(beat: number) {
		this.pauseStory();
		this.beat = Math.max(0, Math.min(BEATS.length - 1, beat));
	}

	clearTrace() {
		this.pauseStory();
		this.trace = null;
		this.beat = 0;
	}

	runEpoch() {
		this.stop();
		this.clearTrace();
		const target = this.epoch + 1;
		while (this.epoch < target) this.advance(false);
		this.touch();
	}

	play() {
		if (this.playing) return this.stop();
		if (this.epoch >= this.stopAt) this.stopAt = this.epoch + this.extension;
		this.playing = true;
		this.clearTrace();
		let last = performance.now();
		let allowance = 0;
		const frame = (now: number) => {
			if (!this.playing) return;
			const rate = EPOCHS_PER_SECOND[this.speed] * this.data.train.X.length;
			allowance = Math.min(allowance + (rate * Math.max(0, now - last)) / 1000, rate);
			last = now;
			const start = performance.now();
			while (allowance >= 1 && this.epoch < this.stopAt && performance.now() - start < FRAME_BUDGET_MS) {
				const batch = Math.min(BATCH, Math.floor(allowance));
				for (let n = 0; n < batch && this.epoch < this.stopAt; n++) this.advance(false);
				allowance -= batch;
			}
			this.touch();
			if (this.epoch >= this.stopAt) this.playing = false;
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
		this.clearTrace();
	}

	randomTest() {
		this.showTest(Math.floor(Math.random() * this.data.test.X.length));
	}

	toggle(k: number) {
		this.paint(k, this.input[k] ? 0 : 1);
	}

	paint(k: number, value: number) {
		if (this.source === 'manual' && this.input[k] === value) return;
		const next = [...this.input];
		next[k] = value;
		this.input = next;
		this.label = null;
		this.source = 'manual';
		this.clearTrace();
	}

	clearInput() {
		this.input = new Array(this.dataset.features).fill(0);
		this.label = null;
		this.source = 'manual';
		this.clearTrace();
	}

	select(cls: number, clause: number) {
		const same = this.selected?.cls === cls && this.selected?.clause === clause;
		this.selected = same ? null : { cls, clause };
	}
}

export const lab = new Lab();
