<!-- @component
	#### HUMANIBOOK
	- Tile card view for a board game
	- Compact card with thumbnail, name, BGG hex score, hype badge, and hype-up button
-->
<script lang="ts">
	import type { GameEntry } from '$lib/types';
	import { calculateHypeScore, getHypeColor } from '$lib/hype';
	import BggScoreBadge from './BggScoreBadge.svelte';
	import PlayerCount from './PlayerCount.svelte';
	import WeightBadge from './WeightBadge.svelte';


	interface Props {
		game: GameEntry;
		readonly?: boolean;
		onclick?: () => void;
		onhype?: () => void;
	}

	let { game, readonly: isReadonly = false, onclick, onhype }: Props = $props();

	const hypeScore = $derived(calculateHypeScore(game.hypeEvents));
	const hypeColor = $derived(getHypeColor(hypeScore));
	const isHidden = $derived(!!game.hidden);
	const hypeBg = $derived(
		hypeScore > 0 ? `rgba(255, 152, 0, ${Math.min(hypeScore * 0.04, 0.14)})` : 'var(--surface)'
	);
</script>

<div class="game-card" class:hidden-game={isHidden} style:background={isHidden ? undefined : hypeBg}>
	<button class="card-body" onclick={onclick}>
		<div class="thumb-wrapper">
			<img src={game.thumbnail} alt="" class="thumb" loading="lazy" />
			<div class="bgg-badge">
				<BggScoreBadge score={game.bggScore} size="sm" />
			</div>
			{#if hypeScore > 0}
				<div class="hype-badge" style:background={hypeColor}>
					🔥 {hypeScore.toFixed(1)}
				</div>
			{/if}
		</div>
		<div class="card-info">
			<div class="name">{game.name}</div>
			<div class="meta">
				<PlayerCount
					min={game.minPlayers}
					max={game.maxPlayers}
					best={game.bestPlayerCount}
					recommended={game.recommendedPlayerCount || []}
					size="sm"
				/>
				<WeightBadge weight={game.weight} size="sm" />
			</div>
		</div>
	</button>
	{#if !isReadonly}
		<button
			class="hype-up-btn"
			onclick={(e) => { e.stopPropagation(); onhype?.(); }}
			title="Hype up!"
		>
			🔥
		</button>
	{/if}
</div>

<style>
	.game-card {
		background: var(--surface);
		border-radius: var(--radius);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		position: relative;
		transition: box-shadow 0.15s;
	}

	.game-card.hidden-game {
		opacity: 0.45;
	}

	.card-body {
		text-align: left;
		width: 100%;
		transition: transform 0.1s;
	}

	.card-body:active {
		transform: scale(0.98);
	}

	.thumb-wrapper {
		position: relative;
		aspect-ratio: 1;
		background: var(--divider);
		overflow: hidden;
	}

	.thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.bgg-badge {
		position: absolute;
		top: 6px;
		right: 6px;
	}

	.hype-badge {
		position: absolute;
		bottom: 6px;
		left: 6px;
		color: white;
		font-size: 0.68rem;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 6px;
	}

	.card-info {
		padding: 8px 10px;
	}

	.name {
		font-size: 0.82rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text);
	}

	.meta {
		margin-top: 4px;
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.hype-up-btn {
		position: absolute;
		bottom: 6px;
		right: 6px;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: rgba(255, 87, 34, 0.1);
		backdrop-filter: blur(4px);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		transition: transform 0.1s, background 0.15s;
		z-index: 1;
	}

	.hype-up-btn:hover {
		background: rgba(255, 87, 34, 0.2);
	}

	.hype-up-btn:active {
		transform: scale(0.85);
		background: rgba(255, 87, 34, 0.3);
	}

</style>
