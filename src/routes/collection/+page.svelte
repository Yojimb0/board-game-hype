<script lang="ts">
	import { goto } from '$app/navigation';
	import { getAuthState } from '$lib/auth.svelte';
	import { getCollection, nudgeHype } from '$lib/collection.svelte';
	import { getSettings } from '$lib/settings.svelte';
	import { calculateHypeScore } from '$lib/hype';
	import GameListItem from '$lib/components/GameListItem.svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameDetailDialog from '$lib/components/GameDetailDialog.svelte';
	import type { GameEntry, SortKey, ViewMode, BggGameDetails } from '$lib/types';

	$effect(() => {
		if (!authState.loading && !authState.user) {
			goto('/');
		}
	});

	const authState = getAuthState();
	const collection = getCollection();
	const settings = getSettings();

	function handleHype(bggId: number) {
		if (!authState.user) return;
		nudgeHype(authState.user.uid, bggId, 1);
	}

	let sortKey = $state<SortKey>('hypeScore');
	let sortAsc = $state(false);
	let viewMode = $state<ViewMode>(settings.defaultView);

	$effect(() => {
		viewMode = settings.defaultView;
	});
	let selectedGame = $state<BggGameDetails | null>(null);
	let filterOpen = $state(false);
	let filterText = $state('');
	let filterInputEl: HTMLInputElement | undefined = $state();
	let filterBestAt = $state<number | null>(null);
	let filterType = $state<string | null>(null);
	let filterWeight = $state<number | null>(null);
	let filtersOpen = $state(false);

	function toggleFilter() {
		filterOpen = !filterOpen;
		if (!filterOpen) {
			filterText = '';
		} else {
			setTimeout(() => filterInputEl?.focus(), 0);
		}
	}

	function toggleFilters() {
		filtersOpen = !filtersOpen;
		if (!filtersOpen) {
			filterBestAt = null;
			filterType = null;
			filterWeight = null;
		}
	}

	function pickBestAt(n: number) {
		filterBestAt = filterBestAt === n ? null : n;
	}

	function pickType(t: string) {
		filterType = filterType === t ? null : t;
	}

	const hasActiveFilters = $derived(filterBestAt !== null || filterType !== null || filterWeight !== null);

	// All unique best-at player counts across the collection, sorted
	const bestAtNumbers = $derived.by(() => {
		const set = new Set<number>();
		for (const g of collection.games) {
			if (g.bestPlayerCount) {
				for (const n of g.bestPlayerCount) set.add(n);
			}
		}
		return [...set].sort((a, b) => a - b);
	});

	// All unique types (BGG types + custom labels) across the collection, sorted
	const bggTypes = $derived.by(() => {
		const set = new Set<string>();
		for (const g of collection.games) {
			if (g.bggType) {
				for (const t of g.bggType) set.add(t);
			}
		}
		return [...set].sort();
	});

	const customLabels = $derived.by(() => {
		const set = new Set<string>();
		for (const g of collection.games) {
			if (g.labels) {
				for (const l of g.labels) set.add(l);
			}
		}
		return [...set].sort();
	});

	const bggCategories = $derived.by(() => {
		const set = new Set<string>();
		for (const g of collection.games) {
			if (g.categories) {
				for (const c of g.categories) set.add(c);
			}
		}
		return [...set].sort();
	});

	const hasLabels = $derived(bggTypes.length > 0 || customLabels.length > 0 || bggCategories.length > 0);

	const sortedGames = $derived.by(() => {
		let all = settings.showHidden
			? collection.games
			: collection.games.filter((g) => !g.hidden);

		if (filterText.trim()) {
			const q = filterText.trim().toLowerCase();
			all = all.filter((g) => g.name.toLowerCase().includes(q));
		}

		if (filterBestAt !== null) {
			all = all.filter((g) => g.bestPlayerCount?.includes(filterBestAt!));
		}

		if (filterType) {
			all = all.filter((g) => g.bggType?.includes(filterType!) || g.labels?.includes(filterType!) || g.categories?.includes(filterType!));
		}

		if (filterWeight !== null) {
			all = all.filter((g) => g.weight >= filterWeight! - 0.3 && g.weight <= filterWeight! + 0.3);
		}

		const list = [...all];
		list.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'name':
					cmp = a.name.localeCompare(b.name);
					break;
				case 'bggScore':
					cmp = a.bggScore - b.bggScore;
					break;
		case 'weight':
			cmp = a.weight - b.weight;
			break;
				case 'hypeScore':
					cmp = calculateHypeScore(a.hypeEvents) - calculateHypeScore(b.hypeEvents);
					break;
				case 'addedAt':
					cmp = a.addedAt - b.addedAt;
					break;
			}
			return sortAsc ? cmp : -cmp;
		});
		return list;
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = false;
		}
	}

	async function openDetails(game: GameEntry) {
		// Use stored data to build BggGameDetails
		selectedGame = {
			id: game.bggId,
			name: game.name,
			thumbnail: game.thumbnail,
			image: game.image,
			description: game.description || '',
			yearPublished: game.yearPublished,
			minPlayers: game.minPlayers,
			maxPlayers: game.maxPlayers,
			playingTime: game.playingTime,
			minPlayTime: game.playingTime,
			maxPlayTime: game.playingTime,
			bggScore: game.bggScore,
			averageRating: game.bggScore,
			weight: game.weight,
			bestPlayerCount: game.bestPlayerCount,
			recommendedPlayerCount: game.recommendedPlayerCount || [],
			bggType: game.bggType || [],
			categories: game.categories || [],
			mechanics: game.mechanics || []
		};
	}

	const sortOptions: { key: SortKey; label: string }[] = [
		{ key: 'hypeScore', label: '🔥 Hype' },
		{ key: 'bggScore', label: 'BGG Score' },
		{ key: 'weight', label: 'Weight' },
		{ key: 'name', label: 'Name' },
		{ key: 'addedAt', label: 'Added' }
	];
</script>

{#if authState.loading || collection.loading}
	<div class="loading">
		<div class="spinner"></div>
	</div>
{:else}
	<div class="controls">
		<div class="sort-bar">
			{#each sortOptions as opt}
				<button
					class="sort-chip"
					class:active={sortKey === opt.key}
					onclick={() => toggleSort(opt.key)}
				>
					{opt.label}
					{#if sortKey === opt.key}
						<span class="sort-dir">{sortAsc ? '↑' : '↓'}</span>
					{/if}
				</button>
			{/each}
		</div>
		<div class="view-toggle">
			<button
				class="view-btn"
				class:active={filterOpen}
				onclick={toggleFilter}
				title="Search"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
					<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
				</svg>
			</button>
			<button
				class="view-btn"
				class:active={filtersOpen}
				class:has-filters={hasActiveFilters}
				onclick={toggleFilters}
				title="Filters"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
					<path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
				</svg>
			</button>
			<button
				class="view-btn view-mode-btn"
				class:active={viewMode === 'list'}
				onclick={() => (viewMode = 'list')}
				title="List view"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
					<path d="M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z" />
				</svg>
			</button>
			<button
				class="view-btn view-mode-btn"
				class:active={viewMode === 'tiles'}
				onclick={() => (viewMode = 'tiles')}
				title="Tile view"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
					<path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z" />
				</svg>
			</button>
		</div>
	</div>

	{#if filterOpen}
		<div class="filter-bar">
			<div class="filter-row">
				<input
					bind:this={filterInputEl}
					bind:value={filterText}
					type="text"
					placeholder="Filter by name..."
					class="filter-input"
				/>
				{#if filterText}
					<button class="filter-clear" onclick={() => (filterText = '')}>✕</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if filtersOpen}
		<div class="filter-bar filters-panel">
			<div class="sub-bar-row">
				<span class="sub-bar-label">👤 Best at:</span>
				<div class="sub-bar-pills">
					{#each bestAtNumbers as n (n)}
						<button
							class="best-at-pill"
							class:active={filterBestAt === n}
							onclick={() => pickBestAt(n)}
						>
							{n}
						</button>
					{/each}
				</div>
			</div>
			{#if hasLabels}
				<div class="sub-bar-row">
					<span class="sub-bar-label">🏷️ Label:</span>
					<div class="sub-bar-pills">
						{#each bggTypes as t (t)}
							<button
								class="type-pill bgg"
								class:active={filterType === t}
								onclick={() => pickType(t)}
							>
								{t.replace(' Games', '')}
							</button>
						{/each}
					{#each customLabels as l (l)}
						<button
							class="type-pill custom"
							class:active={filterType === l}
							onclick={() => pickType(l)}
						>
							{l}
						</button>
					{/each}
					{#each bggCategories as c (c)}
						<button
							class="type-pill cat"
							class:active={filterType === c}
							onclick={() => pickType(c)}
						>
							{c}
						</button>
					{/each}
					</div>
				</div>
			{/if}
			<div class="sub-bar-row weight-row">
				<span class="sub-bar-label">🧠 Weight:</span>
				<div class="weight-track-wrapper">
					<div class="weight-steps">
						{#each [1, 2, 3, 4, 5] as n (n)}
							<span class="weight-step">{n}</span>
						{/each}
					</div>
					<input
						type="range"
						class="weight-slider"
						min="1"
						max="5"
						step="0.1"
						value={filterWeight ?? 2.5}
						oninput={(e) => { filterWeight = parseFloat((e.target as HTMLInputElement).value); }}
					/>
				</div>
				<span class="weight-value">{filterWeight !== null ? filterWeight.toFixed(1) : '—'}</span>
				{#if filterWeight !== null}
					<button class="filter-clear" onclick={() => (filterWeight = null)}>✕</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if sortedGames.length === 0 && collection.games.length > 0}
		<div class="empty-state small">
			<p>No games match your filters.</p>
		</div>
	{:else if sortedGames.length === 0}
		<div class="empty-state onboarding">
			<div class="empty-icon">🎲</div>
			<h2>Board Game Hype</h2>

			<div class="onboarding-section">
				<h3>What is this?</h3>
				<p>Track your board game collection and rank games by <strong>hype</strong> — a score that decays over time so your list always reflects what you're excited about <em>right now</em>.</p>
			</div>

			<div class="onboarding-section">
				<h3>Getting started</h3>
				<ol>
					<li><strong>Sign in</strong> with Google (top right)</li>
					<li>Go to <strong>Add Game</strong> tab</li>
					<li>Paste a <strong>BoardGameGeek link</strong> or upload a <strong>BGG CSV export</strong></li>
					<li>Your collection appears here!</li>
				</ol>
			</div>

			<div class="onboarding-section">
				<h3>Hype score</h3>
				<p>Tap the 🔥 button to hype a game. Repeated hypes stack. The score <strong>decays over ~5 weeks</strong>, so forgotten games drift down naturally.</p>
			</div>

			<a href="/search" class="cta-link">Add your first game →</a>
		</div>
	{:else if viewMode === 'list'}
		<div class="game-list">
			{#each sortedGames as game (game.bggId)}
				<GameListItem
					{game}
					onclick={() => openDetails(game)}
					onhype={() => handleHype(game.bggId)}
				/>
			{/each}
		</div>
		<div class="donate-row">
			<p class="donate-label">Enjoying the app? Help cover running costs if you can.</p>
			<form action="https://www.paypal.com/donate" method="post" target="_top">
				<input type="hidden" name="business" value="CSF9JJ6J64NG4" />
				<input type="hidden" name="no_recurring" value="1" />
				<input type="hidden" name="item_name" value="Help fund potential running costs if the app works and helps you" />
				<input type="hidden" name="currency_code" value="AUD" />
				<input type="image" src="https://www.paypalobjects.com/en_AU/i/btn/btn_donate_LG.gif" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" style="padding:0;background:transparent"/>
			</form>
		</div>
	{:else}
		<div class="game-grid">
			{#each sortedGames as game (game.bggId)}
				<GameCard
					{game}
					onclick={() => openDetails(game)}
					onhype={() => handleHype(game.bggId)}
				/>
			{/each}
		</div>
		<div class="donate-row">
			<p class="donate-label">Enjoying the app? Help cover running costs if you can.</p>
			<form action="https://www.paypal.com/donate" method="post" target="_top">
				<input type="hidden" name="business" value="CSF9JJ6J64NG4" />
				<input type="hidden" name="no_recurring" value="1" />
				<input type="hidden" name="item_name" value="Help fund potential running costs if the app works and helps you" />
				<input type="hidden" name="currency_code" value="AUD" />
				<input type="image" src="https://www.paypalobjects.com/en_AU/i/btn/btn_donate_LG.gif" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" style="padding:0;background:transparent" />
			</form>
		</div>
	{/if}
{/if}

<GameDetailDialog
	bggDetails={selectedGame}
	onclose={() => (selectedGame = null)}
/>

<style>
	.controls {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--surface);
		border-bottom: 1px solid var(--divider);
		position: sticky;
		top: 52px;
		z-index: 50;
	}

	.sort-bar {
		flex: 1;
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.sort-bar::-webkit-scrollbar {
		display: none;
	}

	.sort-chip {
		white-space: nowrap;
		font-size: 0.75rem;
		padding: 4px 10px;
		border-radius: 14px;
		background: var(--background);
		color: var(--text-secondary);
		font-weight: 500;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.sort-chip.active {
		background: var(--primary);
		color: white;
	}

	.sort-dir {
		margin-left: 2px;
		font-size: 0.7rem;
	}

	.view-toggle {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
	}

	.view-btn {
		padding: 4px;
		border-radius: var(--radius-xs);
		color: var(--text-hint);
		transition: color 0.15s;
	}

	.view-btn.active {
		color: var(--primary);
	}

	.view-btn.has-filters {
		position: relative;
	}

	.view-btn.has-filters::after {
		content: '';
		position: absolute;
		top: 2px;
		right: 2px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent, #FF5722);
	}

	.filter-bar {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px 16px;
		background: var(--surface);
		border-bottom: 1px solid var(--divider);
		position: sticky;
		top: 93px;
		z-index: 49;
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.filter-input {
		flex: 1;
		padding: 6px 10px;
		font-size: 0.82rem;
		border: 1px solid var(--divider);
		border-radius: var(--radius-sm);
		background: var(--background);
		color: var(--text);
		outline: none;
		transition: border-color 0.15s;
	}

	.filter-input:focus {
		border-color: var(--primary);
	}

	.filter-clear {
		padding: 4px 8px;
		font-size: 0.75rem;
		color: var(--text-hint);
		border-radius: var(--radius-sm);
		transition: color 0.15s;
	}

	.filter-clear:hover {
		color: var(--text);
	}

	.filters-panel {
		flex-direction: column;
		gap: 8px;
	}

	.sub-bar-row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.sub-bar-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.sub-bar-pills {
		display: flex;
		gap: 6px;
		flex-wrap: nowrap;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		min-width: 0;
	}

	.sub-bar-pills::-webkit-scrollbar {
		display: none;
	}

	.best-at-pill {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		font-size: 0.78rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--background);
		color: var(--text-secondary);
		border: 1px solid var(--divider);
		transition: all 0.15s;
		font-variant-numeric: tabular-nums;
	}

	.best-at-pill:hover {
		border-color: var(--primary);
	}

	.best-at-pill.active {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.type-pill {
		padding: 4px 12px;
		border-radius: 14px;
		font-size: 0.72rem;
		font-weight: 600;
		background: var(--background);
		color: var(--text-secondary);
		border: 1px solid var(--divider);
		transition: all 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.type-pill.bgg {
		background: #E8EAF6;
		color: #3949AB;
		border-color: #C5CAE9;
	}

	.type-pill.custom {
		background: #E0F2F1;
		color: #00695C;
		border-color: #B2DFDB;
	}

	.type-pill:hover {
		border-color: var(--primary);
	}

	.type-pill.custom:hover {
		border-color: #00897B;
	}

	.type-pill.active {
		background: #3949AB;
		color: white;
		border-color: #3949AB;
	}

	.type-pill.custom.active {
		background: #00695C;
		color: white;
		border-color: #00695C;
	}

	.type-pill.cat {
		background: #FFF3E0;
		color: #E65100;
		border-color: #FFE0B2;
	}

	.type-pill.cat:hover {
		border-color: #FB8C00;
	}

	.type-pill.cat.active {
		background: #E65100;
		color: white;
		border-color: #E65100;
	}

	.weight-row {
		gap: 10px;
	}

	.weight-track-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
	}

	.weight-steps {
		display: flex;
		justify-content: space-between;
		padding: 0 2px;
	}

	.weight-step {
		font-size: 0.58rem;
		color: var(--text-hint);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		width: 12px;
		text-align: center;
	}

	.weight-slider {
		width: 100%;
		height: 6px;
		appearance: none;
		-webkit-appearance: none;
		background: var(--divider);
		border-radius: 3px;
		outline: none;
		cursor: pointer;
		margin: 0;
	}

	.weight-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--primary);
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	.weight-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--primary);
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	.weight-slider::-moz-range-track {
		background: var(--divider);
		border-radius: 3px;
		height: 6px;
	}

	.weight-value {
		font-size: 0.78rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--text);
		min-width: 24px;
		text-align: center;
	}

	.game-list {
		background: var(--surface);
	}

	.game-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
		padding: 12px 16px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 24px;
		text-align: center;
		gap: 8px;
	}

	.empty-state.small {
		padding: 40px 24px;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 8px;
	}

	.empty-state h2 {
		font-size: 1.4rem;
		font-weight: 700;
	}

	.empty-state p {
		color: var(--text-secondary);
		font-size: 0.9rem;
		max-width: 300px;
	}

	.empty-state.onboarding {
		padding: 40px 24px;
		gap: 12px;
	}

	.onboarding-section {
		text-align: left;
		max-width: 340px;
		width: 100%;
	}

	.onboarding-section h3 {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--primary);
		margin-bottom: 4px;
	}

	.onboarding-section p,
	.onboarding-section li {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.onboarding-section ol {
		padding-left: 18px;
		margin: 0;
	}

	.onboarding-section li {
		margin-bottom: 2px;
	}

	.onboarding-section strong {
		color: var(--text);
	}

	.cta-link {
		margin-top: 8px;
		font-weight: 600;
		color: var(--primary);
		font-size: 0.9rem;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 60px;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--divider);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 450px) {
		.view-mode-btn {
			display: none;
		}
	}

	.donate-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 24px 16px 32px;
	}

	.donate-label {
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-align: center;
	}

	.donate-row :global(input[type="image"]) {
		border: none;
		outline: none;
	}
</style>
