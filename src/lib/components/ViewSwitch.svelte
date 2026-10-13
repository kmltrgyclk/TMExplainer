<script lang="ts">
	import { lab } from '$lib/lab.svelte';
</script>

<div class="switch" role="tablist" aria-label="Model view">
	<button role="tab" aria-selected={lab.view === 'circuit'} class:on={lab.view === 'circuit'} onclick={() => (lab.view = 'circuit')}>Circuit</button>
	<button role="tab" aria-selected={lab.view === 'matrix'} class:on={lab.view === 'matrix'} onclick={() => (lab.view = 'matrix')}>Automata matrix</button>
</div>

<style>
	.switch {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
		background: var(--surface);
	}
	button {
		border: 0;
		background: none;
		padding: 5px 12px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
	button.on {
		background: var(--ink);
		color: var(--surface);
	}
</style>
