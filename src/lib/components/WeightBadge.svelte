<script lang="ts">
	interface Props {
		weight: number;
		size?: 'sm' | 'md' | 'lg';
	}

	let { weight, size = 'md' }: Props = $props();

	function getWeightColor(w: number): string {
		if (w < 1.5) return '#43A047';
		if (w < 2.5) return '#7CB342';
		if (w < 3.5) return '#FB8C00';
		if (w < 4.0) return '#F4511E';
		return '#C62828';
	}

	const color = $derived(getWeightColor(weight));
</script>

<span class="weight-pill {size}" style:--wc={color}>
	<span class="emoji">🧠</span>
	<span class="value">{weight.toFixed(1)}</span>
</span>

<style>
	.weight-pill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 20px;
		white-space: nowrap;
	}

	.sm {
		padding: 2px 8px 2px 6px;
		font-size: 0.68rem;
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

	.value {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--wc);
	}
</style>
