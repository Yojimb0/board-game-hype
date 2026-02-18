<!-- @component
	#### HUMANIBOOK
	- Full game detail dialog using native <dialog> element
	- Shows BGG info, collection controls (labels, play dates, hype, notes)
	- Responsive: bottom sheet on mobile, centered modal on desktop

	### LAYOUT
	- Sticky header with close button
	- Scrollable content area
	- Bottom action bar for add/remove
-->
<script lang="ts">
	import type { BggGameDetails } from '$lib/types';
	import { calculateHypeScore, getHypeColor, getHypeLabel } from '$lib/hype';
	import { getAuthState } from '$lib/auth.svelte';
	import BggScoreBadge from './BggScoreBadge.svelte';
	import PlayerCount from './PlayerCount.svelte';
	import WeightBadge from './WeightBadge.svelte';
	import {
		isInCollection,
		getGameFromCollection,
		getCollection,
		addGameToCollection,
		removeGameFromCollection,
		nudgeHype,
		toggleHidden,
		addPlayDate,
		removePlayDate,
		addLabel,
		removeLabel,
		updatePersonalNote
	} from '$lib/collection.svelte';

	interface Props {
		bggDetails: BggGameDetails | null;
		onclose?: () => void;
	}

	let { bggDetails, onclose }: Props = $props();

	const authState = getAuthState();
	const collection = getCollection();

	let dialogEl: HTMLDialogElement | undefined = $state();
	let newLabel = $state('');
	let newPlayDate = $state('');
	let noteText = $state('');
	let noteSaveTimeout: ReturnType<typeof setTimeout> | undefined = $state();
	let saving = $state(false);
	let labelPopoverOpen = $state(false);
	let labelInputEl: HTMLInputElement | undefined = $state();
	let showDatePicker = $state(false);

	function todayStr() {
		return new Date().toISOString().slice(0, 10);
	}

	function yesterdayStr() {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		return d.toISOString().slice(0, 10);
	}

	async function addQuickDate(dateStr: string) {
		if (!authState.user || !bggDetails) return;
		await addPlayDate(authState.user.uid, bggDetails.id, dateStr);
	}

	const allLabels = $derived.by(() => {
		const set = new Set<string>();
		for (const g of collection.games) {
			if (g.labels) {
				for (const l of g.labels) set.add(l);
			}
		}
		return [...set].sort();
	});

	const suggestedLabels = $derived.by(() => {
		const current = collectionEntry?.labels ?? [];
		return allLabels.filter((l) => !current.includes(l));
	});

	function openLabelPopover() {
		labelPopoverOpen = true;
		newLabel = '';
		setTimeout(() => labelInputEl?.focus(), 0);
	}

	function closeLabelPopover() {
		labelPopoverOpen = false;
		newLabel = '';
	}

	async function handleQuickAddLabel(label: string) {
		if (!authState.user || !bggDetails) return;
		await addLabel(authState.user.uid, bggDetails.id, label);
	}

	const inCollection = $derived(bggDetails ? isInCollection(bggDetails.id) : false);
	const collectionEntry = $derived(
		bggDetails ? getGameFromCollection(bggDetails.id) : undefined
	);

	const hypeScore = $derived(
		collectionEntry ? calculateHypeScore(collectionEntry.hypeEvents) : 0
	);
	const hypeColor = $derived(getHypeColor(hypeScore));
	const hypeLabel = $derived(getHypeLabel(hypeScore));

	$effect(() => {
		if (collectionEntry) {
			noteText = collectionEntry.personalNote || '';
		}
	});

	$effect(() => {
		if (bggDetails && dialogEl) {
			dialogEl.showModal();
		}
	});

	function handleClose() {
		if (noteSaveTimeout) clearTimeout(noteSaveTimeout);
		showDatePicker = false;
		dialogEl?.close();
		onclose?.();
	}

	function handleDialogClick(e: MouseEvent) {
		if (e.target === dialogEl) handleClose();
	}

	async function handleAdd() {
		if (!authState.user || !bggDetails) return;
		saving = true;
		try {
			await addGameToCollection(authState.user.uid, bggDetails);
		} finally {
			saving = false;
		}
	}

	async function handleRemove() {
		if (!authState.user || !bggDetails) return;
		if (!confirm('Remove this game from your collection?')) return;
		saving = true;
		try {
			await removeGameFromCollection(authState.user.uid, bggDetails.id);
			handleClose();
		} finally {
			saving = false;
		}
	}

	async function handleNudge(direction: 1 | -1) {
		if (!authState.user || !bggDetails) return;
		await nudgeHype(authState.user.uid, bggDetails.id, direction);
	}

	async function handleToggleHidden() {
		if (!authState.user || !bggDetails || !collectionEntry) return;
		await toggleHidden(authState.user.uid, bggDetails.id, !collectionEntry.hidden);
	}

	async function handleAddLabel() {
		const label = newLabel.trim();
		if (!label || !authState.user || !bggDetails) return;
		await addLabel(authState.user.uid, bggDetails.id, label);
		newLabel = '';
	}

	async function handleRemoveLabel(label: string) {
		if (!authState.user || !bggDetails) return;
		await removeLabel(authState.user.uid, bggDetails.id, label);
	}

	async function handleAddPlayDate() {
		if (!newPlayDate || !authState.user || !bggDetails) return;
		await addPlayDate(authState.user.uid, bggDetails.id, newPlayDate);
		newPlayDate = '';
		showDatePicker = false;
	}

	async function handleRemovePlayDate(date: string) {
		if (!authState.user || !bggDetails) return;
		await removePlayDate(authState.user.uid, bggDetails.id, date);
	}

	function handleNoteChange(e: Event) {
		const value = (e.target as HTMLTextAreaElement).value;
		noteText = value;
		if (noteSaveTimeout) clearTimeout(noteSaveTimeout);
		noteSaveTimeout = setTimeout(() => {
			if (authState.user && bggDetails) {
				updatePersonalNote(authState.user.uid, bggDetails.id, value);
			}
		}, 800);
	}
</script>

{#if bggDetails}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog bind:this={dialogEl} class="game-dialog" onclick={handleDialogClick}>
		<div class="dialog-content">
			<header class="dialog-header">
				<h2>{bggDetails.name}</h2>
				<button class="close-btn" onclick={handleClose} aria-label="Close">✕</button>
			</header>

			<div class="dialog-body">
				{#if bggDetails.image}
					<div class="hero-image">
						<img src={bggDetails.image} alt={bggDetails.name} />
						<div class="hero-bgg-badge">
							<BggScoreBadge score={bggDetails.bggScore} size="lg" />
						</div>
					</div>
				{/if}

				<div class="stats-row">
					<PlayerCount
						min={bggDetails.minPlayers}
						max={bggDetails.maxPlayers}
						best={bggDetails.bestPlayerCount}
						recommended={bggDetails.recommendedPlayerCount || []}
						size="lg"
					/>
					<WeightBadge weight={bggDetails.weight} size="lg" />
					<span class="time-pill">⏱️ {bggDetails.playingTime}'</span>
				</div>

				<div class="section">
					<div class="tag-list">
						{#each bggDetails.bggType || [] as t (t)}
							<span class="tag bgg-tag">{t}</span>
						{/each}
						{#if inCollection && collectionEntry}
							{#each collectionEntry.labels || [] as label (label)}
								<span class="tag custom-tag">
									{label}
									<button
										class="tag-remove"
										onclick={() => handleRemoveLabel(label)}
									>✕</button>
								</span>
							{/each}
						{/if}
						{#each bggDetails.categories || [] as cat (cat)}
							<span class="tag cat-tag">{cat}</span>
						{/each}
						{#if inCollection}
							<button class="tag-add-btn" onclick={openLabelPopover} title="Add label">+</button>
						{/if}
					</div>
					{#if labelPopoverOpen}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="label-popover-backdrop" onclick={closeLabelPopover}></div>
						<div class="label-popover">
							<form
								class="label-popover-input"
								onsubmit={(e) => {
									e.preventDefault();
									handleAddLabel();
									if (newLabel === '') closeLabelPopover();
								}}
							>
								<input
									bind:this={labelInputEl}
									bind:value={newLabel}
									type="text"
									placeholder="New label…"
									maxlength="30"
								/>
								<button type="submit" class="label-popover-create" disabled={!newLabel.trim()}>Add</button>
							</form>
							{#if suggestedLabels.length > 0}
								<div class="label-popover-suggestions">
									{#each suggestedLabels as label (label)}
										<button
											class="label-suggestion"
											onclick={() => { handleQuickAddLabel(label); }}
										>
											{label}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				{#if inCollection && collectionEntry}
					<div class="hype-section">
						<p class="hype-caption">How hyped are you to play this?</p>
						<div class="hype-controls">
							<button
								class="hype-btn down"
								onclick={() => handleNudge(-1)}
								title="Cool down"
							>❄️</button>
							<div class="hype-display" style:color={hypeColor}>
								<span class="hype-score-value">🔥 {hypeScore.toFixed(1)}</span>
								<span class="hype-label-text">{hypeLabel}</span>
							</div>
							<button
								class="hype-btn up"
								onclick={() => handleNudge(1)}
								title="Hype up!"
							>🔥</button>
						</div>
					</div>
				{/if}

				{#if bggDetails.description}
					<div class="section">
						<p class="description">{bggDetails.description.slice(0, 500)}{bggDetails.description.length > 500 ? '…' : ''}</p>
					</div>
				{/if}

				{#if inCollection && collectionEntry}
					<div class="collection-section">
						<div class="subsection">
							<h4>🎲 Play Sessions</h4>
							<div class="play-date-actions">
								<button class="play-date-btn" onclick={() => addQuickDate(todayStr())}>
									📅 Today
								</button>
								<button class="play-date-btn" onclick={() => addQuickDate(yesterdayStr())}>
									⏪ Yesterday
								</button>
								<button
									class="play-date-btn earlier"
									class:active={showDatePicker}
									onclick={() => { showDatePicker = !showDatePicker; }}
								>
									📆 Earlier…
								</button>
							</div>
							{#if showDatePicker}
								<form
									class="date-picker-row"
									onsubmit={(e) => {
										e.preventDefault();
										handleAddPlayDate();
									}}
								>
									<input type="date" bind:value={newPlayDate} />
									<button type="submit" class="date-picker-add" disabled={!newPlayDate}>Add</button>
								</form>
							{/if}
							{#if collectionEntry.playDates.length > 0}
								<div class="play-dates-list">
									{#each [...collectionEntry.playDates].sort().reverse() as date (date)}
										<span class="date-chip">
											{new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
											<button
												class="chip-remove"
												onclick={() => handleRemovePlayDate(date)}
											>✕</button>
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<div class="subsection">
							<h4>📝 Notes</h4>
							<textarea
								class="note-input"
								value={noteText}
								oninput={handleNoteChange}
								placeholder="Your thoughts on this game..."
								rows="3"
							></textarea>
						</div>
					</div>
				{/if}

				<div class="dialog-actions">
					{#if !authState.user}
						<a
							href="https://boardgamegeek.com/boardgame/{bggDetails.id}"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-bgg"
						>View on BoardGameGeek</a>
						<p class="hint">Sign in to manage your collection</p>
					{:else if inCollection && collectionEntry}
						<a
							href="https://boardgamegeek.com/boardgame/{bggDetails.id}"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-bgg"
						>View on BoardGameGeek</a>
						<div class="bottom-row">
							<button class="btn btn-hide" onclick={handleToggleHidden}>
								{#if collectionEntry.hidden}👁️ Unhide{:else}🙈 Hide{/if}
							</button>
							<button class="btn btn-danger" onclick={handleRemove} disabled={saving}>
								🗑️ Remove
							</button>
						</div>
					{:else}
						<button class="btn btn-primary" onclick={handleAdd} disabled={saving}>
							{saving ? 'Adding...' : 'Add to collection'}
						</button>
						<a
							href="https://boardgamegeek.com/boardgame/{bggDetails.id}"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-bgg"
						>View on BoardGameGeek</a>
					{/if}
				</div>
			</div>
		</div>
	</dialog>
{/if}

<style>
	.game-dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(600px, calc(100vw - 24px));
		width: 100%;
		max-height: calc(100dvh - 24px);
		overflow: visible;
		margin: auto;
	}

	.game-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	.dialog-content {
		background: var(--surface);
		border-radius: var(--radius);
		display: flex;
		flex-direction: column;
		max-height: calc(100dvh - 24px);
		overflow: hidden;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--divider);
		position: sticky;
		top: 0;
		background: var(--surface);
		z-index: 1;
	}

	.dialog-header h2 {
		font-size: 1.05rem;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding-right: 8px;
	}

	.close-btn {
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

	.close-btn:hover {
		background: var(--divider);
	}

	.dialog-body {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	/* --- Hero image with overlaid BGG badge --- */

	.hero-image {
		width: 100%;
		height: 220px;
		overflow: hidden;
		background: #f0ede8;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.hero-image img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.hero-bgg-badge {
		position: absolute;
		top: 10px;
		right: 10px;
		filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
	}

	/* --- Stats row --- */

	.stats-row {
		display: flex;
		gap: 8px;
		padding: 14px 16px;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
	}

	.time-pill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 20px;
		padding: 4px 12px 4px 9px;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text);
		white-space: nowrap;
	}

	/* --- Tags --- */

	.section {
		padding: 0 16px 12px;
		position: relative;
	}

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		align-items: center;
	}

	.tag {
		font-size: 0.7rem;
		padding: 2px 8px;
		background: var(--background);
		border-radius: 10px;
		color: var(--text-secondary);
	}

	.tag.bgg-tag {
		background: #E8EAF6;
		color: #3949AB;
		font-weight: 600;
	}

	.tag.custom-tag {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		background: #E0F2F1;
		color: #00695C;
		font-weight: 600;
	}

	.tag.cat-tag {
		background: #FFF3E0;
		color: #E65100;
	}

	.tag-remove {
		font-size: 0.6rem;
		color: inherit;
		opacity: 0.5;
		padding: 0;
		width: 14px;
		height: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		line-height: 1;
	}

	.tag-remove:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.1);
	}

	.tag-add-btn {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #E0F2F1;
		color: #00695C;
		font-size: 0.85rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s;
		line-height: 1;
	}

	.tag-add-btn:hover {
		background: #B2DFDB;
	}

	.label-popover-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.label-popover {
		position: absolute;
		right: 0;
		z-index: 11;
		background: var(--surface);
		border: 1px solid var(--divider);
		border-radius: var(--radius-sm);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		padding: 8px;
		width: max-content;
		min-width: 200px;
		max-width: calc(100% - 16px);
	}

	.label-popover-input {
		display: flex;
		gap: 6px;
		margin-bottom: 4px;
	}

	.label-popover-input input {
		flex: 1;
		font-size: 0.78rem;
		padding: 4px 8px;
		border: 1px solid var(--divider);
		border-radius: 8px;
		background: var(--background);
		min-width: 0;
	}

	.label-popover-input input:focus {
		outline: none;
		border-color: #00897B;
	}

	.label-popover-create {
		font-size: 0.72rem;
		padding: 4px 10px;
		border-radius: 8px;
		background: #E0F2F1;
		color: #00695C;
		font-weight: 600;
		white-space: nowrap;
		transition: background 0.15s;
	}

	.label-popover-create:hover:not(:disabled) {
		background: #B2DFDB;
	}

	.label-popover-create:disabled {
		opacity: 0.35;
	}

	.label-popover-suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding-top: 6px;
		border-top: 1px solid var(--divider);
		margin-top: 4px;
	}

	.label-suggestion {
		font-size: 0.7rem;
		padding: 2px 8px;
		border-radius: 10px;
		background: #E0F2F1;
		color: #00695C;
		font-weight: 500;
		transition: background 0.15s;
	}

	.label-suggestion:hover {
		background: #B2DFDB;
	}

	/* --- Hype section (above description) --- */

	.hype-section {
		margin: 0 16px 12px;
		padding: 14px 16px;
		border-radius: var(--radius);
		background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 50%, #FFE0B2 100%);
		text-align: center;
	}

	.hype-caption {
		font-size: 0.72rem;
		font-weight: 600;
		color: #BF360C;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 10px;
	}

	.hype-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
	}

	.hype-btn {
		width: 46px;
		height: 46px;
		border-radius: 50%;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, transform 0.1s;
		cursor: pointer;
	}

	.hype-btn:active {
		transform: scale(0.88);
	}

	.hype-btn.up {
		background: rgba(255, 87, 34, 0.15);
	}

	.hype-btn.up:hover {
		background: rgba(255, 87, 34, 0.3);
	}

	.hype-btn.down {
		background: rgba(3, 169, 244, 0.15);
	}

	.hype-btn.down:hover {
		background: rgba(3, 169, 244, 0.3);
	}

	.hype-display {
		text-align: center;
		min-width: 80px;
	}

	.hype-score-value {
		display: block;
		font-size: 1.4rem;
		font-weight: 800;
	}

	.hype-label-text {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	/* --- Description --- */

	.description {
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	/* --- Collection section --- */

	.collection-section {
		border-top: 1px solid var(--divider);
		padding: 14px 16px 8px;
	}

	.subsection {
		margin-bottom: 14px;
	}

	.subsection h4 {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 8px;
	}

	/* --- Play dates --- */

	.play-date-actions {
		display: flex;
		gap: 8px;
	}

	.play-date-btn {
		flex: 1;
		padding: 8px 6px;
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
		font-weight: 600;
		background: var(--background);
		color: var(--text);
		border: 1px solid var(--divider);
		transition: background 0.15s, border-color 0.15s;
		cursor: pointer;
		text-align: center;
	}

	.play-date-btn:hover {
		background: #E8EAF6;
		border-color: #C5CAE9;
	}

	.play-date-btn:active {
		background: #C5CAE9;
	}

	.play-date-btn.earlier.active {
		background: #E8EAF6;
		border-color: var(--primary);
		color: var(--primary);
	}

	.date-picker-row {
		display: flex;
		gap: 8px;
		margin-top: 8px;
		align-items: center;
	}

	.date-picker-row input {
		flex: 1;
		font-size: 0.82rem;
		padding: 6px 10px;
		border: 1px solid var(--divider);
		border-radius: var(--radius-sm);
		background: var(--surface);
	}

	.date-picker-add {
		font-size: 0.78rem;
		padding: 6px 14px;
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: white;
		font-weight: 600;
		transition: background 0.15s;
	}

	.date-picker-add:hover:not(:disabled) {
		background: var(--primary-dark);
	}

	.date-picker-add:disabled {
		opacity: 0.35;
	}

	.play-dates-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}

	.date-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.73rem;
		padding: 3px 10px;
		background: var(--background);
		border-radius: 12px;
		color: var(--text-secondary);
	}

	.chip-remove {
		font-size: 0.6rem;
		color: inherit;
		opacity: 0.4;
		padding: 0;
		width: 14px;
		height: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		line-height: 1;
	}

	.chip-remove:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.1);
	}

	/* --- Notes --- */

	.note-input {
		width: 100%;
		font-size: 0.82rem;
		padding: 8px 12px;
		border: 1px solid var(--divider);
		border-radius: var(--radius-sm);
		resize: vertical;
		min-height: 60px;
		background: var(--surface);
		color: var(--text);
		line-height: 1.5;
	}

	/* --- Bottom actions --- */

	.dialog-actions {
		padding: 12px 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.hint {
		font-size: 0.82rem;
		color: var(--text-hint);
		text-align: center;
	}

	.btn {
		width: 100%;
		padding: 10px 20px;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		font-weight: 600;
		transition: background 0.15s;
		text-align: center;
		text-decoration: none;
		display: block;
	}

	.btn:disabled {
		opacity: 0.5;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-dark);
	}

	.btn-bgg {
		background: transparent;
		color: var(--primary);
		border: 1px solid var(--primary);
		font-size: 0.82rem;
		padding: 8px 20px;
	}

	.btn-bgg:hover {
		background: rgba(92, 107, 192, 0.08);
	}

	.bottom-row {
		display: flex;
		gap: 8px;
	}

	.btn-hide {
		flex: 1;
		background: var(--background);
		color: var(--text-secondary);
		border: 1px solid var(--divider);
		font-size: 0.82rem;
		padding: 8px 12px;
	}

	.btn-hide:hover {
		background: var(--divider);
	}

	.btn-danger {
		flex: 1;
		background: transparent;
		color: var(--error);
		border: 1px solid var(--error);
		font-size: 0.82rem;
		padding: 8px 12px;
	}

	.btn-danger:hover:not(:disabled) {
		background: rgba(211, 47, 47, 0.08);
	}
</style>
