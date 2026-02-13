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
</script>

<span class="player-pill {size}">
	<span class="emoji">👤</span>
	{#each numbers as n (n)}
		{@const isBest = best.includes(n)}
		{@const isRec = recommended.includes(n)}
		<span
			class="pn"
			class:best={isBest}
			class:rec={isRec && !isBest}
		>{n}</span>
	{/each}
</span>

<style>
	.player-pill {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 20px;
		white-space: nowrap;
	}

	.sm {
		padding: 2px 8px 2px 6px;
		font-size: 0.68rem;
		max-width: 70px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.md {
		padding: 3px 10px 3px 7px;
		font-size: 0.75rem;
	}

	.lg {
		padding: 4px 12px 4px 9px;
		font-size: 0.88rem;
	}

	.emoji {
		font-size: 0.85em;
		line-height: 1;
	}

	.pn {
		font-variant-numeric: tabular-nums;
		opacity: 0.38;
		font-weight: 500;
	}

	.pn.rec {
		opacity: 0.7;
	}

	.pn.best {
		font-weight: 800;
		opacity: 1;
		color: var(--primary);
	}
</style>
