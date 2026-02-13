<script lang="ts">
	interface Props {
		score: number;
		size?: 'sm' | 'md' | 'lg';
	}

	let { score, size = 'md' }: Props = $props();

	function getScoreColor(s: number): string {
		if (s <= 0) return '#9E9E9E';
		if (s < 4.5) return '#e53935';
		if (s < 5.5) return '#F4511E';
		if (s < 6.0) return '#FB8C00';
		if (s < 6.5) return '#FDD835';
		if (s < 7.0) return '#C0CA33';
		if (s < 7.5) return '#7CB342';
		if (s < 8.0) return '#43A047';
		if (s < 8.5) return '#00897B';
		if (s < 9.0) return '#00838F';
		return '#5C6BC0';
	}

	function getTextColor(s: number): string {
		if (s >= 6.0 && s < 7.0) return '#333';
		return '#fff';
	}

	const bg = $derived(getScoreColor(score));
	const fg = $derived(getTextColor(score));
</script>

<span
	class="bgg-hex {size}"
	style:--bg={bg}
	style:--fg={fg}
>
	{score > 0 ? score.toFixed(1) : '—'}
</span>

<style>
	.bgg-hex {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		background: var(--bg);
		color: var(--fg);
		clip-path: polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.sm {
		font-size: 0.68rem;
		padding: 4px 10px;
		min-width: 38px;
	}

	.md {
		font-size: 0.82rem;
		padding: 5px 13px;
		min-width: 46px;
	}

	.lg {
		font-size: 1.05rem;
		padding: 7px 16px;
		min-width: 54px;
	}
</style>
