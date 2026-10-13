<script lang="ts">
	import { lab } from '$lib/lab.svelte';
	import { DATASETS, DATASET_IDS } from '$lib/data/datasets';
</script>

<div class="switch" role="group" aria-label="Dataset">
	{#each DATASET_IDS as id}
		<button class:on={lab.datasetId === id} aria-pressed={lab.datasetId === id} onclick={() => lab.setDataset(id)}>
			{DATASETS[id].name}
		</button>
	{/each}
</div>

<style>
	.switch {
		display: inline-flex;
		padding: 3px;
		gap: 2px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
	}
	button {
		border: 0;
		border-radius: 999px;
		background: none;
		padding: 4px 14px;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s;
	}
	button:hover {
		color: var(--ink);
	}
	button.on {
		background: var(--ink);
		color: var(--surface);
	}
</style>
