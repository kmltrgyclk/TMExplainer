<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { INCLUDE_FROM, STATE_MAX, clauseLiterals, isPositive } from '$lib/tm/machine';
	import { literalTex, tex } from '$lib/tex';

	const features = $derived(lab.config.features);
	const literalCount = $derived(2 * features);

	const detail = $derived.by(() => {
		lab.version;
		const sel = lab.selected;
		if (!sel || sel.cls >= lab.config.classes || sel.clause >= lab.config.clauses) return null;
		const { cls, clause } = sel;
		const states = Array.from(lab.machine.states[cls].subarray(clause * literalCount, (clause + 1) * literalCount));
		const included = clauseLiterals(lab.machine, cls, clause);
		const values = included.map((k) => lab.inference.literals[k]);
		return {
			cls,
			clause,
			positive: isPositive(lab.machine, clause),
			states,
			included,
			values,
			output: lab.inference.outputs[cls][clause]
		};
	});

	const name = $derived(detail ? `C^{${detail.positive ? '+' : '-'}}_{${detail.clause + 1}}` : '');

	const formula = $derived.by(() => {
		if (!detail) return '';
		const body = detail.included.length ? detail.included.map((k) => literalTex(k, features)).join(' \\land ') : '\\text{empty}';
		return tex(`${name} = ${body}`);
	});

	const W = 520;
	const H = 150;
	const pad = { top: 14, right: 8, bottom: 34, left: 30 };
	const plotW = W - pad.left - pad.right;
	const plotH = H - pad.top - pad.bottom;
	const y = (s: number) => pad.top + plotH - (s / STATE_MAX) * plotH;
	const step = $derived(plotW / literalCount);
	const x = (k: number) => pad.left + k * step;
	let hover = $state<number | null>(null);
</script>

<section class="panel detail" data-region="detail" class:spotlight={lab.region === 'detail'}>
	<p class="eyebrow">Clause inspector</p>
	{#if detail}
		<h2>
			Class {detail.cls}, clause {@html tex(name)}
			<span class:pos={detail.positive} class:neg={!detail.positive}>
				({detail.positive ? 'positive: votes for' : 'negative: votes against'} the class)
			</span>
		</h2>
		<div class="formula">{@html formula}</div>

		<p class="eval">
			{#if detail.included.length === 0}
				No literal is included. An empty clause outputs 1 during training and 0 at inference.
			{:else}
				{#each detail.included as k, i}
					<span class="term" class:zero={!detail.values[i]}>{@html tex(`${literalTex(k, features)} = ${detail.values[i]}`)}</span>
				{/each}
				<span class="arrow">→</span>
				<span class="term out" class:zero={!detail.output}>{@html tex(`${name} = ${detail.output}`)}</span>
			{/if}
		</p>

		<div class="chart">
			<div class="stage">
			<svg viewBox="0 0 {W} {H}" role="img" aria-label="Tsetlin automaton states for this clause">
				{#each [0, INCLUDE_FROM, STATE_MAX] as tick}
					<line class="grid" x1={pad.left} x2={W - pad.right} y1={y(tick)} y2={y(tick)} class:boundary={tick === INCLUDE_FROM} />
					<text class="axis" x={pad.left - 4} y={y(tick) + 3} text-anchor="end">{tick}</text>
				{/each}
				{#each detail.states as s, k}
					{@const top = Math.min(y(s), y(INCLUDE_FROM))}
					{@const height = Math.max(1.5, Math.abs(y(s) - y(INCLUDE_FROM)))}
					<rect
						x={x(k) + 2}
						y={top}
						width={Math.max(2, step - 4)}
						height={height}
						rx="2"
						class:inc={s >= INCLUDE_FROM}
						class:exc={s < INCLUDE_FROM}
					/>
					<rect
						class="hit"
						x={x(k)}
						y={pad.top}
						width={step}
						height={plotH}
						role="presentation"
						onpointerenter={() => (hover = k)}
						onpointerleave={() => (hover = null)}
					/>
				{/each}
				<text class="axis" x={W - pad.right} y={pad.top - 1} text-anchor="end">↑ include · exclude ↓</text>
			</svg>
			<div class="labels" aria-hidden="true">
				{#each detail.states as _, k}
					<span class="lbl" style:left={`${((x(k) + step / 2) / W) * 100}%`} style:top={`${((H - pad.bottom + 10) / H) * 100}%`}>{@html tex(literalTex(k, features))}</span>
				{/each}
			</div>
			</div>
		</div>
		<p class="readout">
			{#if hover !== null}
				{@const s = detail.states[hover]}
				{@html tex(literalTex(hover, features))}: state {s},
				{s >= INCLUDE_FROM ? `include, ${s - INCLUDE_FROM + 1} steps past the boundary` : `exclude, ${INCLUDE_FROM - s} steps below the boundary`}
			{:else}
				Hover over a bar to read its automaton state.
			{/if}
		</p>
		<p class="caption">
			Each literal has its own Tsetlin automaton with {STATE_MAX + 1} states. States {INCLUDE_FROM}–{STATE_MAX} mean include.
			Bars grow away from the decision boundary, so a long bar is a confident automaton.
		</p>
	{:else}
		<p class="empty">Click any clause row to see its rule and its automaton states.</p>
	{/if}
</section>

<style>
	.detail {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}
	h2 {
		font-size: 16px;
		font-weight: 700;
	}
	h2 span {
		font-family: var(--font-body);
		font-weight: 500;
		font-size: 13px;
	}
	.pos {
		color: var(--pos);
	}
	.neg {
		color: var(--neg);
	}
	.formula {
		font-size: 18px;
		overflow-x: auto;
		padding: 6px 10px;
		background: var(--raised);
		border-radius: 7px;
		border: 1px solid var(--line);
	}
	.eval {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		font-size: 13px;
	}
	.term {
		padding: 1px 7px;
		border-radius: 5px;
		border: 1px solid var(--line);
	}
	.term.zero {
		border-color: var(--neg);
		color: var(--neg);
	}
	.term.out {
		border-color: var(--ink);
		font-weight: 600;
	}
	.term.out.zero {
		border-color: var(--neg);
	}
	.arrow {
		color: var(--muted);
	}
	.chart {
		overflow-x: auto;
	}
	.stage {
		position: relative;
		min-width: 420px;
		container-type: inline-size;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.labels {
		position: absolute;
		inset: 0;
		pointer-events: none;
		color: var(--muted);
		font-size: calc(10 * 100cqw / 520);
	}
	.lbl {
		position: absolute;
		transform: translate(-50%, 0) rotate(-60deg);
		transform-origin: 50% 50%;
		white-space: nowrap;
		line-height: 1;
	}
	.readout {
		margin: 0;
		font-size: 12px;
		min-height: 18px;
	}
	.grid {
		stroke: var(--line);
		stroke-width: 1;
	}
	.grid.boundary {
		stroke: var(--muted);
		stroke-dasharray: 3 3;
	}
	.axis {
		fill: var(--muted);
		font-family: var(--font-data);
		font-size: 9px;
	}
	rect.inc {
		fill: var(--include);
	}
	rect.exc {
		fill: color-mix(in oklab, var(--muted) 45%, var(--surface));
	}
	rect.hit {
		fill: transparent;
	}
	.caption,
	.empty {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
	}
</style>
