<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { INCLUDE_FROM, polarity } from '$lib/tm/machine';
	import { rich, signed, tex } from '$lib/tex';

	let chosen = $state<number | null>(null);

	const rows = $derived(lab.dataset.grid?.rows ?? 8);
	const cols = $derived(lab.dataset.grid?.cols ?? 8);
	const F = $derived(lab.config.features);
	const classes = $derived(Array.from({ length: lab.config.classes }, (_, c) => c));
	const target = $derived(chosen ?? lab.inference.prediction);

	const evidence = $derived.by(() => {
		lab.version;
		const L = 2 * F;
		const states = lab.states[target];
		const outputs = lab.inference.outputs[target];
		const score = new Array(F).fill(0);
		let firing = 0;
		for (let j = 0; j < lab.config.clauses; j++) {
			if (!outputs[j]) continue;
			firing++;
			const sign = polarity(lab.machine, j);
			for (let k = 0; k < L; k++) if (states[j * L + k] >= INCLUDE_FROM) score[k % F] += sign;
		}
		const peak = Math.max(1, ...score.map(Math.abs));
		return { score, peak, firing };
	});

	function fill(value: number, peak: number) {
		const strength = Math.round((Math.abs(value) / peak) * 85);
		const hue = value >= 0 ? 'var(--pos)' : 'var(--neg)';
		return `color-mix(in oklab, ${hue} ${strength}%, var(--surface))`;
	}
</script>

<section class="panel evidence" data-region="coverage" class:spotlight={lab.region === 'coverage'}>
	<div class="top">
		<div>
			<p class="eyebrow">Evidence map</p>
			<h2>Which pixels drive the vote</h2>
		</div>
	</div>

	<div class="picker" role="group" aria-label="Class to explain">
		{#each classes as c}
			<button class:on={target === c} class:predicted={lab.inference.prediction === c} onclick={() => (chosen = chosen === c ? null : c)} aria-label="Explain class {c}">
				{@html tex(lab.dataset.classTex[c])}
			</button>
		{/each}
	</div>

	<div class="body">
		<div class="grid" style:--cols={cols} role="img" aria-label="Evidence for class {target} on each pixel">
			{#each Array.from({ length: rows * cols }, (_, p) => p) as p}
				{@const value = evidence.score[p]}
				<span class="cell" class:dark={Math.abs(value) / evidence.peak > 0.6} style:background={fill(value, evidence.peak)}>
					{#if lab.input[p]}<i></i>{/if}
				</span>
			{/each}
		</div>
		<div class="text">
			<p>{@html rich(`Class ${target}: $v_{${target}} = ${signed(lab.inference.sums[target])}$ from ${evidence.firing} firing clauses.`)}</p>
			<p class="muted">Blue pixels are required by clauses that vote for the class. Red pixels are required by clauses that vote against it. Dots show your drawing.</p>
			<p class="muted">{chosen === null ? 'Showing the predicted class. Pick another digit to compare.' : 'Click the digit again to follow the prediction.'}</p>
		</div>
	</div>
</section>

<style>
	.evidence {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	h2 {
		font-size: 16px;
	}
	.picker {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.picker button {
		width: 30px;
		height: 30px;
		border-radius: 7px;
		border: 1px solid var(--line);
		background: var(--surface);
		cursor: pointer;
		font-size: 14px;
	}
	.picker button.predicted {
		border-color: var(--accent);
	}
	.picker button.on {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--surface);
	}
	.body {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		align-items: flex-start;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(var(--cols), 24px);
		gap: 2px;
	}
	.cell {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 1px solid var(--line);
		display: grid;
		place-items: center;
	}
	.cell i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--ink);
	}
	.cell.dark i {
		background: var(--surface);
	}
	.text {
		flex: 1;
		min-width: 180px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	p {
		margin: 0;
		font-size: 13px;
	}
	.muted {
		color: var(--muted);
		font-size: 12px;
	}
</style>
