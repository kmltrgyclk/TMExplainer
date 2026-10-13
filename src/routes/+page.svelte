<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import InputPanel from '$lib/components/InputPanel.svelte';
	import ClauseBanks from '$lib/components/ClauseBanks.svelte';
	import Circuit from '$lib/components/Circuit.svelte';
	import Votes from '$lib/components/Votes.svelte';
	import ClauseDetail from '$lib/components/ClauseDetail.svelte';
	import CoverageMap from '$lib/components/CoverageMap.svelte';
	import TrainingPanel from '$lib/components/TrainingPanel.svelte';
	import AccuracyChart from '$lib/components/AccuracyChart.svelte';
	import Guide from '$lib/components/Guide.svelte';
	import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
	import DatasetSwitch from '$lib/components/DatasetSwitch.svelte';
	import DrawPad from '$lib/components/DrawPad.svelte';
	import StencilGallery from '$lib/components/StencilGallery.svelte';
	import EvidenceMap from '$lib/components/EvidenceMap.svelte';
</script>

<svelte:head>
	<title>TMExplainer</title>
	<meta name="description" content="An interactive, in-browser view of how a Tsetlin Machine reasons and learns." />
</svelte:head>

<div class="page">
	<header class="bar">
		<div class="brand">
			<h1>TMExplainer</h1>
			<p>An interactive Tsetlin Machine. Watch propositional clauses learn noisy XOR or handwritten digits in your browser. Every number on this page comes from a live machine.</p>
		</div>
		<div class="actions">
			<DatasetSwitch />
			<ThemeSwitch />
			{#if !lab.guideOpen}
				<button class="btn primary" onclick={() => (lab.guideOpen = true)}>Open guide</button>
			{/if}
		</div>
	</header>

	<div class="layout" class:guided={lab.guideOpen}>
		<main>
			{#if lab.dataset.grid}
				<DrawPad />
			{:else}
				<InputPanel />
			{/if}
			<div class="flow">
				{#if lab.dataset.grid}
					<StencilGallery />
				{:else if lab.view === 'circuit'}
					<Circuit />
				{:else}
					<ClauseBanks />
				{/if}
				<div class="side">
					<Votes />
					<ClauseDetail />
				</div>
			</div>
			<div class="bench">
				<TrainingPanel />
				<div class="side">
					<AccuracyChart />
					{#if lab.dataset.grid}
						<EvidenceMap />
					{:else}
						<CoverageMap />
					{/if}
				</div>
			</div>
		</main>
		{#if lab.guideOpen}
			<div class="guidecol">
				<Guide />
			</div>
		{/if}
	</div>

	<footer class="foot">
		A vanilla multi-class Tsetlin Machine (Granmo, 2018) with 8-bit automata, running in your browser.
		{#if lab.dataset.grid}
			Digits from <a href="https://doi.org/10.24432/C50P49" target="_blank" rel="noopener">Optical Recognition of Handwritten Digits</a> (Alpaydin and Kaynak, UCI, 1998), CC BY 4.0, converted to black and white.
		{/if}
	</footer>
</div>

<style>
	.page {
		padding-inline: 16px;
		padding-block: 16px 24px;
		max-width: 1680px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: clamp(24px, 3vw, 34px);
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.brand p {
		margin: 4px 0 0;
		color: var(--muted);
		max-width: 65ch;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
	}
	main {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}
	.flow {
		display: grid;
		grid-template-columns: minmax(0, auto) minmax(300px, 1fr);
		gap: 16px;
		align-items: start;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}
	.bench {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		gap: 16px;
		align-items: start;
	}
	.guidecol {
		order: -1;
	}
	.foot {
		color: var(--muted);
		font-size: 12px;
	}
	.foot a {
		color: inherit;
	}
	@media (min-width: 1560px) {
		.layout.guided {
			grid-template-columns: minmax(0, 1fr) 340px;
		}
		.guidecol {
			order: 0;
			position: sticky;
			top: calc(env(safe-area-inset-top, 0px) + 16px);
			align-self: start;
		}
	}
	@media (max-width: 1180px) {
		.flow,
		.bench {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
