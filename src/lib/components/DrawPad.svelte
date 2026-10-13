<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { tex } from '$lib/tex';

	let pad: HTMLDivElement;
	let painting: number | null = null;

	const rows = $derived(lab.dataset.grid?.rows ?? 8);
	const cols = $derived(lab.dataset.grid?.cols ?? 8);
	const cells = $derived(Array.from({ length: rows * cols }, (_, k) => k));

	const sourceText = $derived(
		lab.source === 'train'
			? 'Training example just used for feedback.'
			: lab.source === 'test'
				? 'Digit from the test set.'
				: 'Your own drawing.'
	);

	function cellAt(event: PointerEvent) {
		const box = pad.getBoundingClientRect();
		const col = Math.floor(((event.clientX - box.left) / box.width) * cols);
		const row = Math.floor(((event.clientY - box.top) / box.height) * rows);
		if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
		return row * cols + col;
	}

	function start(event: PointerEvent) {
		const k = cellAt(event);
		if (k === null) return;
		pad.setPointerCapture(event.pointerId);
		painting = lab.input[k] ? 0 : 1;
		lab.paint(k, painting);
	}

	function move(event: PointerEvent) {
		if (painting === null) return;
		const k = cellAt(event);
		if (k !== null) lab.paint(k, painting);
	}

	function end() {
		painting = null;
	}
</script>

<section class="panel input" data-region="input" class:spotlight={lab.region === 'input'}>
	<div class="intro">
		<p class="eyebrow">Input</p>
		<h2>Draw a digit</h2>
		<p class="note">{sourceText} Draw with the mouse or a finger. Start on an inked pixel to erase.</p>
	</div>

	<div
		bind:this={pad}
		class="pad"
		style:--cols={cols}
		role="application"
		aria-label="Drawing pad, {rows} by {cols} pixels"
		onpointerdown={start}
		onpointermove={move}
		onpointerup={end}
		onpointercancel={end}
	>
		{#each cells as k}
			<span class="pixel" class:on={lab.input[k] === 1}></span>
		{/each}
	</div>

	<div class="side">
		{#if lab.label !== null}
			<div class="row">
				<span class="eyebrow">{lab.source === 'train' ? 'Training label' : 'Test label'}</span>
				<span class="label">{@html tex(`y = ${lab.label}`)}</span>
			</div>
		{/if}
		<div class="actions">
			<button class="btn" onclick={() => lab.randomTest()}>Random test digit</button>
			<button class="btn" onclick={() => lab.clearInput()}>Clear</button>
		</div>
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
	}
	.note {
		margin: 2px 0 0;
		color: var(--muted);
		font-size: 13px;
		max-width: 40ch;
	}
	.pad {
		display: grid;
		grid-template-columns: repeat(var(--cols), 26px);
		gap: 2px;
		padding: 6px;
		border-radius: 10px;
		background: var(--raised);
		border: 1px solid var(--line);
		touch-action: none;
		cursor: crosshair;
		user-select: none;
	}
	.pixel {
		width: 26px;
		height: 26px;
		border-radius: 4px;
		background: var(--surface);
		border: 1px solid var(--line);
		transition: background 0.12s;
	}
	.pixel.on {
		background: var(--ink);
		border-color: var(--ink);
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: flex-start;
	}
	.row {
		display: flex;
		gap: 10px;
		align-items: baseline;
	}
	.label {
		font-size: 16px;
	}
	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	@media (max-width: 900px) {
		.input {
			grid-template-columns: 1fr;
			justify-items: start;
		}
	}
</style>
