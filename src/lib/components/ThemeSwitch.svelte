<script lang="ts">
	type Theme = 'system' | 'light' | 'dark';

	const STORAGE_KEY = 'tmexplainer-theme';
	const options: { value: Theme; label: string }[] = [
		{ value: 'system', label: 'Match system' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];

	function stored(): Theme {
		try {
			const value = localStorage.getItem(STORAGE_KEY);
			return value === 'light' || value === 'dark' ? value : 'system';
		} catch {
			return 'system';
		}
	}

	let theme = $state<Theme>(stored());

	function choose(value: Theme) {
		theme = value;
		const root = document.documentElement;
		if (value === 'system') root.removeAttribute('data-theme');
		else root.setAttribute('data-theme', value);
		try {
			if (value === 'system') localStorage.removeItem(STORAGE_KEY);
			else localStorage.setItem(STORAGE_KEY, value);
		} catch {
			return;
		}
	}
</script>

<div class="switch" role="group" aria-label="Colour theme">
	{#each options as option}
		<button
			class:on={theme === option.value}
			aria-pressed={theme === option.value}
			aria-label={option.label}
			title={option.label}
			onclick={() => choose(option.value)}
		>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				{#if option.value === 'system'}
					<circle cx="8" cy="8" r="6" />
					<path class="fill" d="M8 2 A6 6 0 0 1 8 14 Z" />
				{:else if option.value === 'light'}
					<circle cx="8" cy="8" r="2.8" />
					{#each [0, 45, 90, 135, 180, 225, 270, 315] as angle}
						<line x1="8" y1="1.6" x2="8" y2="3.2" transform="rotate({angle} 8 8)" />
					{/each}
				{:else}
					<path d="M12.6 10.2 A5.6 5.6 0 1 1 6.1 2.6 A4.6 4.6 0 0 0 12.6 10.2 Z" />
				{/if}
			</svg>
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
		width: 30px;
		height: 26px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 999px;
		background: none;
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
	svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.fill {
		fill: currentColor;
		stroke: none;
	}
</style>
