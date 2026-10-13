<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import {
		INCLUDE_FROM,
		STATE_MAX,
		TYPE_IA,
		TYPE_IB,
		TYPE_II,
		literalName,
		isPositive
	} from '$lib/tm/machine';
	import { CLASS_NAMES } from '$lib/labels';
	import { gsap } from 'gsap';
	import ViewSwitch from './ViewSwitch.svelte';
	import { literalTex, rich, tex } from '$lib/tex';

	let view = $state<'before' | 'after'>('before');
	let root: HTMLElement;

	$effect(() => {
		if (!lab.trace || !root) return;
		view = 'before';
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const marks = root.querySelectorAll('.cell .kind');
		gsap.fromTo(marks, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.003, ease: 'back.out(2)' });
	});

	const features = $derived(lab.config.features);
	const literalCount = $derived(2 * features);
	const literalIndices = $derived(Array.from({ length: literalCount }, (_, k) => k));
	const clauseIndices = $derived(Array.from({ length: lab.config.clauses }, (_, j) => j));
	const classIndices = $derived(Array.from({ length: lab.config.classes }, (_, c) => c));

	const feedbackFor = (cls: number) => lab.trace?.feedback.find((f) => f.cls === cls) ?? null;

	function stateOf(cls: number, clause: number, k: number) {
		lab.version;
		const f = feedbackFor(cls);
		const states = f && view === 'before' ? f.before : lab.machine.states[cls];
		return states[clause * literalCount + k];
	}

	function outputOf(cls: number, clause: number) {
		const f = feedbackFor(cls);
		return f ? f.outputs[clause] : lab.inference.outputs[cls]?.[clause] ?? 0;
	}

	function literalValue(k: number) {
		return lab.trace ? lab.trace.literals[k] : lab.inference.literals[k];
	}

	function fill(state: number) {
		if (state >= INCLUDE_FROM) {
			const depth = (state - INCLUDE_FROM) / (STATE_MAX - INCLUDE_FROM);
			return `color-mix(in oklab, var(--include) ${Math.round(45 + 55 * depth)}%, var(--surface))`;
		}
		const depth = state / (INCLUDE_FROM - 1);
		return `color-mix(in oklab, var(--muted) ${Math.round(4 + 26 * depth)}%, var(--surface))`;
	}

	const glyph: Record<number, string> = { [TYPE_IA]: '▲', [TYPE_IB]: '▼', [TYPE_II]: '◆' };
	const kindClass: Record<number, string> = { [TYPE_IA]: 'ia', [TYPE_IB]: 'ib', [TYPE_II]: 'ii' };

	function describe(cls: number, clause: number, k: number) {
		const state = stateOf(cls, clause, k);
		const action = state >= INCLUDE_FROM ? 'include' : 'exclude';
		const sign = isPositive(lab.machine, clause) ? '+' : '−';
		return `Class ${cls}, clause ${clause + 1} (${sign}), literal ${literalName(k, features)}: state ${state} of ${STATE_MAX}, ${action}`;
	}
</script>

<section bind:this={root} class="panel banks" data-region="bank" class:spotlight={lab.region === 'bank'}>
	<header class="head">
		<div>
			<p class="eyebrow">Clauses</p>
			<h2>Tsetlin automata decide which literals each clause uses</h2>
		</div>
		<div class="headtools">
		<ViewSwitch />
		{#if lab.trace}
			<div class="view" role="group" aria-label="Which TA states to show">
				<button class:on={view === 'before'} onclick={() => (view = 'before')}>Before update</button>
				<button class:on={view === 'after'} onclick={() => (view = 'after')}>After update</button>
			</div>
		{/if}
		</div>
	</header>

	<div class="scroll">
		<div class="grid" style:--n={features}>
			<div class="corner"></div>
			<div class="literals" data-region="literals" class:spotlight={lab.region === 'literals'}>
				{#each literalIndices as k}
					<div class="lit" class:negated={k >= features} class:gap={k === features}>
						<span class="name">{@html tex(literalTex(k, features))}</span>
						<span class="value mono" class:one={literalValue(k)}>{literalValue(k)}</span>
					</div>
				{/each}
			</div>
			<div class="colhead eyebrow">out</div>
			<div class="colhead eyebrow">vote</div>

			{#each classIndices as c}
				<div class="classrow">
					<span class="eyebrow">Class {c}</span>
					<span class="classname">{@html rich(CLASS_NAMES[c])}</span>
					{#if feedbackFor(c)}
						{@const f = feedbackFor(c)!}
						<span class="role mono" class:target={f.role === 'target'}>
							{f.role === 'target' ? 'target class' : 'sampled negative class'} · {@html tex(`p = ${f.probability.toFixed(2)}`)}
						</span>
					{/if}
				</div>
				{#each clauseIndices as j}
					{@const positive = isPositive(lab.machine, j)}
					{@const f = feedbackFor(c)}
					{@const picked = !f || f.selected[j] === 1}
					{@const out = outputOf(c, j)}
					{@const isSelected = lab.selected?.cls === c && lab.selected?.clause === j}
					<button
						class="sign mono"
						class:pos={positive}
						class:neg={!positive}
						class:dim={!picked}
						class:chosen={isSelected}
						onclick={() => lab.select(c, j)}
						aria-label="Inspect class {c} clause {j + 1}"
					>
						{@html tex(`C^{${positive ? '+' : '-'}}_{${j + 1}}`)}
					</button>
					<div class="cells" class:dim={!picked} class:chosen={isSelected}>
						{#each literalIndices as k}
							{@const state = stateOf(c, j, k)}
							{@const kind = f ? f.kinds[j * literalCount + k] : 0}
							{@const blocking = state >= INCLUDE_FROM && !literalValue(k)}
							<button
								class="cell"
								class:gap={k === features}
								class:included={state >= INCLUDE_FROM}
								class:blocking
								style:background={fill(state)}
								title={describe(c, j, k)}
								aria-label={describe(c, j, k)}
								onclick={() => lab.select(c, j)}
							>
								{#if kind}
									<span class="kind {kindClass[kind]}">{glyph[kind]}</span>
								{/if}
							</button>
						{/each}
					</div>
					<div class="out" class:dim={!picked}>
						<span class="dot" class:on={out === 1} aria-label="clause output {out}"></span>
					</div>
					<div class="vote mono" class:dim={!picked}>
						{#if f}
							{@const typeOne = positive === (f.role === 'target')}
							<span
								class="fb"
								class:t1={f.selected[j] && typeOne}
								class:t2={f.selected[j] && !typeOne}
								class:idle={f.selected[j] && !typeOne && !f.outputs[j]}
								title={f.selected[j] && !typeOne && !f.outputs[j] ? 'Type II picked this clause, but it has no effect because the clause outputs 0' : undefined}
							>
								{f.selected[j] ? (typeOne ? 'I' : 'II') : '·'}
							</span>
						{:else}
							<span class:pos={out && positive} class:neg={out && !positive}>
								{out ? (positive ? '+1' : '−1') : '0'}
							</span>
						{/if}
					</div>
				{/each}
			{/each}
		</div>
	</div>

	<footer class="legend">
		<span class="key"><i style:background={fill(20)}></i><i style:background={fill(120)}></i> exclude (deep → near boundary)</span>
		<span class="key"><i style:background={fill(135)}></i><i style:background={fill(250)}></i> include (just over → confident)</span>
		<span class="key"><i class="ring"></i> included literal that is 0 blocks the clause</span>
		{#if lab.trace}
			<span class="key"><b class="ia">▲</b> Type Ia: towards include</span>
			<span class="key"><b class="ib">▼</b> Type Ib: towards exclude</span>
			<span class="key"><b class="ii">◆</b> Type II: include a 0-literal</span>
			<span class="key"><span class="fb t2 idle mono">II</span> picked, but the clause outputs 0, so Type II does nothing</span>
		{/if}
	</footer>
</section>

<style>
	.banks {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
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
		font-weight: 700;
	}
	.headtools {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.view {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 7px;
		overflow: hidden;
	}
	.view button {
		border: 0;
		background: var(--surface);
		padding: 4px 10px;
		cursor: pointer;
		font-size: 12px;
	}
	.view button.on {
		background: var(--ink);
		color: var(--surface);
	}
	.scroll {
		overflow-x: auto;
		padding-bottom: 4px;
	}
	.grid {
		display: grid;
		grid-template-columns: 44px auto 34px 40px;
		column-gap: 10px;
		row-gap: 3px;
		align-items: center;
		width: max-content;
	}
	.literals,
	.cells {
		display: flex;
		gap: 2px;
	}
	.lit,
	.cell {
		width: var(--cell);
		flex: none;
	}
	.gap {
		margin-left: 8px;
	}
	.lit {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding-bottom: 4px;
	}
	.lit .name {
		font-size: 11px;
		color: var(--muted);
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.lit .name :global(.katex) {
		display: inline-block;
		transform: rotate(-90deg);
		white-space: nowrap;
	}
	.lit.negated .name {
		color: color-mix(in oklab, var(--muted) 80%, var(--ink));
	}
	.lit .value {
		width: var(--cell);
		height: 18px;
		border-radius: 4px;
		display: grid;
		place-items: center;
		font-size: 11px;
		border: 1px solid var(--line);
		color: var(--muted);
	}
	.lit .value.one {
		background: var(--ink);
		color: var(--surface);
		border-color: var(--ink);
	}
	.colhead {
		text-align: center;
		align-self: end;
		padding-bottom: 6px;
	}
	.classrow {
		grid-column: 1 / -1;
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 10px 0 4px;
		border-top: 1px solid var(--line);
		flex-wrap: wrap;
	}
	.classname {
		font-weight: 600;
	}
	.role {
		font-size: 12px;
		padding: 1px 8px;
		border-radius: 999px;
		border: 1px solid var(--line);
		color: var(--muted);
	}
	.role.target {
		color: var(--ink);
		border-color: var(--ink);
	}
	.sign {
		height: var(--cell);
		border-radius: 5px;
		border: 1px solid var(--line);
		background: var(--surface);
		cursor: pointer;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
		font-size: 13px;
	}
	.sign.pos {
		color: var(--pos);
	}
	.sign.neg {
		color: var(--neg);
	}
	.sign.chosen {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.cells.chosen {
		outline: 1.5px solid var(--ink);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.cell {
		height: var(--cell);
		border-radius: 4px;
		border: 0;
		padding: 0;
		cursor: pointer;
		position: relative;
		display: grid;
		place-items: center;
		transition: background 0.2s;
	}
	.cell.blocking {
		box-shadow: inset 0 0 0 2px var(--neg);
	}
	.kind {
		font-size: 11px;
		line-height: 1;
		font-weight: 700;
		text-shadow: 0 0 2px var(--surface), 0 0 2px var(--surface);
	}
	.ia {
		color: var(--type-ia);
	}
	.cell.included .kind.ia {
		color: var(--surface);
		text-shadow: none;
	}
	.ib {
		color: var(--type-ib);
	}
	.ii {
		color: var(--type-ii);
	}
	.dim {
		opacity: 0.35;
	}
	.out {
		display: grid;
		place-items: center;
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.5px solid var(--muted);
	}
	.dot.on {
		background: var(--ink);
		border-color: var(--ink);
	}
	.vote {
		text-align: center;
		font-size: 12px;
		color: var(--muted);
	}
	.vote .pos {
		color: var(--pos);
		font-weight: 600;
	}
	.vote .neg {
		color: var(--neg);
		font-weight: 600;
	}
	.fb.t1,
	.fb.t2 {
		display: inline-block;
		min-width: 24px;
		padding: 0 4px;
		border-radius: 4px;
		border: 1px solid var(--ink);
		color: var(--ink);
		font-weight: 600;
	}
	.fb.idle {
		border-style: dashed;
		color: var(--muted);
		border-color: var(--muted);
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
		gap: 4px;
	}
	.key i {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		display: inline-block;
	}
	.key i.ring {
		box-shadow: inset 0 0 0 2px var(--neg);
		background: color-mix(in oklab, var(--include) 70%, var(--surface));
	}
</style>
