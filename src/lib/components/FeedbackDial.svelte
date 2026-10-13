<script lang="ts">
	import { tex } from '$lib/tex';

	let { v, T, p, target }: { v: number; T: number; p: number; target: boolean } = $props();

	const R = 46;
	const CX = 60;
	const CY = 56;
	const point = (value: number, radius = R) => {
		const angle = Math.PI * (1 - (value + T) / (2 * T));
		return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)];
	};
	const left = $derived(point(-T));
	const right = $derived(point(T));
	const needle = $derived(point(v));
	const tip = $derived(point(v, R - 9));
	const gap = $derived(
		target
			? `M${needle[0]},${needle[1]} A${R},${R} 0 0 1 ${right[0]},${right[1]}`
			: `M${left[0]},${left[1]} A${R},${R} 0 0 1 ${needle[0]},${needle[1]}`
	);
</script>

<figure class="dial">
	<svg viewBox="0 0 120 64" role="img" aria-label="Class sum {v} between minus {T} and plus {T}; feedback probability {p.toFixed(2)}">
		<path class="base" d="M{left[0]},{left[1]} A{R},{R} 0 0 1 {right[0]},{right[1]}" />
		<path class="gap" d={gap} />
		<line class="needle" x1={CX} y1={CY} x2={tip[0]} y2={tip[1]} />
		<circle class="hub" cx={CX} cy={CY} r="3" />
	</svg>
	<div class="ends"><span>{@html tex('-T')}</span><span>{@html tex('+T')}</span></div>
	<figcaption>{@html tex(`p = ${p.toFixed(2)}`)}</figcaption>
</figure>

<style>
	.dial {
		margin: 0;
		width: 132px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.base {
		fill: none;
		stroke: var(--line);
		stroke-width: 7;
		stroke-linecap: round;
	}
	.gap {
		fill: none;
		stroke: var(--accent);
		stroke-width: 7;
		stroke-linecap: round;
		transition: d 0.6s;
	}
	.needle {
		stroke: var(--ink);
		stroke-width: 2.4;
		stroke-linecap: round;
	}
	.hub {
		fill: var(--ink);
	}
	.ends {
		width: 100%;
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--muted);
		margin-top: -4px;
	}
	figcaption {
		font-size: 14px;
	}
</style>
