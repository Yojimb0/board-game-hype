<script lang="ts">
	interface Props {
		min: number;
		max: number;
		best: number[];
		recommended?: number[];
		size?: 'sm' | 'md' | 'lg';
	}

	let { min, max, best, recommended = [], size = 'md' }: Props = $props();

	const numbers = $derived.by(() => {
		const nums: number[] = [];
		for (let i = min; i <= max; i++) nums.push(i);
		return nums;
	});

	const maxVisible = $derived(size === 'sm' ? 4 : Infinity);
	const visibleNumbers = $derived(numbers.slice(0, maxVisible));
	const hasMore = $derived(numbers.length > maxVisible);
</script>

<span class="player-pill {size}">
	<span class="emoji">👤</span>
	{#each visibleNumbers as n (n)}
		{@const isBest = best.includes(n)}
		{@const isRec = recommended.includes(n)}
		<span
			class="pn"
			class:best={isBest}
			class:rec={isRec && !isBest}
		>{n}</span>
	{/each}
	{#if hasMore}
		<span class="overflow-plus">+</span>
	{/if}
</span>

<style>
	.player-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 20px;
		white-space: nowrap;
		position: relative;
	}

	.sm {
		padding: 2px 8px 2px 6px;
		font-size: 0.74rem;
	}

	.md {
		padding: 3px 10px 3px 7px;
		font-size: 0.75rem;
	}

	.lg {
		padding: 4px 12px 4px 9px;
		font-size: 0.88rem;
	}

	.overflow-plus {
		font-size: 0.7em;
		font-weight: 700;
		opacity: 0.5;
		margin-left: -1px;
	}

	.emoji {
		font-size: 0.85em;
		line-height: 1;
	}

	.pn {
		font-variant-numeric: tabular-nums;
		opacity: 0.38;
		font-weight: 500;
		line-height: 1;
		vertical-align: middle;
	}

	.pn.rec {
		opacity: 0.7;
	}

	.pn.best {
		font-weight: 800;
		opacity: 1;
		color: var(--primary);
		font-size: 1.15em;
		line-height: 1;
		vertical-align: middle;
	}
</style>
