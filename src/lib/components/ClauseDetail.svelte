<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { INCLUDE_FROM, STATE_MAX, TYPE_IA, TYPE_IB, TYPE_II, isPositive } from '$lib/tm/machine';
	import { literalTex, tex } from '$lib/tex';
	import { BEAT } from '$lib/story';

	type Track = {
		k: number;
		state: number;
		before: number;
		after: number;
		kind: number;
		value: number;
	};

	const NEAR = 16;
	const glyph: Record<number, string> = { [TYPE_IA]: '▲', [TYPE_IB]: '▼', [TYPE_II]: '◆' };
	const kindClass: Record<number, string> = { [TYPE_IA]: 'ia', [TYPE_IB]: 'ib', [TYPE_II]: 'ii' };
	const kindName: Record<number, string> = { [TYPE_IA]: 'Type Ia', [TYPE_IB]: 'Type Ib', [TYPE_II]: 'Type II' };

	let showAll = $state(false);

	const features = $derived(lab.config.features);
	const literalCount = $derived(2 * features);
	const order = $derived(Array.from({ length: literalCount }, (_, i) => (i % 2 === 0 ? i / 2 : features + (i - 1) / 2)));

	const detail = $derived.by(() => {
		lab.version;
		const sel = lab.selected;
		if (!sel || sel.cls >= lab.config.classes || sel.clause >= lab.config.clauses) return null;
		const { cls, clause } = sel;
		const base = clause * literalCount;
		const shown = lab.states[cls];
		const current = lab.machine.states[cls];
		const f = lab.trace?.feedback.find((fb) => fb.cls === cls) ?? null;
		const tracks: Track[] = order.map((k) => ({
			k,
			state: shown[base + k],
			before: f ? f.before[base + k] : current[base + k],
			after: current[base + k],
			kind: f && lab.moved ? f.kinds[base + k] : 0,
			value: lab.inference.literals[k]
		}));
		const included = order.filter((k) => shown[base + k] >= INCLUDE_FROM);
		return {
			cls,
			clause,
			positive: isPositive(lab.machine, clause),
			tracks,
			included,
			output: lab.inference.outputs[cls][clause],
			picked: !!f && lab.beat >= BEAT.select && f.selected[clause] === 1
		};
	});

	const name = $derived(detail ? `C^{${detail.positive ? '+' : '-'}}_{${detail.clause + 1}}` : '');

	const formula = $derived.by(() => {
		if (!detail) return '';
		const body = detail.included.length ? detail.included.map((k) => literalTex(k, features)).join(' \\land ') : '\\text{empty}';
		return tex(`${name} = ${body}`);
	});

	const visible = $derived(
		detail ? detail.tracks.filter((t) => showAll || t.kind || t.state >= INCLUDE_FROM - NEAR) : []
	);

	const moves = $derived(detail ? detail.tracks.filter((t) => t.kind).length : 0);

	const position = (state: number) => `${(state / STATE_MAX) * 100}%`;

	function change(t: Track) {
		if (!t.kind) return '';
		const crossedIn = t.before < INCLUDE_FROM && t.after >= INCLUDE_FROM;
		const crossedOut = t.before >= INCLUDE_FROM && t.after < INCLUDE_FROM;
		const note = crossedIn ? ' · now included' : crossedOut ? ' · now excluded' : '';
		return `${t.before} → ${t.after}${note}`;
	}
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
				{#each detail.included as k}
					<span class="term" class:zero={!lab.inference.literals[k]}>{@html tex(`${literalTex(k, features)} = ${lab.inference.literals[k]}`)}</span>
				{/each}
				<span class="arrow">→</span>
				<span class="term out" class:zero={!detail.output}>{@html tex(`${name} = ${detail.output}`)}</span>
			{/if}
		</p>

		<div class="trackhead">
			<p class="eyebrow">Tsetlin automata</p>
			<div class="filter" role="group" aria-label="Which automata to show">
				<button class:on={!showAll} onclick={() => (showAll = false)}>Near or above the boundary</button>
				<button class:on={showAll} onclick={() => (showAll = true)}>All {literalCount}</button>
			</div>
		</div>

		<div class="scale" aria-hidden="true">
			<span></span>
			<span class="ruler mono">
				<span style:left="0">0</span>
				<span class="mark" style:left={position(INCLUDE_FROM)}>{INCLUDE_FROM}</span>
				<span class="end">{STATE_MAX}</span>
			</span>
		</div>
		<ul class="tracks">
			{#each visible as t (t.k)}
				{@const included = t.state >= INCLUDE_FROM}
				<li class:active={t.kind !== 0}>
					<span class="lit">{@html tex(literalTex(t.k, features))}</span>
					<span class="val mono" class:one={t.value}>{t.value}</span>
					<span class="track" title="state {t.state} of {STATE_MAX}">
						<span class="line"></span>
						<span class="boundary" style:left={position(INCLUDE_FROM - 0.5)}></span>
						{#if t.kind}
							<span class="ghost" style:left={position(t.before)}></span>
						{/if}
						<span class="bead" class:included style:left={position(t.state)}></span>
						{#if t.kind}
							<span class="kind {kindClass[t.kind]}" style:left={position(t.state)}>{glyph[t.kind]}</span>
						{/if}
					</span>
					{#if t.kind}
						<span class="note mono" class:cross={change(t).includes('now')}>
							<span class={kindClass[t.kind]}>{kindName[t.kind]}</span> {change(t)}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="caption">
			{#if lab.trace && lab.moved}
				{moves
					? `${moves} automata moved one state each. A move only changes the rule when an automaton crosses the boundary.`
					: 'No automaton in this clause moved on this step.'}
			{:else if lab.trace}
				{detail.picked ? 'This clause was picked for feedback. Watch its automata move in the next beat.' : 'States before the update.'}
			{:else}
				Each literal has its own automaton with {STATE_MAX + 1} states. States {INCLUDE_FROM} to {STATE_MAX} mean include.
			{/if}
		</p>
	{:else}
		<p class="empty">Click a gate in the circuit to see its rule and its automata.</p>
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
	.trackhead {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 4px;
	}
	.filter {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 7px;
		overflow: hidden;
	}
	.filter button {
		border: 0;
		background: var(--surface);
		padding: 3px 9px;
		font-size: 11px;
		cursor: pointer;
		color: var(--muted);
	}
	.filter button.on {
		background: var(--ink);
		color: var(--surface);
	}
	.scale {
		display: grid;
		grid-template-columns: 74px 1fr;
		gap: 8px;
		padding: 0 4px;
	}
	.ruler {
		position: relative;
		height: 14px;
		font-size: 10px;
		color: var(--muted);
	}
	.ruler span {
		position: absolute;
		top: 0;
	}
	.ruler .mark {
		transform: translateX(-50%);
	}
	.ruler .end {
		right: 0;
	}
	.tracks {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	li {
		display: grid;
		grid-template-columns: 44px 22px minmax(80px, 1fr);
		column-gap: 8px;
		align-items: center;
		min-height: 22px;
		padding: 0 4px;
		border-radius: 5px;
	}
	li.active {
		background: var(--raised);
	}
	.lit {
		font-size: 12px;
		text-align: right;
	}
	.val {
		width: 20px;
		height: 16px;
		border-radius: 4px;
		border: 1px solid var(--line);
		display: grid;
		place-items: center;
		font-size: 10px;
		color: var(--muted);
	}
	.val.one {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--surface);
	}
	.track {
		position: relative;
		height: 18px;
	}
	.line {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 2px;
		margin-top: -1px;
		background: var(--line);
		border-radius: 1px;
	}
	.boundary {
		position: absolute;
		top: 1px;
		bottom: 1px;
		width: 0;
		border-left: 1.5px dashed var(--muted);
	}
	.bead,
	.ghost {
		position: absolute;
		top: 50%;
		width: 11px;
		height: 11px;
		margin: -5.5px 0 0 -5.5px;
		border-radius: 50%;
		transition: left 0.7s cubic-bezier(0.3, 1.4, 0.5, 1);
	}
	.bead {
		background: var(--surface);
		border: 2px solid var(--muted);
	}
	.bead.included {
		background: var(--ink);
		border-color: var(--ink);
	}
	.ghost {
		border: 1.5px dashed var(--muted);
		opacity: 0.6;
		transition: none;
	}
	.kind {
		position: absolute;
		top: -3px;
		margin-left: 7px;
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		transition: left 0.7s;
		animation: pop 0.5s ease-out;
	}
	@keyframes pop {
		from {
			transform: scale(2.4);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	.ia {
		color: var(--type-ia);
	}
	.ib {
		color: var(--type-ib);
	}
	.ii {
		color: var(--type-ii);
	}
	.note {
		grid-column: 3;
		font-size: 11px;
		color: var(--muted);
		padding-bottom: 3px;
	}
	.note.cross {
		color: var(--accent);
		font-weight: 500;
	}
	.caption,
	.empty {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
	}
</style>
