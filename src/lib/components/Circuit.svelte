<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { gsap } from 'gsap';
	import { lab } from '$lib/lab.svelte';
	import { INCLUDE_FROM, STATE_MAX, isPositive } from '$lib/tm/machine';
	import { BEAT } from '$lib/story';
	import { literalTex, rich, tex } from '$lib/tex';
	import ViewSwitch from './ViewSwitch.svelte';

	type Gate = { c: number; j: number };
	type Wire = { key: string; c: number; j: number; k: number; d: string; conf: number; active: boolean; moved: boolean; born: boolean };

	const GHOST_FROM = INCLUDE_FROM - 32;
	const W = 780;
	const TOP = 44;
	const BOTTOM = 16;
	const PITCH = 24;
	const CLASS_GAP = 44;
	const PORT_X = 96;
	const WIRE_X = 136;
	const GATE_X = 470;
	const GATE_W = 38;
	const GATE_H = 18;
	const SUM_X = 616;
	const SUM_R = 20;
	const PRED_X = 680;
	const PRED_W = 92;

	let root: HTMLElement;
	let hover = $state<Gate | null>(null);
	let firingOnly = $state(false);

	const F = $derived(lab.config.features);
	const L = $derived(2 * F);
	const n = $derived(lab.config.clauses);
	const C = $derived(lab.config.classes);

	const gatesSpan = $derived(C * n * PITCH + (C - 1) * CLASS_GAP);
	const portsSpan = $derived(Math.max(gatesSpan, L * 18));
	const H = $derived(TOP + portsSpan + BOTTOM);
	const gateTop = $derived(TOP + (portsSpan - gatesSpan) / 2);
	const portPitch = $derived(portsSpan / L);

	const portIndex = (k: number) => 2 * (k % F) + (k >= F ? 1 : 0);
	const portY = (k: number) => TOP + (portIndex(k) + 0.5) * portPitch;
	const gateY = (c: number, j: number) => gateTop + c * (n * PITCH + CLASS_GAP) + j * PITCH + PITCH / 2;
	const classTop = (c: number) => gateTop + c * (n * PITCH + CLASS_GAP);
	const sumY = (c: number) => classTop(c) + (n * PITCH) / 2;
	const predY = $derived((sumY(0) + sumY(C - 1)) / 2);

	const literals = $derived(lab.inference.literals);
	const outputs = $derived(lab.inference.outputs);

	function curve(x1: number, y1: number, x2: number, y2: number) {
		const mx = (x1 + x2) / 2;
		return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
	}

	const feedbackFor = (c: number) => lab.trace?.feedback.find((f) => f.cls === c) ?? null;
	const shown = (beat: number) => !!lab.trace && lab.beat >= beat;

	const wires = $derived.by(() => {
		lab.version;
		const list: Wire[] = [];
		for (let c = 0; c < C; c++) {
			const states = lab.states[c];
			const f = lab.moved ? feedbackFor(c) : null;
			for (let j = 0; j < n; j++) {
				const included: number[] = [];
				for (let k = 0; k < L; k++) if (states[j * L + k] >= INCLUDE_FROM) included.push(k);
				included.sort((a, b) => portIndex(a) - portIndex(b));
				const spread = Math.min(3, (GATE_H - 4) / Math.max(1, included.length - 1));
				included.forEach((k, i) => {
					const s = states[j * L + k];
					const offset = (i - (included.length - 1) / 2) * spread;
					list.push({
						key: `${c}-${j}-${k}`,
						c,
						j,
						k,
						d: curve(WIRE_X, portY(k), GATE_X, gateY(c, j) + offset),
						conf: (s - INCLUDE_FROM) / (STATE_MAX - INCLUDE_FROM),
						active: literals[k] === 1,
						moved: !!f && f.kinds[j * L + k] !== 0,
						born: !!f && f.before[j * L + k] < INCLUDE_FROM
					});
				});
			}
		}
		return list;
	});

	const shownWires = $derived(
		firingOnly ? wires.filter((w) => outputs[w.c]?.[w.j] === 1 || (hover?.c === w.c && hover?.j === w.j)) : wires
	);

	const dying = $derived.by(() => {
		lab.version;
		const list: { key: string; d: string }[] = [];
		if (!lab.moved) return list;
		for (const f of lab.trace?.feedback ?? []) {
			const states = lab.machine.states[f.cls];
			for (let j = 0; j < n; j++) {
				for (let k = 0; k < L; k++) {
					const i = j * L + k;
					if (f.before[i] >= INCLUDE_FROM && states[i] < INCLUDE_FROM) {
						list.push({ key: `d-${f.cls}-${j}-${k}`, d: curve(WIRE_X, portY(k), GATE_X, gateY(f.cls, j)) });
					}
				}
			}
		}
		return list;
	});

	const focused = $derived<Gate | null>(hover ?? (lab.selected ? { c: lab.selected.cls, j: lab.selected.clause } : null));

	const ghosts = $derived.by(() => {
		lab.version;
		if (!hover) return [];
		const { c, j } = hover;
		const states = lab.states[c];
		const list: { key: string; d: string }[] = [];
		for (let k = 0; k < L; k++) {
			const s = states[j * L + k];
			if (s >= GHOST_FROM && s < INCLUDE_FROM) list.push({ key: `g-${k}`, d: curve(WIRE_X, portY(k), GATE_X, gateY(c, j)) });
		}
		return list;
	});

	const isFocused = (c: number, j: number) => !hover || (hover.c === c && hover.j === j);

	function gatePath(c: number, j: number) {
		const y = gateY(c, j);
		const r = GATE_H / 2;
		const x = GATE_X;
		const flat = GATE_W - r;
		return `M${x},${y - r} H${x + flat} A${r},${r} 0 0 1 ${x + flat},${y + r} H${x} Z`;
	}

	const gateTex = (j: number) => `C^{${isPositive(lab.machine, j) ? '+' : '-'}}_{${j + 1}}`;

	function rule(c: number, j: number) {
		lab.version;
		const states = lab.states[c];
		const terms: string[] = [];
		for (let k = 0; k < L; k++) if (states[j * L + k] >= INCLUDE_FROM) terms.push(literalTex(k, F));
		return `${gateTex(j)} = ${terms.length ? terms.join(' \\land ') : '\\text{empty}'}`;
	}

	const info = $derived.by(() => {
		if (!focused) return null;
		const { c, j } = focused;
		const positive = isPositive(lab.machine, j);
		return {
			title: `Class ${c}, clause ${j + 1}, ${positive ? 'votes for' : 'votes against'}`,
			rule: rule(c, j),
			name: gateTex(j),
			output: outputs[c]?.[j] ?? 0,
			positive
		};
	});

	function onKey(event: KeyboardEvent, c: number, j: number) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		lab.select(c, j);
	}

	const px = (x: number) => `${(x / W) * 100}%`;
	const py = (y: number) => `${(y / H) * 100}%`;

	function reduced() {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function pulse() {
		if (!root || reduced()) return;
		const stages = ['.pulse.s1', '.pulse.s2', '.pulse.s3'].map((s) => root.querySelectorAll(s));
		gsap.killTweensOf(stages.flatMap((s) => Array.from(s)));
		stages.forEach((nodes, i) => {
			if (!nodes.length) return;
			gsap.fromTo(
				nodes,
				{ strokeDashoffset: 0.3, opacity: 1 },
				{ strokeDashoffset: -1, opacity: 1, duration: 0.6, delay: i * 0.45, ease: 'power1.inOut', stagger: 0.003, onComplete: () => gsap.set(nodes, { opacity: 0 }) }
			);
		});
	}

	function flashFeedback() {
		if (!root || reduced()) return;
		const born = root.querySelectorAll('.wire.born');
		const moved = root.querySelectorAll('.wire.moved');
		const dead = root.querySelectorAll('.wire.dying');
		if (born.length) gsap.fromTo(born, { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' });
		if (moved.length) gsap.fromTo(moved, { strokeWidth: 4 }, { strokeWidth: (_i: number, el: SVGPathElement) => Number(el.dataset.width ?? 1.5), duration: 0.6, clearProps: 'strokeWidth' });
		if (dead.length) gsap.fromTo(dead, { opacity: 0.9 }, { opacity: 0.25, duration: 1.2 });
	}

	$effect(() => {
		lab.input;
		if (untrack(() => lab.playing || lab.trace)) return;
		tick().then(pulse);
	});

	$effect(() => {
		if (!lab.moved) return;
		tick().then(flashFeedback);
	});
</script>

<section bind:this={root} class="panel circuit" data-region="bank" class:spotlight={lab.region === 'bank'}>
	<header class="head">
		<div>
			<p class="eyebrow">Clauses as a circuit</p>
			<h2>Each clause is an AND gate wired to the literals it includes</h2>
		</div>
		<div class="tools">
			<div class="filter" role="group" aria-label="Which wires to show">
				<button class:on={!firingOnly} onclick={() => (firingOnly = false)}>All wires</button>
				<button class:on={firingOnly} onclick={() => (firingOnly = true)}>Firing clauses</button>
			</div>
			<ViewSwitch />
		</div>
	</header>

	<div class="info" aria-live="polite">
		{#if info}
			<span class="who">{info.title}</span>
			<span class="rule">{@html tex(info.rule)}</span>
			<span class="out" class:on={info.output}>{@html tex(`${info.name} = ${info.output}`)}</span>
			<span class="hint">Dashed grey wires are literals close to being included.</span>
		{:else}
			<span class="hint">Hover over a gate to trace its wires. Click a gate to open it in the clause inspector.</span>
		{/if}
	</div>

	<div class="scroll">
		<div class="stage">
		<svg viewBox="0 0 {W} {H}" role="img" aria-label="Tsetlin Machine drawn as a logic circuit" data-region="literals" class:spotlight={lab.region === 'literals'}>
			<text class="colhead" x="4" y="16">input</text>
			<text class="colhead" x={PORT_X - 6} y="16">literals</text>
			<text class="colhead" x={GATE_X} y="16">clauses</text>
			<text class="colhead" x={SUM_X} y="16" text-anchor="middle">votes</text>
			<text class="colhead" x={PRED_X + PRED_W / 2} y="16" text-anchor="middle">prediction</text>

			{#each Array.from({ length: F }, (_, f) => f) as f}
				{@const yx = portY(f)}
				{@const yn = portY(f + F)}
				{@const y = (yx + yn) / 2}
				{@const h = Math.min(26, yn - yx + portPitch - 4)}
				{@const on = lab.input[f] === 1}
				<g class="bit" class:on>
					<rect x="28" y={y - h / 2} width="26" height={h} rx="5" />
					<text class="bitval" x="41" y={y + 4} text-anchor="middle">{lab.input[f]}</text>
					<path class="stub" class:hot={literals[f] === 1} d="M54,{y} C{PORT_X - 20},{y} {PORT_X - 24},{yx} {PORT_X - 5},{yx}" />
					<path class="stub" class:hot={literals[f + F] === 1} d="M54,{y} C{PORT_X - 30},{y} {PORT_X - 34},{yn} {PORT_X - 16},{yn} H{PORT_X - 5}" />
					<circle class="inverter" cx={PORT_X - 13} cy={yn} r="2.6" />
				</g>
			{/each}

			{#each Array.from({ length: L }, (_, k) => k) as k}
				<circle class="port" class:on={literals[k] === 1} cx={PORT_X} cy={portY(k)} r="4.5" />
			{/each}

			<g class="wires">
				{#each dying as w (w.key)}
					<path class="wire dying" d={w.d} />
				{/each}
				{#each ghosts as g (g.key)}
					<path class="wire ghost" d={g.d} />
				{/each}
				{#each shownWires as w (w.key)}
					{@const width = 1 + 2.4 * w.conf}
					<path
						class="wire"
						class:active={w.active}
						class:blocking={!w.active}
						class:moved={w.moved}
						class:born={w.born}
						class:faded={!isFocused(w.c, w.j)}
						data-width={width}
						d={w.d}
						stroke-width={width}
						stroke-opacity={w.active ? 0.3 + 0.65 * w.conf : 0.25 + 0.65 * w.conf}
						pathLength="1"
					/>
				{/each}
				{#each shownWires.filter((w) => w.active) as w (w.key)}
					<path class="pulse s1" d={w.d} pathLength="1" />
				{/each}
			</g>

			{#each Array.from({ length: C }, (_, c) => c) as c}
				{@const f = feedbackFor(c)}

				{#each Array.from({ length: n }, (_, j) => j) as j}
					{@const y = gateY(c, j)}
					{@const out = outputs[c]?.[j] ?? 0}
					{@const positive = isPositive(lab.machine, j)}
					{@const outPath = curve(GATE_X + GATE_W, y, SUM_X - SUM_R, sumY(c))}
					<path class="outwire" class:pos={out && positive} class:neg={out && !positive} class:faded={!isFocused(c, j)} d={outPath} />
					{#if out}
						<path class="pulse s2" d={outPath} pathLength="1" />
					{/if}
				{/each}

				{#each Array.from({ length: n }, (_, j) => j) as j}
					{@const y = gateY(c, j)}
					{@const out = outputs[c]?.[j] ?? 0}
					{@const positive = isPositive(lab.machine, j)}
					{@const empty = !wires.some((w) => w.c === c && w.j === j)}
					{@const selected = lab.selected?.cls === c && lab.selected?.clause === j}
					{@const typeOne = f ? positive === (f.role === 'target') : false}
					<g
						class="gate"
						class:on={out === 1}
						class:empty
						class:selected
						class:faded={!isFocused(c, j)}
						role="button"
						tabindex="0"
						aria-label="Class {c} clause {j + 1}, {positive ? 'positive' : 'negative'}, output {out}"
						onpointerenter={() => (hover = { c, j })}
						onpointerleave={() => (hover = null)}
						onfocus={() => (hover = { c, j })}
						onblur={() => (hover = null)}
						onclick={() => lab.select(c, j)}
						onkeydown={(e) => onKey(e, c, j)}
					>
						<path class="body" d={gatePath(c, j)} />
					</g>
					{#if shown(BEAT.select) && f?.selected[j]}
						<g class="tag" class:idle={!typeOne && !f.outputs[j]}>
							<rect x={GATE_X + GATE_W + 6} y={y - 8} width={typeOne ? 14 : 18} height="16" rx="3" />
							<text x={GATE_X + GATE_W + 6 + (typeOne ? 7 : 9)} y={y + 4} text-anchor="middle">{typeOne ? 'I' : 'II'}</text>
						</g>
					{/if}
				{/each}

				{@const v = lab.inference.sums[c]}
				{@const raw = lab.inference.votes[c]}
				<g class="sum" class:pos={v > 0} class:neg={v < 0}>
					<circle cx={SUM_X} cy={sumY(c)} r={SUM_R} />
					<text class="sumval" x={SUM_X} y={sumY(c) + 5} text-anchor="middle">{v > 0 ? '+' : ''}{v}</text>
					{#if raw !== v}
						<text class="sumlabel" x={SUM_X} y={sumY(c) + SUM_R + 13} text-anchor="middle">clipped from {raw}</text>
					{/if}
				</g>
				{@const predPath = curve(SUM_X + SUM_R, sumY(c), PRED_X, predY)}
				<path class="predwire" class:win={lab.inference.prediction === c} d={predPath} />
				{#if lab.inference.prediction === c}
					<path class="pulse s3" d={predPath} pathLength="1" />
				{/if}
			{/each}

			<g class="pred">
				<rect x={PRED_X} y={predY - 26} width={PRED_W} height="52" rx="8" />
				<text class="predcls" x={PRED_X + PRED_W / 2} y={predY - 4} text-anchor="middle">Class {lab.inference.prediction}</text>
			</g>
		</svg>
		<div class="labels" aria-hidden="true">
			{#each Array.from({ length: F }, (_, f) => f) as f}
				<span class="lbl right" style:left={px(22)} style:top={py((portY(f) + portY(f + F)) / 2)}>{@html tex(`x_{${f + 1}}`)}</span>
			{/each}
			{#each Array.from({ length: L }, (_, k) => k) as k}
				<span class="lbl left small" style:left={px(PORT_X + 9)} style:top={py(portY(k))}>{@html tex(literalTex(k, F))}</span>
			{/each}
			{#each Array.from({ length: C }, (_, c) => c) as c}
				{@const f = feedbackFor(c)}
				<span class="lbl left above classname" style:left={px(GATE_X)} style:top={py(classTop(c) - 6)}>
					{@html rich(`Class ${c} · $${lab.dataset.classTex[c]}$`)}
					{#if f && shown(BEAT.probability)}<span class="role" class:target={f.role === 'target'}>{f.role === 'target' ? 'target' : 'negative'} · {@html tex(`p = ${f.probability.toFixed(2)}`)}</span>{/if}
				</span>
				{#each Array.from({ length: n }, (_, j) => j) as j}
					{@const positive = isPositive(lab.machine, j)}
					<span
						class="lbl centre gatename"
						class:pos={positive}
						class:neg={!positive}
						class:on={(outputs[c]?.[j] ?? 0) === 1}
						class:faded={!isFocused(c, j)}
						style:left={px(GATE_X + GATE_W / 2 - 3)}
						style:top={py(gateY(c, j))}>{@html tex(gateTex(j))}</span
					>
				{/each}
				<span class="lbl centre above small" style:left={px(SUM_X)} style:top={py(sumY(c) - SUM_R - 3)}>{@html tex(`v_{${c}}`)}</span>
			{/each}
			<span class="lbl centre predname" style:left={px(PRED_X + PRED_W / 2)} style:top={py(predY + 13)}>{@html tex(lab.dataset.classTex[lab.inference.prediction])}</span>
		</div>
		</div>
	</div>

	<footer class="legend">
		<span class="key"><svg width="26" height="10"><path class="wire active" d="M1,5 H25" stroke-width="3" /></svg> included literal, value 1</span>
		<span class="key"><svg width="26" height="10"><path class="wire blocking" d="M1,5 H25" stroke-width="2" /></svg> included literal, value 0: blocks the gate</span>
		<span class="key">thicker wire = more confident automaton</span>
		<span class="key"><svg width="26" height="10"><path class="outwire pos" d="M1,5 H25" /></svg> votes for</span>
		<span class="key"><svg width="26" height="10"><path class="outwire neg" d="M1,5 H25" /></svg> votes against</span>
		{#if lab.trace}
			<span class="key"><span class="chip mono">I</span><span class="chip mono">II</span> clauses picked for feedback. Switch to the automata matrix to see each automaton move.</span>
		{/if}
	</footer>
</section>

<style>
	.circuit {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}
	.tools {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
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
	.info {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		align-items: baseline;
		min-height: 24px;
		font-size: 13px;
	}
	.who {
		font-weight: 600;
	}
	.rule {
		color: var(--ink);
	}
	.out {
		padding: 0 6px;
		border-radius: 4px;
		border: 1px solid var(--line);
		color: var(--muted);
	}
	.out.on {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--surface);
	}
	.hint {
		color: var(--muted);
	}
	.scroll {
		overflow-x: auto;
	}
	.stage {
		position: relative;
		min-width: 640px;
		container-type: inline-size;
	}
	.labels {
		position: absolute;
		inset: 0;
		pointer-events: none;
		--u: calc(100cqw / 780);
		font-size: calc(12 * var(--u));
		color: var(--muted);
	}
	.lbl {
		position: absolute;
		white-space: nowrap;
		line-height: 1;
		transition: opacity 0.2s;
	}
	.lbl.left {
		transform: translate(0, -50%);
	}
	.lbl.right {
		transform: translate(-100%, -50%);
	}
	.lbl.centre {
		transform: translate(-50%, -50%);
	}
	.lbl.above {
		transform: translate(0, -100%);
	}
	.lbl.centre.above {
		transform: translate(-50%, -100%);
	}
	.lbl.small {
		font-size: calc(10.5 * var(--u));
	}
	.classname {
		color: var(--ink);
		font-family: var(--font-body);
		font-weight: 600;
		font-size: calc(12.5 * var(--u));
		background: var(--surface);
		padding: 0 4px 2px 0;
		display: inline-flex;
		align-items: baseline;
		gap: calc(8 * var(--u));
	}
	.classname .role {
		font-weight: 400;
		font-size: calc(10.5 * var(--u));
		color: var(--muted);
	}
	.classname .role.target {
		color: var(--ink);
	}
	.gatename {
		font-size: calc(10.5 * var(--u));
		font-weight: 600;
	}
	.gatename.pos {
		color: var(--pos);
	}
	.gatename.neg {
		color: var(--neg);
	}
	.gatename.on {
		color: var(--surface);
	}
	.predname {
		color: #ffffff;
		font-size: calc(11 * var(--u));
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 8px;
	}
	text {
		font-family: var(--font-data);
		fill: var(--muted);
	}
	.colhead {
		font-family: var(--font-body);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.bit rect {
		fill: var(--surface);
		stroke: var(--line);
	}
	.bit.on rect {
		fill: var(--ink);
		stroke: var(--ink);
	}
	.bitval {
		font-size: 12px;
		fill: var(--muted);
	}
	.bit.on .bitval {
		fill: var(--surface);
	}
	.stub {
		fill: none;
		stroke: var(--line);
		stroke-width: 1.2;
	}
	.stub.hot {
		stroke: var(--ink);
		stroke-opacity: 0.55;
	}
	.inverter {
		fill: var(--surface);
		stroke: var(--muted);
		stroke-width: 1.2;
	}
	.port {
		fill: var(--surface);
		stroke: var(--muted);
		stroke-width: 1.2;
	}
	.port.on {
		fill: var(--ink);
		stroke: var(--ink);
	}
	.wire {
		fill: none;
		stroke-linecap: round;
		transition:
			stroke-width 0.25s,
			opacity 0.2s;
	}
	.wire.active {
		stroke: var(--ink);
	}
	.wire.blocking {
		stroke: var(--neg);
		stroke-dasharray: 4 3;
	}
	.wires .wire.blocking {
		stroke-dasharray: 0.012 0.009;
	}
	.wire.ghost {
		stroke: var(--muted);
		stroke-width: 1;
		stroke-dasharray: 2 4;
		opacity: 0.7;
	}
	.wire.dying {
		stroke: var(--neg);
		stroke-width: 1.5;
		stroke-dasharray: 2 3;
		opacity: 0.25;
	}
	.faded {
		opacity: 0.12;
	}
	.pulse {
		fill: none;
		stroke: var(--accent);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 0.3 1.3;
		opacity: 0;
		pointer-events: none;
	}
	.outwire {
		fill: none;
		stroke: var(--line);
		stroke-width: 1.2;
	}
	.outwire.pos {
		stroke: var(--pos);
		stroke-width: 2.2;
	}
	.outwire.neg {
		stroke: var(--neg);
		stroke-width: 2.2;
	}
	.gate {
		cursor: pointer;
		outline: none;
	}
	.gate .body {
		fill: var(--surface);
		stroke: var(--ink);
		stroke-width: 1.4;
	}
	.gate.on .body {
		fill: var(--ink);
	}
	.gate.empty .body {
		stroke: var(--muted);
		stroke-dasharray: 3 2;
	}
	.gate.selected .body,
	.gate:focus-visible .body {
		stroke: var(--accent);
		stroke-width: 2.6;
	}
	.tag rect {
		fill: var(--surface);
		stroke: var(--ink);
	}
	.tag text {
		font-size: 10px;
		font-weight: 600;
		fill: var(--ink);
	}
	.tag.idle rect {
		stroke: var(--muted);
		stroke-dasharray: 2 2;
	}
	.tag.idle text {
		fill: var(--muted);
	}
	.sum circle {
		fill: var(--surface);
		stroke: var(--ink);
		stroke-width: 1.4;
	}
	.sum.pos circle {
		fill: var(--tint-blue);
		stroke: var(--pos);
	}
	.sum.neg circle {
		fill: var(--tint-red);
		stroke: var(--neg);
	}
	.sumval {
		font-size: 13px;
		font-weight: 500;
		fill: var(--ink);
	}
	.sumlabel {
		font-size: 9px;
	}
	.predwire {
		fill: none;
		stroke: var(--line);
		stroke-width: 1.4;
	}
	.predwire.win {
		stroke: var(--accent);
		stroke-width: 2.6;
	}
	.pred rect {
		fill: var(--accent);
	}
	.predcls {
		font-family: var(--font-display);
		font-size: 16px;
		font-weight: 700;
		fill: #ffffff;
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
		min-width: 0;
		width: 26px;
		height: 10px;
	}
	.chip {
		border: 1px solid var(--ink);
		border-radius: 3px;
		padding: 0 4px;
		font-size: 10px;
		color: var(--ink);
	}
</style>
