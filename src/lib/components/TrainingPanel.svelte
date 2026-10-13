<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { rich } from '$lib/tex';
	import StepStory from './StepStory.svelte';

	const clauseOptions = $derived(lab.dataset.clauseOptions);

	function setClauses(event: Event) {
		const clauses = Number((event.target as HTMLSelectElement).value);
		lab.reset({ ...lab.config, clauses });
	}

	function setSeed(event: Event) {
		const seed = Math.max(1, Math.floor(Number((event.target as HTMLInputElement).value) || 1));
		lab.reset({ ...lab.config, seed });
	}

	const epochProgress = $derived.by(() => {
		lab.version;
		return lab.cursor / lab.data.train.X.length;
	});
</script>

<section class="panel training" data-region="training" class:spotlight={lab.region === 'training'}>
	<div class="top">
		<div>
			<p class="eyebrow">Training</p>
			<h2>Feedback moves the automata one state at a time</h2>
		</div>
		<div class="counters mono">
			<span>epoch <b>{lab.epoch}</b></span>
			<span>examples seen <b>{lab.steps.toLocaleString('en-GB')}</b></span>
		</div>
	</div>

	<div class="controls">
		<button class="btn primary" onclick={() => lab.step()}>Step one example</button>
		<button class="btn" onclick={() => lab.runEpoch()}>Run one epoch</button>
		<button class="btn" onclick={() => lab.play()} disabled={!lab.playing && lab.epoch >= lab.maxEpochs}>
			{lab.playing ? 'Pause' : `Train to epoch ${lab.maxEpochs}`}
		</button>
		<button class="btn" onclick={() => lab.reset()}>Reset to untrained</button>
		<button class="btn" onclick={() => lab.loadTrained()}>Load trained model</button>
	</div>

	<div class="progress" aria-label="Progress through the current epoch">
		<div style:width={`${epochProgress * 100}%`}></div>
	</div>

	<div class="params">
		<label for="param-T">
			<span class="eyebrow">{@html rich('Threshold $T$')}</span>
			<input id="param-T" type="range" min="1" max="40" step="1" value={lab.config.T} oninput={(e) => lab.setLive('T', Number(e.currentTarget.value))} />
			<span class="mono">{lab.config.T}</span>
		</label>
		<label for="param-s">
			<span class="eyebrow">{@html rich('Specificity $s$')}</span>
			<input id="param-s" type="range" min="1" max="10" step="0.1" value={lab.config.s} oninput={(e) => lab.setLive('s', Number(e.currentTarget.value))} />
			<span class="mono">{lab.config.s.toFixed(1)}</span>
		</label>
		<label for="param-clauses">
			<span class="eyebrow">Clauses per class</span>
			<select id="param-clauses" value={lab.config.clauses} onchange={setClauses}>
				{#each clauseOptions as n}
					<option value={n}>{n}</option>
				{/each}
			</select>
			<span class="hint">resets</span>
		</label>
		<label for="param-seed">
			<span class="eyebrow">Seed</span>
			<input id="param-seed" type="number" min="1" value={lab.config.seed} onchange={setSeed} />
			<span class="hint">resets</span>
		</label>
	</div>

	{#if lab.trace}
		<StepStory />
	{:else}
		<p class="hintline">Press <b>Step one example</b> to follow one training step, beat by beat.</p>
	{/if}
</section>

<style>
	.training {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
		flex-wrap: wrap;
	}
	h2 {
		font-size: 16px;
		font-weight: 700;
	}
	.counters {
		display: flex;
		gap: 16px;
		font-size: 12px;
		color: var(--muted);
	}
	.counters b {
		color: var(--ink);
		font-weight: 500;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.progress {
		height: 3px;
		background: var(--line);
		border-radius: 2px;
		overflow: hidden;
	}
	.progress div {
		height: 100%;
		background: var(--accent);
	}
	.params {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px 20px;
	}
	label {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 2px 10px;
	}
	label .eyebrow {
		grid-column: 1 / -1;
	}
	input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
	}
	select,
	input[type='number'] {
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		padding: 4px 8px;
		width: 100%;
	}
	.hint {
		font-size: 11px;
		color: var(--muted);
	}
	.hintline {
		margin: 0;
		color: var(--muted);
		font-size: 13px;
	}
</style>
