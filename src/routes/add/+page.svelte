<script lang="ts">
	import { goto } from '$app/navigation';
	import { searchBggGames, getBggGameDetails, fetchBggCollection } from '$lib/bgg';
	import { getAuthState, loginWithGoogle } from '$lib/auth.svelte';
	import {
		getCollection,
		getGameFromCollection,
		addGameToCollection,
		importBggCsv,
		enrichMissingThumbnails,
		type ImportProgress
	} from '$lib/collection.svelte';
	import GameDetailDialog from '$lib/components/GameDetailDialog.svelte';
	import type { BggGameDetails, GameEntry } from '$lib/types';

	const authState = getAuthState();
	const col = getCollection();

	// --- Single game search ---
	let searchQuery = $state('');
	let searchLoading = $state(false);
	let searchError = $state('');
	let searchResults = $state<{ id: number; name: string; yearPublished: number }[]>([]);
	let selectedGame = $state<BggGameDetails | null>(null);
	let loadingGameId = $state<number | null>(null);

	async function handleSearch(e: Event) {
		e.preventDefault();
		const q = searchQuery.trim();
		if (!q) return;

		searchLoading = true;
		searchError = '';
		searchResults = [];

		try {
			searchResults = await searchBggGames(q);
			if (searchResults.length === 0) searchError = 'No games found.';
		} catch {
			searchError = 'Search failed. Try again.';
		} finally {
			searchLoading = false;
		}
	}

	async function selectSearchResult(id: number) {
		loadingGameId = id;
		try {
			const details = await getBggGameDetails(id);
			if (details) selectedGame = details;
		} catch {
			searchError = 'Failed to load game details.';
		} finally {
			loadingGameId = null;
		}
	}

	// --- BGG collection import ---
	let bggUsername = $state('');
	let fetchLoading = $state(false);
	let fetchError = $state('');
	let importProgress = $state<ImportProgress | null>(null);

	interface ImportRow {
		game: BggGameDetails;
		existing: GameEntry | undefined;
		action: 'new' | 'update' | 'unchanged';
		selected: boolean;
		changes: string[];
	}
	let importRows = $state<ImportRow[]>([]);
	let showReview = $state(false);

	function diffGame(incoming: BggGameDetails, existing: GameEntry): string[] {
		const diffs: string[] = [];
		if (incoming.bggScore && Math.abs(incoming.bggScore - existing.bggScore) >= 0.05)
			diffs.push(`BGG score ${existing.bggScore.toFixed(1)} → ${incoming.bggScore.toFixed(1)}`);
		if (incoming.weight && Math.abs(incoming.weight - existing.weight) >= 0.05)
			diffs.push(`Weight ${existing.weight.toFixed(1)} → ${incoming.weight.toFixed(1)}`);
		if (incoming.minPlayers && incoming.minPlayers !== existing.minPlayers)
			diffs.push(`Min players ${existing.minPlayers} → ${incoming.minPlayers}`);
		if (incoming.maxPlayers && incoming.maxPlayers !== existing.maxPlayers)
			diffs.push(`Max players ${existing.maxPlayers} → ${incoming.maxPlayers}`);
		if (incoming.playingTime && incoming.playingTime !== existing.playingTime)
			diffs.push(`Play time ${existing.playingTime}min → ${incoming.playingTime}min`);
		if (incoming.yearPublished && incoming.yearPublished !== existing.yearPublished)
			diffs.push(`Year ${existing.yearPublished} → ${incoming.yearPublished}`);
		return diffs;
	}

	async function handleFetchCollection(e: Event) {
		e.preventDefault();
		const username = bggUsername.trim();
		if (!username) return;

		fetchLoading = true;
		fetchError = '';
		importRows = [];
		showReview = false;

		try {
			const raw = await fetchBggCollection(username);
			const seen = new Set<number>();
			const bggGames = raw.filter((g) => {
				if (seen.has(g.id)) return false;
				seen.add(g.id);
				return true;
			});
			if (bggGames.length === 0) {
				fetchError = 'No games found in that BGG collection.';
				return;
			}

			const hasExisting = col.games.length > 0;

			if (!hasExisting) {
				if (!authState.user) return;
				await importBggCsv(authState.user.uid, bggGames, (p) => {
					importProgress = { ...p };
				});
				await enrichMissingThumbnails(authState.user.uid, (p) => {
					importProgress = { ...p };
				});
				importProgress = null;
				goto('/collection');
			} else {
				// Build review table
				const rows: ImportRow[] = bggGames.map((game) => {
					const existing = getGameFromCollection(game.id);
					if (!existing) {
						return { game, existing: undefined, action: 'new' as const, selected: true, changes: [] };
					}
					const changes = diffGame(game, existing);
					const action = changes.length > 0 ? ('update' as const) : ('unchanged' as const);
					return { game, existing, action, selected: changes.length > 0, changes };
				});

				// Sort: new first, then updates, then unchanged
				const order = { new: 0, update: 1, unchanged: 2 };
				rows.sort((a, b) => order[a.action] - order[b.action]);

				importRows = rows;
				showReview = true;
			}
		} catch (err) {
			fetchError = err instanceof Error ? err.message : 'Failed to fetch collection from BGG.';
		} finally {
			fetchLoading = false;
		}
	}

	const selectedCount = $derived(importRows.filter((r) => r.selected).length);
	const newCount = $derived(importRows.filter((r) => r.action === 'new').length);
	const updateCount = $derived(importRows.filter((r) => r.action === 'update').length);

	function toggleAll(checked: boolean) {
		importRows = importRows.map((r) =>
			r.action === 'unchanged' ? r : { ...r, selected: checked }
		);
	}

	async function applyImport() {
		if (!authState.user) return;
		const selected = importRows.filter((r) => r.selected && r.action !== 'unchanged');
		const games = selected.map((r) => r.game);

		if (games.length === 0) return;

		showReview = false;

		try {
			await importBggCsv(authState.user.uid, games, (p) => {
				importProgress = { ...p };
			});
			await enrichMissingThumbnails(authState.user.uid, (p) => {
				importProgress = { ...p };
			});
		} finally {
			importProgress = null;
			importRows = [];
		}
		goto('/collection');
	}

	function cancelReview() {
		showReview = false;
		importRows = [];
	}
</script>

<div class="add-page">
	<h1 class="page-title">Add Games</h1>

	{#if !authState.user}
		<section class="card sign-in-card">
			<p class="sign-in-msg">Sign in to add games to your collection.</p>
			<button class="sign-in-action" onclick={loginWithGoogle}>
				Sign in with Google
			</button>
		</section>
	{:else}

	<!-- SECTION 1: Search BGG -->
	<section class="card">
		<div class="card-header">
			<span class="card-icon">🔍</span>
			<h2 class="card-title">Search BGG</h2>
		</div>
		<p class="card-desc">Find a board game by name on BoardGameGeek.</p>

		<form class="link-form" onsubmit={handleSearch}>
			<div class="link-input-row">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="e.g. Wingspan, Brass Birmingham…"
					class="link-input"
				/>
				<button
					type="submit"
					class="link-btn"
					disabled={searchLoading || !searchQuery.trim()}
				>
					{#if searchLoading}
						<span class="mini-spinner"></span>
					{:else}
						Search
					{/if}
				</button>
			</div>
			{#if searchError}
				<p class="field-error">{searchError}</p>
			{/if}
		</form>

		{#if searchResults.length > 0}
			<ul class="search-results">
				{#each searchResults.slice(0, 20) as result (result.id)}
					<li>
						<button
							class="search-result-btn"
							onclick={() => selectSearchResult(result.id)}
							disabled={loadingGameId === result.id}
						>
							<span class="sr-name">{result.name}</span>
							{#if result.yearPublished}
								<span class="sr-year">({result.yearPublished})</span>
							{/if}
							{#if loadingGameId === result.id}
								<span class="mini-spinner dark"></span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- SECTION 2: Import BGG Collection -->
	<section class="card">
		<div class="card-header">
			<span class="card-icon">📦</span>
			<h2 class="card-title">Import BGG collection</h2>
		</div>
		<p class="card-desc">
			Enter your BoardGameGeek username to import your entire collection.
		</p>

		{#if fetchLoading}
			<div class="import-progress">
				<div class="import-phase">🔄 Fetching collection from BGG...</div>
				<p class="progress-detail">This can take a few seconds — BGG prepares your data on demand</p>
			</div>
		{:else if importProgress}
			<div class="import-progress">
				<div class="import-phase">
					{#if importProgress.phase === 'importing'}
						📦 Importing games...
					{:else if importProgress.phase === 'enriching'}
						🖼️ Fetching details...
					{:else}
						✅ Import complete!
					{/if}
				</div>
				{#if importProgress.phase !== 'done'}
					<div class="progress-bar-track">
						<div
							class="progress-bar-fill"
							style:width="{Math.round((importProgress.done / Math.max(importProgress.total, 1)) * 100)}%"
						></div>
					</div>
					<div class="progress-detail">
						{importProgress.done}/{importProgress.total}
						{#if importProgress.current}
							— {importProgress.current}
						{/if}
					</div>
				{/if}
			</div>
		{:else if !showReview}
			<form class="link-form" onsubmit={handleFetchCollection}>
				<div class="link-input-row">
					<input
						type="text"
						bind:value={bggUsername}
						placeholder="BGG username"
						class="link-input"
					/>
					<button
						type="submit"
						class="link-btn"
						disabled={fetchLoading || !bggUsername.trim()}
					>
						{#if fetchLoading}
							<span class="mini-spinner"></span>
						{:else}
							Import
						{/if}
					</button>
				</div>
				{#if fetchError}
					<p class="field-error">{fetchError}</p>
				{/if}
			</form>
		{/if}
	</section>

	{/if}
</div>

<!-- Review dialog (shown when collection is non-empty) -->
{#if showReview}
	<div class="review-backdrop">
		<div class="review-panel">
			<header class="review-header">
				<div>
					<h2>Review import</h2>
					<p class="review-summary">
						<span class="badge badge-new">{newCount} new</span>
						<span class="badge badge-update">{updateCount} updates</span>
						<span class="badge badge-unchanged">{importRows.length - newCount - updateCount} unchanged</span>
					</p>
				</div>
				<button class="review-close" onclick={cancelReview} aria-label="Cancel">✕</button>
			</header>

			<div class="review-table-wrap">
				<table class="review-table">
					<thead>
						<tr>
							<th class="th-check">
								<input
									type="checkbox"
									checked={selectedCount === importRows.filter((r) => r.action !== 'unchanged').length && selectedCount > 0}
									onchange={(e) => toggleAll((e.target as HTMLInputElement).checked)}
								/>
							</th>
							<th class="th-game">Game</th>
							<th class="th-status">Status</th>
							<th class="th-changes">Changes</th>
						</tr>
					</thead>
					<tbody>
						{#each importRows as row, i (row.game.id)}
							<tr
								class:row-new={row.action === 'new'}
								class:row-update={row.action === 'update'}
								class:row-unchanged={row.action === 'unchanged'}
							>
								<td class="td-check">
									{#if row.action !== 'unchanged'}
										<input
											type="checkbox"
											bind:checked={importRows[i].selected}
										/>
									{:else}
										<span class="check-dash">—</span>
									{/if}
								</td>
								<td class="td-game">
									<span class="game-name">{row.game.name}</span>
									{#if row.game.yearPublished}
										<span class="game-year">({row.game.yearPublished})</span>
									{/if}
								</td>
								<td class="td-status">
									{#if row.action === 'new'}
										<span class="status-badge status-new">New</span>
									{:else if row.action === 'update'}
										<span class="status-badge status-update">Update</span>
									{:else}
										<span class="status-badge status-unchanged">No change</span>
									{/if}
								</td>
								<td class="td-changes">
									{#if row.changes.length > 0}
										<ul class="changes-list">
											{#each row.changes as change, ci (ci)}
												<li>{change}</li>
											{/each}
										</ul>
									{:else if row.action === 'new'}
										<span class="changes-hint">Will be added</span>
									{:else}
										<span class="changes-hint">Up to date</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<footer class="review-footer">
				<button class="btn-cancel" onclick={cancelReview}>Cancel</button>
				<button
					class="btn-apply"
					onclick={applyImport}
					disabled={selectedCount === 0}
				>
					Apply {selectedCount} {selectedCount === 1 ? 'change' : 'changes'}
				</button>
			</footer>
		</div>
	</div>
{/if}

<GameDetailDialog
	bggDetails={selectedGame}
	onclose={() => (selectedGame = null)}
/>

<style>
	.add-page {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.page-title {
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text);
		padding: 4px 0 2px;
	}

	.card {
		background: var(--surface);
		border-radius: var(--radius);
		padding: 16px;
		box-shadow: var(--shadow-sm);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 6px;
	}

	.card-icon {
		font-size: 1.4rem;
		flex-shrink: 0;
	}

	.card-title {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text);
	}

	.card-desc {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin-bottom: 12px;
	}

	/* Shared form */
	.link-form {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.link-input-row {
		display: flex;
		gap: 8px;
	}

	.link-input {
		flex: 1;
		padding: 9px 12px;
		font-size: 0.85rem;
		border: 1px solid var(--divider);
		border-radius: var(--radius-sm);
		background: var(--background);
		color: var(--text);
		min-width: 0;
	}

	.link-input:focus {
		border-color: var(--primary);
		outline: none;
	}

	.link-btn {
		padding: 9px 18px;
		background: var(--primary);
		color: white;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
		transition: background 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 56px;
	}

	.link-btn:hover:not(:disabled) {
		background: var(--primary-dark);
	}

	.link-btn:disabled {
		opacity: 0.5;
	}

	.field-error {
		font-size: 0.78rem;
		color: var(--error);
		margin-top: 4px;
	}

	/* Search results */
	.search-results {
		list-style: none;
		margin-top: 10px;
		max-height: 320px;
		overflow-y: auto;
		border: 1px solid var(--divider);
		border-radius: var(--radius-sm);
	}

	.search-result-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 10px 12px;
		text-align: left;
		font-size: 0.82rem;
		color: var(--text);
		border-bottom: 1px solid var(--divider);
		transition: background 0.12s;
	}

	.search-result-btn:last-child {
		border-bottom: none;
	}

	.search-result-btn:hover:not(:disabled) {
		background: rgba(92, 107, 192, 0.06);
	}

	.sr-name {
		font-weight: 600;
		flex: 1;
		min-width: 0;
	}

	.sr-year {
		color: var(--text-secondary);
		font-size: 0.78rem;
		flex-shrink: 0;
	}

	/* Import progress */
	.import-progress {
		padding: 12px;
		background: var(--background);
		border-radius: var(--radius-sm);
	}

	.import-phase {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 8px;
	}

	.progress-bar-track {
		height: 5px;
		background: var(--divider);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--primary);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-detail {
		font-size: 0.73rem;
		color: var(--text-secondary);
		margin-top: 5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mini-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.mini-spinner.dark {
		border-color: rgba(0, 0, 0, 0.1);
		border-top-color: var(--primary);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Review panel */
	.review-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
	}

	.review-panel {
		background: var(--surface);
		border-radius: var(--radius);
		width: 100%;
		max-width: 620px;
		max-height: calc(100dvh - 24px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: var(--shadow-lg);
	}

	.review-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--divider);
	}

	.review-header h2 {
		font-size: 1rem;
		font-weight: 700;
	}

	.review-summary {
		display: flex;
		gap: 6px;
		margin-top: 4px;
		flex-wrap: wrap;
	}

	.badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 1px 7px;
		border-radius: 8px;
	}

	.badge-new {
		background: #e8f5e9;
		color: #2e7d32;
	}

	.badge-update {
		background: #fff3e0;
		color: #e65100;
	}

	.badge-unchanged {
		background: var(--divider);
		color: var(--text-secondary);
	}

	.review-close {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		color: var(--text-secondary);
		flex-shrink: 0;
		transition: background 0.15s;
	}

	.review-close:hover {
		background: var(--divider);
	}

	.review-table-wrap {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}

	.review-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.78rem;
	}

	.review-table thead {
		position: sticky;
		top: 0;
		background: var(--surface);
		z-index: 1;
	}

	.review-table th {
		text-align: left;
		padding: 8px 10px;
		font-weight: 600;
		color: var(--text-secondary);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-bottom: 1px solid var(--divider);
	}

	.review-table td {
		padding: 8px 10px;
		border-bottom: 1px solid var(--divider);
		vertical-align: top;
	}

	.th-check, .td-check {
		width: 36px;
		text-align: center;
	}

	.th-status, .td-status {
		width: 72px;
	}

	.check-dash {
		color: var(--text-hint);
		font-size: 0.8rem;
	}

	.row-new {
		background: rgba(46, 125, 50, 0.04);
	}

	.row-update {
		background: rgba(230, 81, 0, 0.04);
	}

	.row-unchanged {
		opacity: 0.55;
	}

	.game-name {
		font-weight: 600;
		color: var(--text);
	}

	.game-year {
		color: var(--text-secondary);
		margin-left: 4px;
	}

	.status-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 6px;
		white-space: nowrap;
	}

	.status-new {
		background: #e8f5e9;
		color: #2e7d32;
	}

	.status-update {
		background: #fff3e0;
		color: #e65100;
	}

	.status-unchanged {
		background: var(--divider);
		color: var(--text-secondary);
	}

	.changes-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.changes-list li {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.changes-hint {
		font-size: 0.72rem;
		color: var(--text-hint);
	}

	.review-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--divider);
	}

	.btn-cancel {
		padding: 8px 16px;
		font-size: 0.82rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		transition: background 0.15s;
	}

	.btn-cancel:hover {
		background: var(--divider);
	}

	.btn-apply {
		padding: 8px 20px;
		font-size: 0.82rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: white;
		transition: background 0.15s;
	}

	.btn-apply:hover:not(:disabled) {
		background: var(--primary-dark);
	}

	.btn-apply:disabled {
		opacity: 0.5;
	}

	.sign-in-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 32px 16px;
	}

	.sign-in-msg {
		font-size: 0.88rem;
		color: var(--text-secondary);
		text-align: center;
	}

	.sign-in-action {
		padding: 10px 24px;
		background: var(--primary);
		color: white;
		border-radius: 20px;
		font-size: 0.88rem;
		font-weight: 600;
		transition: background 0.15s;
	}

	.sign-in-action:hover {
		background: var(--primary-dark);
	}

	/* Responsive: hide changes column on small screens */
	@media (max-width: 480px) {
		.th-changes, .td-changes {
			display: none;
		}
	}
</style>
