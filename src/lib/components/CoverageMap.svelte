<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { infer, isPositive } from '$lib/tm/machine';
	import { rich, signed, tex } from '$lib/tex';

	const SAMPLE = 1000;
	const cells = [
		[0, 0],
		[0, 1],
		[1, 0],
		[1, 1]
	];

	let rowFeature = $state(0);
	let columnFeature = $state(1);
	let cached: ReturnType<typeof measure> | null = null;

	const features = $derived(lab.config.features);
	const featureOptions = $derived(Array.from({ length: features }, (_, k) => k));

	function measure(states: Uint8Array[], row: number, column: number) {
		const machine = { ...lab.machine, states };
		const classes = lab.config.classes;
		const selected = lab.selected;
		const count = [0, 0, 0, 0];
		const fired = [0, 0, 0, 0];
		const voteSum = cells.map(() => new Array(classes).fill(0));
		const X = lab.data.test.X;
		for (let i = 0; i < Math.min(SAMPLE, X.length); i++) {
			const x = X[i];
			const cell = x[row] * 2 + x[column];
			const result = infer(machine, x);
			count[cell]++;
			for (let c = 0; c < classes; c++) voteSum[cell][c] += result.sums[c];
			if (selected && result.outputs[selected.cls][selected.clause]) fired[cell]++;
		}
		return {
			coverage: count.map((n, cell) => (n ? fired[cell] / n : 0)),
			votes: voteSum.map((sums, cell) => sums.map((v) => (count[cell] ? v / count[cell] : 0)))
		};
	}

	const result = $derived.by(() => {
		lab.version;
		const states = lab.states;
		const row = rowFeature;
		const column = columnFeature;
		lab.selected;
		if (lab.playing && cached) return cached;
		cached = measure(states, row, column);
		return cached;
	});

	const T = $derived(lab.config.T);
	const classes = $derived(Array.from({ length: lab.config.classes }, (_, c) => c));
	const winner = (cell: number) => {
		const v = result.votes[cell];
		return v.indexOf(Math.max(...v));
	};

	const name = $derived(
		lab.selected ? `C^{${isPositive(lab.machine, lab.selected.clause) ? '+' : '-'}}_{${lab.selected.clause + 1}}` : ''
	);

	function coverageFill(share: number) {
		return `color-mix(in oklab, var(--ink) ${Math.round(share * 85)}%, var(--surface))`;
	}

	function voteFill(v: number) {
		const strength = Math.round((Math.min(Math.abs(v), T) / T) * 80);
		const hue = v >= 0 ? 'var(--pos)' : 'var(--neg)';
		return `color-mix(in oklab, ${hue} ${strength}%, var(--surface))`;
	}

	const xr = $derived(`x_{${rowFeature + 1}}`);
	const xc = $derived(`x_{${columnFeature + 1}}`);
</script>

<section class="panel coverage" data-region="coverage" class:spotlight={lab.region === 'coverage'}>
	<div class="top">
		<div>
			<p class="eyebrow">Coverage map</p>
			<h2>Which inputs each clause covers</h2>
		</div>
		<div class="axes">
			<label for="coverage-row">rows</label>
			<select id="coverage-row" bind:value={rowFeature}>
				{#each featureOptions as k}<option value={k} disabled={k === columnFeature}>{`x${k + 1}`}</option>{/each}
			</select>
			<label for="coverage-column">columns</label>
			<select id="coverage-column" bind:value={columnFeature}>
				{#each featureOptions as k}<option value={k} disabled={k === rowFeature}>{`x${k + 1}`}</option>{/each}
			</select>
		</div>
	</div>

	<div class="maps">
		{#if lab.selected}
			<figure>
				<figcaption>{@html rich(`Where $${name}$ outputs 1`)}</figcaption>
				<div class="grid">
					<span class="colhead" style:grid-area="1 / 2">{@html tex(`${xc} = 0`)}</span>
					<span class="colhead" style:grid-area="1 / 3">{@html tex(`${xc} = 1`)}</span>
					{#each [0, 1] as a}
						<span class="rowhead" style:grid-area="{a + 2} / 1">{@html tex(`${xr} = ${a}`)}</span>
						{#each [0, 1] as b}
							{@const share = result.coverage[a * 2 + b]}
							<span class="cell mono" class:dark={share > 0.55} style:grid-area="{a + 2} / {b + 2}" style:background={coverageFill(share)}>{Math.round(share * 100)}%</span>
						{/each}
					{/each}
				</div>
			</figure>
		{/if}

		{#each classes as c}
			<figure>
				<figcaption>{@html rich(`Mean class sum $v_{${c}}$`)}</figcaption>
				<div class="grid">
					<span class="colhead" style:grid-area="1 / 2">{@html tex(`${xc} = 0`)}</span>
					<span class="colhead" style:grid-area="1 / 3">{@html tex(`${xc} = 1`)}</span>
					{#each [0, 1] as a}
						<span class="rowhead" style:grid-area="{a + 2} / 1">{@html tex(`${xr} = ${a}`)}</span>
						{#each [0, 1] as b}
							{@const v = result.votes[a * 2 + b][c]}
							<span
								style:grid-area="{a + 2} / {b + 2}"
								class="cell mono"
								class:dark={Math.abs(v) / T > 0.6}
								class:win={winner(a * 2 + b) === c}
								style:background={voteFill(v)}>{@html tex(signed(Math.round(v * 10) / 10))}</span
							>
						{/each}
					{/each}
				</div>
			</figure>
		{/each}
	</div>

	<p class="caption">
		{@html rich(`Measured on ${SAMPLE.toLocaleString('en-GB')} test examples. A framed cell marks the class that wins it. Pick a noise bit as an axis and the map goes flat.`)}
	</p>
</section>

<style>
	.coverage {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}
	h2 {
		font-size: 16px;
	}
	.axes {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--muted);
	}
	select {
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		padding: 2px 6px;
		font-family: var(--font-data);
		font-size: 12px;
	}
	.maps {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
	figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	figcaption {
		font-size: 12px;
		font-weight: 600;
	}
	.grid {
		display: grid;
		grid-template-columns: auto 48px 48px;
		grid-template-rows: 22px 40px 40px;
		gap: 3px;
		align-items: center;
	}
	.colhead {
		font-size: 11px;
		color: var(--muted);
		text-align: center;
		align-self: end;
	}
	.rowhead {
		font-size: 11px;
		color: var(--muted);
		padding-right: 4px;
		text-align: right;
	}
	.cell {
		height: 100%;
		border-radius: 6px;
		display: grid;
		place-items: center;
		font-size: 12px;
		color: var(--ink);
		border: 1px solid var(--line);
	}
	.cell.dark {
		color: var(--surface);
	}
	.cell.win {
		box-shadow: inset 0 0 0 2px var(--ink);
	}
	.cell.dark.win {
		box-shadow:
			inset 0 0 0 2px var(--ink),
			inset 0 0 0 4px var(--surface);
	}
	.caption {
		margin: 0;
		font-size: 12px;
		color: var(--muted);
	}
</style>
