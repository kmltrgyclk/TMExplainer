<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { SHORT_CLASS_TEX } from '$lib/labels';
	import { rich, signed, tex } from '$lib/tex';

	const T = $derived(lab.config.T);
	const classes = $derived(Array.from({ length: lab.config.classes }, (_, c) => c));
	const correct = $derived(lab.inference.prediction === lab.trueLabel);

	const pct = (v: number) => (50 * Math.abs(v)) / T;
</script>

<section class="panel votes" data-region="votes" class:spotlight={lab.region === 'votes'}>
	<p class="eyebrow">Votes</p>
	<h2>{@html rich('Each class sums its clause votes, clipped to $\\pm T$')}</h2>

	{#each classes as c}
		{@const raw = lab.inference.votes[c]}
		{@const sum = lab.inference.sums[c]}
		{@const winner = lab.inference.prediction === c}
		<div class="meter" class:winner>
			<div class="label">
				<span>Class {c} <span class="muted">{@html tex(SHORT_CLASS_TEX[c])}</span></span>
				<span>
					{@html tex(`v_{${c}} = ${signed(sum)}`)}{#if raw !== sum}<span class="muted"> (clipped from {@html tex(signed(raw))})</span>{/if}
				</span>
			</div>
			<div class="track" role="img" aria-label="Class {c} sum {sum} on a scale from minus {T} to plus {T}">
				<div class="zero"></div>
				<div
					class="bar"
					class:pos={sum > 0}
					class:neg={sum < 0}
					style:left={sum >= 0 ? '50%' : `${50 - pct(sum)}%`}
					style:width={`${pct(sum)}%`}
				></div>
			</div>
			<div class="ticks"><span>{@html tex(`-T = ${-T}`)}</span><span>{@html tex('0')}</span><span>{@html tex(`+T = ${T}`)}</span></div>
		</div>
	{/each}

	<div class="prediction">
		<span class="eyebrow">Prediction</span>
		<span class="cls">Class {lab.inference.prediction}</span>
		<span class="verdict" class:ok={correct} class:bad={!correct}>
			{@html rich(correct ? '✓ matches $x_1 \\oplus x_2$' : '✗ wrong for $x_1 \\oplus x_2$')}
		</span>
	</div>
</section>

<style>
	.votes {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2 {
		font-size: 16px;
		font-weight: 700;
	}
	.muted {
		color: var(--muted);
	}
	.meter {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.label {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		font-weight: 500;
	}
	.meter.winner .label > span:first-child {
		font-weight: 700;
	}
	.track {
		position: relative;
		height: 14px;
		background: var(--raised);
		border: 1px solid var(--line);
		border-radius: 4px;
		overflow: hidden;
	}
	.zero {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--muted);
	}
	.bar {
		position: absolute;
		top: 2px;
		bottom: 2px;
		border-radius: 3px;
		transition:
			left 0.3s,
			width 0.3s;
	}
	.bar.pos {
		background: var(--pos);
	}
	.bar.neg {
		background: var(--neg);
	}
	.ticks {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		color: var(--muted);
	}
	.prediction {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
		border-top: 1px solid var(--line);
		padding-top: 10px;
	}
	.cls {
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 700;
	}
	.verdict {
		font-size: 12px;
	}
	.ok {
		color: var(--pos);
	}
	.bad {
		color: var(--neg);
	}
</style>
