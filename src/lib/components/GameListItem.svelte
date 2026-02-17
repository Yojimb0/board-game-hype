<!-- @component
	#### HUMANIBOOK
	- Compact list row for a board game in the collection
	- Shows thumbnail, name, player count, weight, BGG score hex, hype indicator, and hype-up button
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

	const visibleLabels = $derived(game.labels?.slice(0, 2) ?? []);

	const hypeScore = $derived(calculateHypeScore(game.hypeEvents));
	const hypeColor = $derived(getHypeColor(hypeScore));
	const isHidden = $derived(!!game.hidden);
	const hypeBg = $derived(
		hypeScore > 0 ? `rgba(255, 152, 0, ${Math.min(hypeScore * 0.04, 0.14)})` : 'var(--surface)'
	);
</script>

<div class="game-list-item" class:hidden-game={isHidden} style:background={isHidden ? undefined : hypeBg}>
	<button class="item-body" onclick={onclick}>
		<img
			src={game.thumbnail}
			alt=""
			class="thumb"
			loading="lazy"
		/>
		<div class="info">
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
			{#if visibleLabels.length > 0}
				<div class="labels">
					{#each visibleLabels as label (label)}
						<span class="label-chip">{label}</span>
					{/each}
				</div>
			{/if}
		</div>
		<div class="scores">
			<BggScoreBadge score={game.bggScore} size="sm" />
			{#if hypeScore > 0}
				<div class="hype" style:color={hypeColor}>
					🔥 {hypeScore.toFixed(1)}
				</div>
			{/if}
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
	.game-list-item {
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid var(--divider);
		background: var(--surface);
		transition: background 0.1s;
	}

	.game-list-item.hidden-game {
		background: var(--divider);
		opacity: 0.6;
	}

	.item-body {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px 10px 16px;
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.item-body:active {
		background: #f0f0f0;
	}

	.thumb {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-sm);
		object-fit: cover;
		background: var(--divider);
		flex-shrink: 0;
	}

	.info {
		flex: 1;
		min-width: 0;
	}

	.name {
		font-size: 0.9rem;
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
		gap: 5px;
		flex-wrap: wrap;
	}

	.labels {
		display: flex;
		gap: 4px;
		margin-top: 4px;
		flex-wrap: wrap;
	}

	.label-chip {
		font-size: 0.65rem;
		padding: 1px 6px;
		background: #E0F2F1;
		color: #00695C;
		border-radius: 10px;
		font-weight: 500;
	}

	.scores {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 3px;
		flex-shrink: 0;
	}

	.hype {
		font-size: 0.72rem;
		font-weight: 600;
	}

	.hype-up-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		flex-shrink: 0;
		font-size: 1.1rem;
		border-left: 1px solid var(--divider);
		background: rgba(255, 87, 34, 0.05);
		transition: background 0.15s, transform 0.1s;
	}

	.hype-up-btn:hover {
		background: rgba(255, 87, 34, 0.12);
	}

	.hype-up-btn:active {
		transform: scale(0.88);
		background: rgba(255, 87, 34, 0.2);
	}
</style>
