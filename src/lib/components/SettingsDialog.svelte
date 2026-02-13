<script lang="ts">
	import { getAuthState } from '$lib/auth.svelte';
	import { getCollection, clearCollection } from '$lib/collection.svelte';
	import { getSettings } from '$lib/settings.svelte';
	import type { ViewMode } from '$lib/types';

	interface Props {
		onclose?: () => void;
	}

	let { onclose }: Props = $props();

	const authState = getAuthState();
	const collection = getCollection();
	const settings = getSettings();

	let dialogEl: HTMLDialogElement | undefined = $state();
	let clearing = $state(false);

	$effect(() => {
		if (dialogEl) dialogEl.showModal();
	});

	function handleClose() {
		dialogEl?.close();
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) handleClose();
	}

	async function handleClear() {
		if (!authState.user) return;
		const count = collection.games.length;
		if (!confirm(`Delete all ${count} games from your collection? This cannot be undone.`)) return;

		clearing = true;
		try {
			await clearCollection(authState.user.uid);
			handleClose();
		} catch (err) {
			console.error('Failed to clear collection:', err);
			alert('Failed to clear collection. Please try again.');
		} finally {
			clearing = false;
		}
	}

	function setDefaultView(mode: ViewMode) {
		settings.defaultView = mode;
	}


</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialogEl} class="settings-dialog" onclick={handleBackdropClick}>
	<div class="dialog-content">
		<header class="dialog-header">
			<h2>Settings</h2>
			<button class="close-btn" onclick={handleClose} aria-label="Close">✕</button>
		</header>

		<div class="dialog-body">
			<!-- Default view -->
			<section class="setting-section">
				<h3 class="setting-title">Default view</h3>
				<p class="setting-desc">Choose how your collection is displayed by default.</p>
				<div class="view-options">
					<button
						class="view-option"
						class:active={settings.defaultView === 'list'}
						onclick={() => setDefaultView('list')}
					>
						<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
							<path d="M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z" />
						</svg>
						List
					</button>
					<button
						class="view-option"
						class:active={settings.defaultView === 'tiles'}
						onclick={() => setDefaultView('tiles')}
					>
						<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
							<path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z" />
						</svg>
						Tiles
					</button>
				</div>
			</section>

			<!-- Show hidden -->
			<section class="setting-section">
				<label class="toggle-row">
					<div>
						<h3 class="setting-title">Show hidden games</h3>
						<p class="setting-desc-inline">Display games you've hidden in the collection view.</p>
					</div>
					<input
						type="checkbox"
						class="toggle-input"
						checked={settings.showHidden}
						onchange={(e) => {
							settings.showHidden = (e.target as HTMLInputElement).checked;
						}}
					/>
				</label>
			</section>

			<!-- Danger zone -->
			{#if authState.user}
				<section class="setting-section danger-zone">
					<h3 class="setting-title">Danger zone</h3>
					<p class="setting-desc">
						Permanently delete all {collection.games.length} games from your collection.
					</p>
					<button
						class="clear-btn-action"
						onclick={handleClear}
						disabled={clearing || collection.games.length === 0}
					>
						{#if clearing}
							Clearing...
						{:else}
							Clear entire collection
						{/if}
					</button>
				</section>
			{/if}
		</div>
	</div>
</dialog>

<style>
	.settings-dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(440px, calc(100vw - 24px));
		width: 100%;
		max-height: calc(100dvh - 24px);
		overflow: visible;
		margin: auto;
	}

	.settings-dialog::backdrop {
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
	}

	.dialog-header h2 {
		font-size: 1.05rem;
		font-weight: 700;
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
		padding: 8px 0;
	}

	.setting-section {
		padding: 14px 16px;
	}

	.setting-section + .setting-section {
		border-top: 1px solid var(--divider);
	}

	.setting-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 4px;
	}

	.setting-desc {
		font-size: 0.78rem;
		color: var(--text-secondary);
		line-height: 1.4;
		margin-bottom: 12px;
	}

	/* Toggle row */
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		cursor: pointer;
	}

	.setting-desc-inline {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.4;
		margin-top: 2px;
	}

	.toggle-input {
		width: 40px;
		height: 22px;
		appearance: none;
		-webkit-appearance: none;
		background: var(--divider);
		border-radius: 11px;
		position: relative;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.2s;
	}

	.toggle-input::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: white;
		border-radius: 50%;
		transition: transform 0.2s;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.toggle-input:checked {
		background: var(--primary);
	}

	.toggle-input:checked::after {
		transform: translateX(18px);
	}

	/* View toggle */
	.view-options {
		display: flex;
		gap: 8px;
	}

	.view-option {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px;
		border: 2px solid var(--divider);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--background);
		transition: all 0.15s;
	}

	.view-option:hover {
		border-color: var(--text-hint);
	}

	.view-option.active {
		border-color: var(--primary);
		color: var(--primary);
		background: rgba(92, 107, 192, 0.06);
	}

	.view-option svg {
		opacity: 0.6;
	}

	.view-option.active svg {
		opacity: 1;
	}

	/* Danger zone */
	.danger-zone .setting-title {
		color: var(--error);
	}

	.clear-btn-action {
		padding: 9px 18px;
		background: transparent;
		color: var(--error);
		border: 1px solid var(--error);
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		font-weight: 600;
		transition: background 0.15s;
	}

	.clear-btn-action:hover:not(:disabled) {
		background: rgba(211, 47, 47, 0.08);
	}

	.clear-btn-action:disabled {
		opacity: 0.4;
	}
</style>
