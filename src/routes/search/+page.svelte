<script lang="ts">
	import { getBggGameFromUrl, isBggUrl } from '$lib/bgg';
	import { getAuthState } from '$lib/auth.svelte';
	import {
		isInCollection,
		importBggCsv,
		enrichMissingThumbnails,
		type ImportProgress
	} from '$lib/collection.svelte';
	import { parseBggCsv } from '$lib/csv';
	import GameDetailDialog from '$lib/components/GameDetailDialog.svelte';
	import type { BggGameDetails } from '$lib/types';

	const authState = getAuthState();

	// Link paste state
	let linkInput = $state('');
	let linkLoading = $state(false);
	let linkError = $state('');
	let selectedGame = $state<BggGameDetails | null>(null);

	// CSV import state
	let dragOver = $state(false);
	let importProgress = $state<ImportProgress | null>(null);
	let importError = $state('');

	// --- Paste BGG Link ---
	async function handleLinkSubmit(e: Event) {
		e.preventDefault();
		const url = linkInput.trim();
		if (!url || !isBggUrl(url)) {
			linkError = 'Please paste a valid BoardGameGeek link.';
			return;
		}

		linkLoading = true;
		linkError = '';

		try {
			const details = await getBggGameFromUrl(url);
			if (details) {
				selectedGame = details;
				linkInput = '';
			} else {
				linkError = 'Could not find a game at that URL.';
			}
		} catch {
			linkError = 'Failed to fetch game. Check the URL and try again.';
		} finally {
			linkLoading = false;
		}
	}

	// --- CSV Import ---
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) processFile(file);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processFile(file);
		input.value = '';
	}

	async function processFile(file: File) {
		if (!authState.user) {
			importError = 'Sign in to import your collection.';
			return;
		}

		if (!file.name.endsWith('.csv')) {
			importError = 'Please upload a .csv file exported from BGG.';
			return;
		}

		importError = '';

		try {
			const text = await file.text();
			const csvGames = parseBggCsv(text);

			if (csvGames.length === 0) {
				importError = 'No games found in the CSV file.';
				return;
			}

			// Phase 1: Import CSV data
			await importBggCsv(authState.user.uid, csvGames, (p) => {
				importProgress = { ...p };
			});

			// Phase 2: Enrich games missing thumbnails
			await enrichMissingThumbnails(authState.user.uid, (p) => {
				importProgress = { ...p };
			});

			importProgress = null;
		} catch (err) {
			console.error('CSV import error:', err);
			importError = 'Import failed. Make sure this is a valid BGG collection export.';
			importProgress = null;
		}
	}
</script>

<div class="add-page">
	<h1 class="page-title">Add Games</h1>

	<!-- SECTION 1: Search BGG — coming soon -->
	<section class="card card-disabled">
		<div class="card-header">
			<span class="card-icon">🔍</span>
			<div>
				<h2 class="card-title">Search BGG</h2>
				<span class="badge-soon">Coming soon</span>
			</div>
		</div>
		<p class="card-desc">Search BoardGameGeek by name once your API key is approved.</p>
	</section>

	<!-- SECTION 2: Paste BGG Link -->
	<section class="card">
		<div class="card-header">
			<span class="card-icon">🔗</span>
			<h2 class="card-title">Paste a BGG link</h2>
		</div>
		<p class="card-desc">Paste a BoardGameGeek game URL to add it directly.</p>

		<form class="link-form" onsubmit={handleLinkSubmit}>
			<div class="link-input-row">
				<input
					type="url"
					bind:value={linkInput}
					placeholder="https://boardgamegeek.com/boardgame/..."
					class="link-input"
				/>
				<button
					type="submit"
					class="link-btn"
					disabled={linkLoading || !linkInput.trim()}
				>
					{#if linkLoading}
						<span class="mini-spinner"></span>
					{:else}
						Add
					{/if}
				</button>
			</div>
			{#if linkError}
				<p class="field-error">{linkError}</p>
			{/if}
		</form>
	</section>

	<!-- SECTION 3: Upload CSV -->
	<section class="card">
		<div class="card-header">
			<span class="card-icon">📁</span>
			<h2 class="card-title">Import BGG collection</h2>
		</div>
		<p class="card-desc">
			Upload a CSV exported from BGG. Existing games will have their BGG data refreshed; new games will be added.
		</p>

		{#if importProgress}
			<div class="import-progress">
				<div class="import-phase">
					{#if importProgress.phase === 'importing'}
						📦 Importing games...
					{:else if importProgress.phase === 'enriching'}
						🖼️ Fetching thumbnails...
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
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="drop-zone"
				class:drag-over={dragOver}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
			>
				<p class="drop-label">
					Drop a <strong>.csv</strong> file here or
					<label class="file-pick">
						browse
						<input
							type="file"
							accept=".csv"
							onchange={handleFileInput}
							hidden
						/>
					</label>
				</p>
				<p class="drop-hint">BGG → Your profile → My Collection → Export → CSV</p>
			</div>
		{/if}

		{#if importError}
			<p class="field-error">{importError}</p>
		{/if}
	</section>
</div>

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

	/* Card sections */
	.card {
		background: var(--surface);
		border-radius: var(--radius);
		padding: 16px;
		box-shadow: var(--shadow-sm);
	}

	.card-disabled {
		opacity: 0.5;
		pointer-events: none;
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

	.badge-soon {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 1px 7px;
		border-radius: 8px;
		background: var(--divider);
		color: var(--text-secondary);
		margin-left: 6px;
		vertical-align: middle;
	}

	.card-desc {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin-bottom: 12px;
	}

	/* Link form */
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

	/* Drop zone */
	.drop-zone {
		padding: 22px 16px;
		border: 2px dashed var(--divider);
		border-radius: var(--radius-sm);
		text-align: center;
		transition: border-color 0.2s, background 0.2s;
	}

	.drop-zone.drag-over {
		border-color: var(--primary);
		background: rgba(92, 107, 192, 0.06);
	}

	.drop-label {
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	.file-pick {
		color: var(--primary);
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.drop-hint {
		font-size: 0.7rem;
		color: var(--text-hint);
		margin-top: 6px;
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
