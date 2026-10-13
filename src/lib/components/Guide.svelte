<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { GUIDE } from '$lib/guide';
	import { rich, tex } from '$lib/tex';

	const pages = $derived(GUIDE.filter((p) => !p.only || p.only === lab.datasetId));
	const page = $derived(pages[Math.min(lab.guidePage, pages.length - 1)]);
	const formula = $derived(page.formula ? tex(page.formula, true) : '');

	function go(i: number) {
		lab.guidePage = Math.max(0, Math.min(pages.length - 1, i));
		lab.guideRegion = pages[lab.guidePage].region;
	}

	$effect(() => {
		lab.guideRegion = lab.guideOpen ? page.region : null;
	});
</script>

<aside class="guide panel" aria-label="Guide">
	<div class="top">
		<p class="eyebrow">Guide · {lab.guidePage + 1} of {pages.length}</p>
		<button class="close" onclick={() => (lab.guideOpen = false)} aria-label="Close guide">×</button>
	</div>
	<h2>{page.title}</h2>
	{#each page.body as paragraph}
		<p>{@html rich(paragraph)}</p>
	{/each}
	{#if formula}
		<div class="formula">{@html formula}</div>
	{/if}
	<nav>
		<button class="btn" onclick={() => go(lab.guidePage - 1)} disabled={lab.guidePage === 0}>Back</button>
		<div class="dots">
			{#each pages as g, i}
				<button class="dot" class:on={i === lab.guidePage} onclick={() => go(i)} aria-label="Go to {g.title}"></button>
			{/each}
		</div>
		<button class="btn primary" onclick={() => go(lab.guidePage + 1)} disabled={lab.guidePage === pages.length - 1}>Next</button>
	</nav>
</aside>

<style>
	.guide {
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.close {
		border: 0;
		background: none;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		color: var(--muted);
	}
	h2 {
		font-size: 20px;
		font-weight: 700;
	}
	p {
		margin: 0;
		max-width: 62ch;
	}
	.formula {
		overflow-x: auto;
		background: var(--raised);
		border: 1px solid var(--line);
		border-radius: 7px;
		padding: 0 10px;
	}
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 6px;
	}
	.dots {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 0;
		padding: 0;
		background: var(--line);
		cursor: pointer;
	}
	.dot.on {
		background: var(--ink);
	}
</style>
