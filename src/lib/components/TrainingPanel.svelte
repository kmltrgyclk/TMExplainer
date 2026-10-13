<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { rich } from '$lib/tex';
	import StepStory from './StepStory.svelte';
	import type { Speed } from '$lib/lab.svelte';

	const speeds: Speed[] = ['slow', 'normal', 'fast'];

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
		<button class="btn train" class:running={lab.playing} onclick={() => lab.play()} aria-label={lab.playing ? 'Pause training' : 'Train'}>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				{#if lab.playing}
					<rect x="3.5" y="3" width="3" height="10" rx="1" />
					<rect x="9.5" y="3" width="3" height="10" rx="1" />
				{:else}
					<path d="M4.5 3 L13 8 L4.5 13 Z" />
				{/if}
			</svg>
			{lab.playing ? 'Pause' : 'Train'}
		</button>
		<button class="btn" onclick={() => lab.reset()}>Reset to untrained</button>
		<button class="btn" onclick={() => lab.loadTrained()}>Load trained model</button>
	</div>

	<div class="runbar">
		<label class="stopat" for="stop-at">
			<span>Stop at epoch</span>
			<input
				id="stop-at"
				type="number"
				min="1"
				step="1"
				value={lab.stopAt}
				onchange={(e) => lab.setStopAt(Number(e.currentTarget.value))}
			/>
		</label>
		<div class="speed" role="group" aria-label="Training speed">
			<span>Speed</span>
			<div class="segments">
				{#each speeds as speed}
					<button class:on={lab.speed === speed} aria-pressed={lab.speed === speed} onclick={() => (lab.speed = speed)}>{speed}</button>
				{/each}
			</div>
		</div>
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
	.train svg {
		width: 13px;
		height: 13px;
		fill: currentColor;
	}
	.train.running {
		border-color: var(--accent);
		color: var(--accent);
	}
	.runbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 24px;
		font-size: 13px;
		color: var(--muted);
	}
	.stopat {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.stopat span {
		white-space: nowrap;
	}
	.stopat input[type='number'] {
		width: 72px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		padding: 4px 8px;
		font-family: var(--font-data);
		color: var(--ink);
	}
	.speed {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.segments {
		display: inline-flex;
		padding: 2px;
		gap: 2px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
	}
	.segments button {
		border: 0;
		border-radius: 999px;
		background: none;
		padding: 3px 12px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		cursor: pointer;
	}
	.segments button.on {
		background: var(--ink);
		color: var(--surface);
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
