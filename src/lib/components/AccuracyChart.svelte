<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { area, line } from 'd3-shape';
	import { lab, type Point } from '$lib/lab.svelte';

	const W = 520;
	const H = 200;
	const pad = { top: 14, right: 16, bottom: 28, left: 40 };

	const points = $derived(lab.history);
	const last = $derived(points[points.length - 1]);
	const xMax = $derived(Math.max(50, Math.ceil(lab.epoch / 50) * 50));
	const x = $derived(scaleLinear().domain([0, xMax]).range([pad.left, W - pad.right]));
	const y = scaleLinear().domain([0.4, 1]).range([H - pad.bottom, pad.top]).clamp(true);
	const yTicks = [0.4, 0.6, 0.8, 1];
	const xTicks = $derived(x.ticks(5));

	const path = $derived(
		line<Point>()
			.x((p) => x(p.epoch))
			.y((p) => y(p.accuracy))(points) ?? ''
	);
	const fill = $derived(
		area<Point>()
			.x((p) => x(p.epoch))
			.y0(H - pad.bottom)
			.y1((p) => y(p.accuracy))(points) ?? ''
	);

	let hover = $state<Point | null>(null);
	let svg: SVGSVGElement;

	function move(event: PointerEvent) {
		const box = svg.getBoundingClientRect();
		const epoch = x.invert(((event.clientX - box.left) / box.width) * W);
		let best = points[0];
		for (const p of points) if (Math.abs(p.epoch - epoch) < Math.abs(best.epoch - epoch)) best = p;
		hover = best;
	}

	const fmt = (v: number) => `${(v * 100).toFixed(1)}%`;
</script>

<section class="panel chart" data-region="chart" class:spotlight={lab.region === 'chart'}>
	<div class="top">
		<div>
			<p class="eyebrow">Test accuracy</p>
			<h2>Clean test set, after each epoch</h2>
		</div>
		<div class="now mono">{fmt(last.accuracy)} <span>at epoch {last.epoch}</span></div>
	</div>
	<svg
		bind:this={svg}
		viewBox="0 0 {W} {H}"
		role="img"
		aria-label="Test accuracy per epoch, now {fmt(last.accuracy)} at epoch {last.epoch}"
		onpointermove={move}
		onpointerleave={() => (hover = null)}
	>
		{#each yTicks as t}
			<line class="grid" x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} />
			<text class="axis" x={pad.left - 6} y={y(t) + 3} text-anchor="end">{t * 100}%</text>
		{/each}
		{#each xTicks as t}
			<text class="axis" x={x(t)} y={H - pad.bottom + 16} text-anchor="middle">{t}</text>
		{/each}
		<text class="axis" x={W - pad.right} y={H - 2} text-anchor="end">epoch</text>
		<path class="area" d={fill} />
		<path class="line" d={path} />
		<circle class="end" cx={x(last.epoch)} cy={y(last.accuracy)} r="4" />
		{#if hover}
			<line class="cross" x1={x(hover.epoch)} x2={x(hover.epoch)} y1={pad.top} y2={H - pad.bottom} />
			<circle class="end" cx={x(hover.epoch)} cy={y(hover.accuracy)} r="4" />
			<g transform="translate({Math.min(x(hover.epoch) + 8, W - 118)}, {pad.top})">
				<rect class="tip" width="110" height="34" rx="5" />
				<text class="tiptext" x="8" y="14">epoch {hover.epoch}</text>
				<text class="tiptext strong" x="8" y="27">{fmt(hover.accuracy)}</text>
			</g>
		{/if}
	</svg>
</section>

<style>
	.chart {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
		flex-wrap: wrap;
	}
	h2 {
		font-size: 16px;
		font-weight: 700;
	}
	.now {
		font-size: 22px;
		font-weight: 500;
	}
	.now span {
		font-size: 12px;
		color: var(--muted);
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
		touch-action: pan-y;
	}
	.grid {
		stroke: var(--line);
	}
	.axis {
		fill: var(--muted);
		font-family: var(--font-data);
		font-size: 10px;
	}
	.area {
		fill: color-mix(in oklab, var(--pos) 12%, transparent);
	}
	.line {
		fill: none;
		stroke: var(--pos);
		stroke-width: 2;
		stroke-linejoin: round;
	}
	.end {
		fill: var(--pos);
		stroke: var(--surface);
		stroke-width: 2;
	}
	.cross {
		stroke: var(--muted);
		stroke-dasharray: 2 3;
	}
	.tip {
		fill: var(--surface);
		stroke: var(--line);
	}
	.tiptext {
		fill: var(--muted);
		font-family: var(--font-data);
		font-size: 10px;
	}
	.tiptext.strong {
		fill: var(--ink);
		font-size: 12px;
	}
</style>
