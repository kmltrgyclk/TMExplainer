<script lang="ts">
	import { untrack } from 'svelte';
	import { lab } from '$lib/lab.svelte';
	import { INCLUDE_FROM, isPositive } from '$lib/tm/machine';
	import { signed, tex } from '$lib/tex';
	import { BEAT } from '$lib/story';

	type Pixel = { index: number; row: number; col: number; mode: 'ink' | 'blank' | 'both'; blocking: boolean };
	type Stencil = { c: number; j: number; positive: boolean; pixels: Pixel[]; fires: boolean; empty: boolean; picked: boolean };

	const REFRESH_MS = 300;

	let firingOnly = $state(false);
	let snapshot = $state(0);
	let lastRefresh = 0;

	$effect(() => {
		lab.version;
		lab.beat;
		lab.input;
		const now = performance.now();
		if (!lab.playing || now - lastRefresh > REFRESH_MS) {
			lastRefresh = now;
			snapshot = untrack(() => snapshot) + 1;
		}
	});

	const rows = $derived(lab.dataset.grid?.rows ?? 8);
	const cols = $derived(lab.dataset.grid?.cols ?? 8);
	const F = $derived(lab.config.features);
	const L = $derived(2 * F);
	const n = $derived(lab.config.clauses);
	const classes = $derived(Array.from({ length: lab.config.classes }, (_, c) => c));

	const stencils = $derived.by(() => {
		snapshot;
		firingOnly;
		return untrack(build);
	});

	function build() {
		const literals = lab.inference.literals;
		const all: Stencil[][] = [];
		for (let c = 0; c < lab.config.classes; c++) {
			const states = lab.states[c];
			const f = lab.trace?.feedback.find((fb) => fb.cls === c) ?? null;
			const list: Stencil[] = [];
			for (let j = 0; j < n; j++) {
				const base = j * L;
				const pixels: Pixel[] = [];
				for (let p = 0; p < F; p++) {
					const ink = states[base + p] >= INCLUDE_FROM;
					const blank = states[base + F + p] >= INCLUDE_FROM;
					if (!ink && !blank) continue;
					const blocking = (ink && !literals[p]) || (blank && !literals[F + p]);
					pixels.push({ index: p, row: Math.floor(p / cols), col: p % cols, mode: ink && blank ? 'both' : ink ? 'ink' : 'blank', blocking });
				}
				list.push({
					c,
					j,
					positive: isPositive(lab.machine, j),
					pixels,
					fires: lab.inference.outputs[c][j] === 1,
					empty: pixels.length === 0,
					picked: !!f && lab.beat >= BEAT.select && f.selected[j] === 1
				});
			}
			all.push(list);
		}
		return all;
	}

	function visible(list: Stencil[], positive: boolean) {
		return list.filter((s) => s.positive === positive && (!firingOnly || s.fires));
	}

	const isSelected = (s: Stencil) => lab.selected?.cls === s.c && lab.selected?.clause === s.j;
</script>

<section class="panel gallery" data-region="bank" class:spotlight={lab.region === 'bank'}>
	<header class="head">
		<div>
			<p class="eyebrow">Clauses as stencils</p>
			<h2>Each clause is a pattern of pixels it needs</h2>
		</div>
		<div class="filter" role="group" aria-label="Which clauses to show">
			<button class:on={!firingOnly} onclick={() => (firingOnly = false)}>All clauses</button>
			<button class:on={firingOnly} onclick={() => (firingOnly = true)}>Firing on this input</button>
		</div>
	</header>

	<div class="legend">
		<span class="key"><svg viewBox="0 0 10 10"><rect class="ink" x="1" y="1" width="8" height="8" rx="1" /></svg> pixel must be inked</span>
		<span class="key"><svg viewBox="0 0 10 10"><rect class="blank" x="1.5" y="1.5" width="7" height="7" rx="1" /></svg> pixel must be blank</span>
		<span class="key"><svg viewBox="0 0 10 10"><rect class="ink" x="1" y="1" width="8" height="8" rx="1" /><circle class="block" cx="5" cy="5" r="2.2" /></svg> requirement broken by this input</span>
		<span class="key"><span class="frame fires pos"></span><span class="frame fires neg"></span> clause fires: votes for or against</span>
	</div>

	<div class="classes">
		{#each classes as c}
			{@const list = stencils[c] ?? []}
			{@const sum = lab.inference.sums[c]}
			<div class="classrow" class:winner={lab.inference.prediction === c}>
				<div class="classlabel">
					<span class="digit">{@html tex(lab.dataset.classTex[c])}</span>
					<span class="sum">{@html tex(`v_{${c}} = ${signed(sum)}`)}</span>
				</div>
				<div class="lines">
					{#each [true, false] as positive}
						<div class="line">
							<span class="polarity" class:pos={positive} class:neg={!positive}>{positive ? '+' : '−'}</span>
							{#each visible(list, positive) as s (s.j)}
								<button
									class="stencil"
									class:fires={s.fires}
									class:pos={s.positive}
									class:neg={!s.positive}
									class:empty={s.empty}
									class:picked={s.picked}
									class:selected={isSelected(s)}
									onclick={() => lab.select(s.c, s.j)}
									aria-label="Class {s.c}, clause {s.j + 1}, {s.positive ? 'positive' : 'negative'}, {s.fires ? 'fires' : 'does not fire'}"
								>
									<svg viewBox="0 0 {cols} {rows}">
										{#each s.pixels as p (p.index)}
											{#if p.mode === 'blank'}
												<rect class="blank" x={p.col + 0.18} y={p.row + 0.18} width="0.64" height="0.64" rx="0.12" />
											{:else}
												<rect class={p.mode === 'both' ? 'both' : 'ink'} x={p.col + 0.08} y={p.row + 0.08} width="0.84" height="0.84" rx="0.12" />
											{/if}
											{#if p.blocking}
												<circle class="block" cx={p.col + 0.5} cy={p.row + 0.5} r="0.24" />
											{/if}
										{/each}
									</svg>
								</button>
							{:else}
								<span class="none">no clause fires</span>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.gallery {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
		flex-wrap: wrap;
	}
	h2 {
		font-size: 18px;
	}
	.filter {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
		background: var(--surface);
	}
	.filter button {
		border: 0;
		background: none;
		padding: 5px 12px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
	.filter button.on {
		background: var(--ink);
		color: var(--surface);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 16px;
		font-size: 12px;
		color: var(--muted);
	}
	.key {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.key svg {
		width: 14px;
		height: 14px;
	}
	.frame {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		border: 2px solid;
	}
	.frame.pos {
		border-color: var(--pos);
	}
	.frame.neg {
		border-color: var(--neg);
	}
	.classes {
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow-x: auto;
	}
	.classrow {
		display: grid;
		grid-template-columns: 58px 1fr;
		gap: 10px;
		align-items: center;
		padding: 4px 6px;
		border-radius: 8px;
		border: 1px solid transparent;
	}
	.classrow.winner {
		border-color: var(--accent);
		background: var(--raised);
	}
	.classlabel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.digit {
		font-size: 22px;
		line-height: 1;
	}
	.sum {
		font-size: 11px;
		color: var(--muted);
	}
	.lines {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}
	.line {
		display: flex;
		gap: 3px;
		align-items: center;
		flex-wrap: wrap;
		min-height: 30px;
	}
	.polarity {
		width: 12px;
		font-family: var(--font-data);
		font-weight: 600;
		font-size: 12px;
	}
	.polarity.pos {
		color: var(--pos);
	}
	.polarity.neg {
		color: var(--neg);
	}
	.stencil {
		width: 28px;
		height: 28px;
		padding: 2px;
		border-radius: 4px;
		border: 1.5px solid var(--line);
		background: var(--surface);
		cursor: pointer;
		opacity: 0.55;
		transition:
			opacity 0.2s,
			border-color 0.2s;
	}
	.stencil.fires {
		opacity: 1;
		border-width: 2px;
	}
	.stencil.fires.pos {
		border-color: var(--pos);
	}
	.stencil.fires.neg {
		border-color: var(--neg);
	}
	.stencil.empty {
		border-style: dashed;
	}
	.stencil.picked {
		box-shadow: 0 0 0 2px var(--accent);
	}
	.stencil.selected {
		box-shadow: 0 0 0 2px var(--ink);
		opacity: 1;
	}
	.stencil svg {
		width: 100%;
		height: 100%;
		display: block;
	}
	rect.ink {
		fill: var(--ink);
	}
	rect.blank {
		fill: none;
		stroke: var(--ink);
		stroke-width: 0.14;
	}
	rect.both {
		fill: var(--muted);
	}
	circle.block {
		fill: var(--neg);
	}
	.key rect.ink {
		fill: var(--ink);
	}
	.key rect.blank {
		stroke-width: 1.2;
	}
	.key circle.block {
		fill: var(--neg);
	}
	.none {
		font-size: 11px;
		color: var(--muted);
	}
</style>
