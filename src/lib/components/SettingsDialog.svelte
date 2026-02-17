<script lang="ts">
	import { getAuthState } from '$lib/auth.svelte';
	import { getCollection, clearCollection } from '$lib/collection.svelte';
	import { getSettings } from '$lib/settings.svelte';
	import {
		getProfile,
		isUsernameAvailable,
		isValidUsername,
		saveProfile,
		setPublic
	} from '$lib/profile.svelte';
	import type { ViewMode } from '$lib/types';

	interface Props {
		onclose?: () => void;
	}

	let { onclose }: Props = $props();

	const authState = getAuthState();
	const collection = getCollection();
	const settings = getSettings();
	const profile = getProfile();

	let dialogEl: HTMLDialogElement | undefined = $state();
	let clearing = $state(false);

	// Username editing
	let usernameInput = $state('');
	let usernameError = $state<string | null>(null);
	let usernameChecking = $state(false);
	let usernameSaving = $state(false);
	let usernameSuccess = $state(false);
	let checkTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (dialogEl) dialogEl.showModal();
	});

	// Initialize username input from profile
	$effect(() => {
		if (profile.data?.username) {
			usernameInput = profile.data.username;
		}
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

	function handleUsernameInput(e: Event) {
		const value = (e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
		usernameInput = value;
		usernameSuccess = false;
		usernameError = null;

		if (checkTimeout) clearTimeout(checkTimeout);

		const validationError = isValidUsername(value);
		if (validationError) {
			usernameError = validationError;
			return;
		}

		// Don't check if it's the same as current
		if (value === profile.data?.username) {
			usernameError = null;
			return;
		}

		usernameChecking = true;
		checkTimeout = setTimeout(async () => {
			try {
				const available = await isUsernameAvailable(value, authState.user?.uid);
				if (usernameInput === value) {
					usernameChecking = false;
					usernameError = available ? null : 'Already taken';
				}
			} catch {
				usernameChecking = false;
				usernameError = 'Could not check availability';
			}
		}, 400);
	}

	async function handleSaveUsername() {
		if (!authState.user || usernameError || usernameChecking) return;
		if (usernameInput === profile.data?.username) return;

		usernameSaving = true;
		try {
			await saveProfile(authState.user.uid, usernameInput, profile.data?.isPublic ?? false);
			usernameSuccess = true;
			setTimeout(() => (usernameSuccess = false), 2000);
		} catch (err) {
			console.error('Failed to save username:', err);
			usernameError = 'Failed to save';
		} finally {
			usernameSaving = false;
		}
	}

	async function handleTogglePublic(e: Event) {
		if (!authState.user) return;
		const checked = (e.target as HTMLInputElement).checked;
		await setPublic(authState.user.uid, checked);
	}

	function handleShare() {
		if (!profile.data?.username) return;
		const url = `${window.location.origin}/${profile.data.username}`;
		if (navigator.share) {
			navigator.share({
				title: `${profile.data.username}'s Board Game Collection`,
				url
			});
		} else {
			navigator.clipboard.writeText(url);
			alert('Link copied to clipboard!');
		}
	}

	const hasUsername = $derived(!!profile.data?.username);
	const isPublic = $derived(profile.data?.isPublic ?? false);
	const shareUrl = $derived(
		profile.data?.username ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${profile.data.username}` : ''
	);
	const canSaveUsername = $derived(
		usernameInput.length >= 3
		&& !usernameError
		&& !usernameChecking
		&& usernameInput !== profile.data?.username
	);
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

			<!-- Sharing -->
			{#if authState.user}
				<section class="setting-section">
					<h3 class="setting-title">Share your collection</h3>
					<p class="setting-desc">Pick a username and make your collection public so others can browse it.</p>

					<div class="username-row">
						<div class="username-input-wrap">
							<span class="username-prefix">/</span>
							<input
								type="text"
								class="username-input"
								class:error={!!usernameError && !usernameChecking}
								class:success={usernameSuccess}
								value={usernameInput}
								oninput={handleUsernameInput}
								placeholder="username"
								maxlength="24"
							/>
						</div>
						<button
							class="username-save"
							onclick={handleSaveUsername}
							disabled={!canSaveUsername || usernameSaving}
						>
							{#if usernameSaving}
								…
							{:else if usernameSuccess}
								✓
							{:else}
								Save
							{/if}
						</button>
					</div>
					{#if usernameError && !usernameChecking}
						<p class="username-hint error">{usernameError}</p>
					{:else if usernameChecking}
						<p class="username-hint">Checking…</p>
					{/if}

					{#if hasUsername}
						<label class="toggle-row" style="margin-top: 14px;">
							<div>
								<h3 class="setting-title">Public collection</h3>
								<p class="setting-desc-inline">Anyone with your link can browse your games.</p>
							</div>
							<input
								type="checkbox"
								class="toggle-input"
								checked={isPublic}
								onchange={handleTogglePublic}
							/>
						</label>

						{#if isPublic}
							<div class="share-row">
								<span class="share-url">{shareUrl}</span>
								<button class="share-btn" onclick={handleShare}>
									<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
										<path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
									</svg>
									Share
								</button>
							</div>
						{/if}
					{/if}
				</section>
			{/if}

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

	/* Username / sharing */
	.username-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.username-input-wrap {
		flex: 1;
		display: flex;
		align-items: center;
		border: 1px solid var(--divider);
		border-radius: var(--radius-sm);
		background: var(--background);
		overflow: hidden;
	}

	.username-prefix {
		padding: 0 0 0 10px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-hint);
	}

	.username-input {
		flex: 1;
		border: none !important;
		background: transparent !important;
		padding: 8px 10px 8px 2px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
		min-width: 0;
	}

	.username-input:focus {
		outline: none;
	}

	.username-input-wrap:focus-within {
		border-color: var(--primary);
	}

	.username-input-wrap:has(.error) {
		border-color: var(--error);
	}

	.username-input-wrap:has(.success) {
		border-color: var(--success);
	}

	.username-save {
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: white;
		font-size: 0.82rem;
		font-weight: 600;
		white-space: nowrap;
		transition: background 0.15s;
	}

	.username-save:hover:not(:disabled) {
		background: var(--primary-dark);
	}

	.username-save:disabled {
		opacity: 0.35;
	}

	.username-hint {
		font-size: 0.72rem;
		margin-top: 4px;
		color: var(--text-hint);
	}

	.username-hint.error {
		color: var(--error);
	}

	.share-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		padding: 8px 10px;
		background: var(--background);
		border-radius: var(--radius-sm);
	}

	.share-url {
		flex: 1;
		font-size: 0.72rem;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.share-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		border-radius: 16px;
		background: var(--primary);
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		transition: background 0.15s;
		flex-shrink: 0;
	}

	.share-btn:hover {
		background: var(--primary-dark);
	}

	.share-btn svg {
		width: 16px;
		height: 16px;
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
