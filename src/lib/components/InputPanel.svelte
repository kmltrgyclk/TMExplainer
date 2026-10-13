<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { SHORT_CLASS_TEX } from '$lib/labels';
	import { tex } from '$lib/tex';

	const indices = $derived(Array.from({ length: lab.config.features }, (_, k) => k));
	const noisy = $derived(lab.source === 'train' && lab.label !== null && lab.label !== lab.trueLabel);

	const sourceText = $derived(
		lab.source === 'train'
			? 'Training example just used for feedback'
			: lab.source === 'test'
				? 'Example from the clean test set'
				: 'Your own input'
	);
</script>

<section class="panel input" data-region="input" class:spotlight={lab.region === 'input'}>
	<div class="intro">
		<p class="eyebrow">Input</p>
		<h2>Twelve bits, one rule</h2>
		<p class="note">{sourceText}. Click a bit to flip it.</p>
	</div>

	<div class="bits" role="group" aria-label="Input features">
		{#each indices as k}
			<button
				class="bit mono"
				class:one={lab.input[k]}
				class:relevant={k < 2}
				onclick={() => lab.toggle(k)}
				aria-pressed={lab.input[k] === 1}
				aria-label="x{k + 1} is {lab.input[k]}"
			>
				<span class="v">{lab.input[k]}</span>
				<span class="n">{@html tex(`x_{${k + 1}}`)}</span>
			</button>
		{/each}
	</div>

	<div class="truth">
		<div class="row">
			<span class="eyebrow">Label</span>
			<span class="strong">{@html tex(`x_1 \\oplus x_2 = ${lab.trueLabel}`)} · {@html tex(SHORT_CLASS_TEX[lab.trueLabel])}</span>
		</div>
		{#if lab.source === 'train' && lab.label !== null}
			<div class="row">
				<span class="eyebrow">Training label</span>
				<span class="strong" class:warn={noisy}>{@html tex(`y = ${lab.label}`)}{noisy ? ' · flipped by noise' : ''}</span>
			</div>
		{/if}
		<button class="btn" onclick={() => lab.randomTest()}>Random test example</button>
	</div>
</section>

<style>
	.input {
		padding: 16px;
		display: grid;
		grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
		gap: 16px 24px;
		align-items: center;
	}
	h2 {
		font-size: 18px;
		font-weight: 700;
	}
	.note {
		margin: 2px 0 0;
		color: var(--muted);
		font-size: 13px;
	}
	.bits {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}
	.bit {
		width: 38px;
		height: 50px;
		border-radius: 7px;
		border: 1px solid var(--line);
		background: var(--surface);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 0;
	}
	.bit .v {
		font-size: 17px;
		font-weight: 500;
		color: var(--muted);
	}
	.bit .n {
		font-size: 10px;
		color: var(--muted);
	}
	.bit.one {
		background: var(--ink);
		border-color: var(--ink);
	}
	.bit.one .v,
	.bit.one .n {
		color: var(--surface);
	}
	.bit.relevant {
		box-shadow: 0 3px 0 -1px var(--accent);
	}
	.truth {
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-items: flex-start;
	}
	.row {
		display: flex;
		gap: 10px;
		align-items: baseline;
	}
	.strong {
		font-weight: 500;
	}
	.warn {
		color: var(--type-ib);
	}
	@media (max-width: 900px) {
		.input {
			grid-template-columns: 1fr;
		}
	}
</style>
