<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { BEAT, BEATS } from '$lib/story';
	import { TYPE_IA, TYPE_IB, TYPE_II, isPositive, type ClassFeedback } from '$lib/tm/machine';
	import { rich, signed, tex } from '$lib/tex';
	import { xorLabel } from '$lib/tm/noisyxor';
	import FeedbackDial from './FeedbackDial.svelte';

	const trace = $derived(lab.trace);
	const feedback = $derived(trace ? [...trace.feedback].sort((a, b) => (a.role === 'target' ? -1 : b.role === 'target' ? 1 : 0)) : []);
	const T = $derived(lab.config.T);

	const gateTex = (j: number) => `C^{${isPositive(lab.machine, j) ? '+' : '-'}}_{${j + 1}}`;
	const typeOne = (f: ClassFeedback, j: number) => isPositive(lab.machine, j) === (f.role === 'target');
	const picked = (f: ClassFeedback) => Array.from(f.selected, (s, j) => (s ? j : -1)).filter((j) => j >= 0);

	function count(f: ClassFeedback, kind: number) {
		let n = 0;
		for (const k of f.kinds) if (k === kind) n++;
		return n;
	}

	function sums(result: { sums: number[] } | null) {
		if (!result) return '';
		return result.sums.map((v, c) => `v_{${c}} = ${signed(v)}`).join(',\\ ');
	}

	const roleText = (f: ClassFeedback) => (f.role === 'target' ? 'target class' : 'sampled negative class');
</script>

{#if trace}
	<section class="story" data-region="story" class:spotlight={lab.region === 'story'}>
		<header>
			<p class="eyebrow">One training step, beat by beat</p>
			<div class="controls">
				<button class="btn" onclick={() => lab.goToBeat(lab.beat - 1)} disabled={lab.beat === 0}>Back</button>
				{#if lab.storyPlaying}
					<button class="btn" onclick={() => lab.pauseStory()}>Pause</button>
				{:else if lab.beat < BEATS.length - 1}
					<button class="btn" onclick={() => lab.playStory()}>Play</button>
				{:else}
					<button class="btn" onclick={() => { lab.goToBeat(0); lab.playStory(); }}>Replay</button>
				{/if}
				<button class="btn primary" onclick={() => lab.goToBeat(lab.beat + 1)} disabled={lab.beat === BEATS.length - 1}>Next</button>
			</div>
		</header>

		<ol class="beats">
			{#each BEATS as beat, i}
				<li class:done={i < lab.beat} class:current={i === lab.beat} class:future={i > lab.beat}>
					<button class="marker" onclick={() => lab.goToBeat(i)} aria-label="Go to beat {i + 1}: {beat.title}">{i + 1}</button>
					<div class="body">
						<h3>{beat.title}</h3>
						{#if i <= lab.beat}
							{#if i === BEAT.example}
								<p>
									{@html rich(`The machine sees one training example. Its label is $y = ${trace.y}$.`)}
									{#if trace.y !== xorLabel(trace.x)}
										<span class="warn">{@html rich(`This label is noise: $x_1 \\oplus x_2 = ${xorLabel(trace.x)}$.`)}</span>
									{:else}
										{@html rich('It matches $x_1 \\oplus x_2$.')}
									{/if}
								</p>
							{:else if i === BEAT.vote}
								<p>Two classes take part. The target class should vote higher, and one other class, chosen at random, should vote lower.</p>
								<ul class="pairs">
									{#each feedback as f}
										<li>{@html rich(`Class ${f.cls}, ${roleText(f)}: $v_{${f.cls}} = ${signed(f.sum)}$`)}</li>
									{/each}
								</ul>
							{:else if i === BEAT.probability}
								<p>{@html rich('Each clause gets feedback with probability $p$. The red arc is $p$: the distance still to go before the sum reaches its limit.')}</p>
								<div class="dials">
									{#each feedback as f}
										<div class="dialcard">
											<span class="small">Class {f.cls}, {f.role === 'target' ? 'target' : 'negative'}</span>
											<FeedbackDial v={f.sum} {T} p={f.probability} target={f.role === 'target'} />
											<span class="formula">{@html tex(f.role === 'target' ? '\\frac{T - v}{2T}' : '\\frac{T + v}{2T}')}</span>
										</div>
									{/each}
								</div>
							{:else if i === BEAT.select}
								<p>{@html rich('Type I goes to clauses that should fire. Type II goes to clauses that should not.')}</p>
								{#each feedback as f}
									<div class="picked">
										<span class="small">Class {f.cls}</span>
										{#each picked(f) as j}
											<span class="chip" class:two={!typeOne(f, j)} class:idle={!typeOne(f, j) && !f.outputs[j]}>
												{@html tex(gateTex(j))}
												<b>{typeOne(f, j) ? 'I' : 'II'}</b>
											</span>
										{:else}
											<span class="small">no clause picked</span>
										{/each}
									</div>
								{/each}
							{:else if i === BEAT.move}
								<p>Each picked clause updates its automata by one state. The inspector shows the clause with the most moves.</p>
								<ul class="pairs mono">
									{#each feedback as f}
										<li>
											Class {f.cls}:
											<span class="ia">▲ Ia {count(f, TYPE_IA)}</span>
											<span class="ib">▼ Ib {count(f, TYPE_IB)}</span>
											<span class="ii">◆ II {count(f, TYPE_II)}</span>
										</li>
									{/each}
								</ul>
							{:else if i === BEAT.result && lab.before && lab.after}
								<ul class="pairs">
									<li>{@html rich(`Before: $${sums(lab.before)}$, predicts class ${lab.before.prediction}.`)}</li>
									<li>{@html rich(`After: $${sums(lab.after)}$, predicts class ${lab.after.prediction}.`)}</li>
								</ul>
								<p class="small">One step moves only a few automata. Learning comes from thousands of these small steps.</p>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	.story {
		display: flex;
		flex-direction: column;
		gap: 10px;
		border-top: 1px solid var(--line);
		padding-top: 12px;
		border-radius: 4px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.controls {
		display: flex;
		gap: 6px;
	}
	.beats {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.beats > li {
		display: grid;
		grid-template-columns: 28px 1fr;
		gap: 12px;
		position: relative;
		padding-bottom: 10px;
	}
	.beats > li:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 13px;
		top: 26px;
		bottom: 0;
		width: 2px;
		background: var(--line);
	}
	.beats > li.done:not(:last-child)::before {
		background: var(--ink);
	}
	.marker {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--line);
		background: var(--surface);
		color: var(--muted);
		font-family: var(--font-data);
		font-size: 12px;
		cursor: pointer;
		position: relative;
		z-index: 1;
	}
	.done .marker {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--surface);
	}
	.current .marker {
		border-color: var(--accent);
		color: var(--accent);
		box-shadow: 0 0 0 3px var(--tint-red);
	}
	.body {
		min-width: 0;
		padding-top: 4px;
	}
	h3 {
		font-family: var(--font-body);
		font-size: 14px;
		font-weight: 600;
		margin: 0 0 4px;
	}
	.future h3 {
		color: var(--muted);
		font-weight: 500;
	}
	p {
		margin: 0 0 6px;
		font-size: 13px;
		max-width: 62ch;
	}
	.warn {
		color: var(--accent);
	}
	.pairs {
		margin: 0;
		padding-left: 16px;
		font-size: 13px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.pairs.mono {
		font-size: 12px;
	}
	.pairs span {
		margin-left: 8px;
	}
	.dials {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}
	.dialcard {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--raised);
	}
	.formula {
		font-size: 13px;
		color: var(--muted);
	}
	.small {
		font-size: 12px;
		color: var(--muted);
	}
	.picked {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin-bottom: 4px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 1px 7px;
		border: 1px solid var(--ink);
		border-radius: 5px;
		font-size: 12px;
	}
	.chip b {
		font-family: var(--font-data);
		font-size: 11px;
	}
	.chip.idle {
		border-style: dashed;
		color: var(--muted);
		border-color: var(--muted);
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
</style>
