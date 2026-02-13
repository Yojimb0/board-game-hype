<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { getAuthState, loginWithGoogle, logout } from '$lib/auth.svelte';
	import { subscribeToCollection, unsubscribeFromCollection } from '$lib/collection.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
	const authState = getAuthState();
	let showSettings = $state(false);
	let showHelp = $state(false);
	let helpDialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (showHelp && helpDialogEl) helpDialogEl.showModal();
	});

	function closeHelp() {
		helpDialogEl?.close();
		showHelp = false;
	}

	let prevUid: string | null = null;

	$effect(() => {
		const uid = authState.user?.uid ?? null;
		if (uid !== prevUid) {
			if (prevUid) unsubscribeFromCollection();
			if (uid) subscribeToCollection(uid);
			prevUid = uid;
		}
	});

	const currentPath = $derived(page.url.pathname);
</script>

<div class="app-shell">
	<header class="top-bar">
		<a href="/" class="app-title">
			<span class="title-icon">🎲</span>
			Board Game Hype
		</a>
		<div class="top-bar-actions">
			<button
				class="icon-btn"
				onclick={() => (showHelp = true)}
				title="Help"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
					<path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
				</svg>
			</button>
			<button
				class="icon-btn"
				onclick={() => (showSettings = true)}
				title="Settings"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
					<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
				</svg>
			</button>
			{#if authState.loading}
				<div class="avatar-placeholder"></div>
			{:else if authState.user}
				<button class="user-btn" onclick={logout} title="Sign out">
					{#if authState.user.photoURL}
						<img
							src={authState.user.photoURL}
							alt=""
							class="user-avatar"
							referrerpolicy="no-referrer"
						/>
					{:else}
						<span class="user-avatar-fallback">
							{authState.user.displayName?.[0] || '?'}
						</span>
					{/if}
				</button>
			{:else}
				<button class="sign-in-btn" onclick={loginWithGoogle}>Sign in</button>
			{/if}
		</div>
	</header>

	<main class="content">
		{@render children()}
	</main>

	<nav class="bottom-nav">
		<a href="/" class="nav-item" class:active={currentPath === '/'}>
			<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
				<path
					d="M4 13h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1zm0 8h6a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1zm0-18v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1z"
				/>
			</svg>
			<span>Collection</span>
		</a>
		<a href="/search" class="nav-item" class:active={currentPath === '/search'}>
			<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			<span>Add Game</span>
		</a>
	</nav>
</div>

{#if showSettings}
	<SettingsDialog onclose={() => (showSettings = false)} />
{/if}

{#if showHelp}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog bind:this={helpDialogEl} class="help-dialog" onclick={(e) => { if (e.target === helpDialogEl) closeHelp(); }}>
		<div class="help-content">
			<header class="help-header">
				<h2>TL;DR</h2>
				<button class="help-close" onclick={closeHelp} aria-label="Close">✕</button>
			</header>
			<div class="help-body">
				<section class="help-section">
					<h3>What is this?</h3>
					<p>Track your board game collection and rank games by <strong>hype</strong> — a score that decays over time so your list always reflects what you're excited about <em>right now</em>.</p>
				</section>

				<section class="help-section">
					<h3>Getting started</h3>
					<ol>
						<li><strong>Sign in</strong> with Google (top right)</li>
						<li>Go to <strong>Add Game</strong> tab</li>
						<li>Paste a <strong>BoardGameGeek link</strong> or upload a <strong>BGG CSV export</strong></li>
						<li>Your collection appears on the <strong>Collection</strong> tab</li>
					</ol>
				</section>

				<section class="help-section">
					<h3>Hype score</h3>
					<p>Tap the 🔥 button to hype a game. Repeated hypes stack. The score <strong>decays over ~5 weeks</strong>, so forgotten games drift down naturally.</p>
				</section>

				<section class="help-section">
					<h3>Filters &amp; sorting</h3>
					<ul>
						<li>🔍 <strong>Search</strong> — filter by name + pinned labels</li>
						<li>☰ <strong>Filters</strong> — best player count, game type, weight</li>
						<li><strong>Sort chips</strong> — hype, BGG score, weight, name, date added</li>
					</ul>
				</section>

				<section class="help-section">
					<h3>Tips</h3>
					<ul>
						<li>Tap a game to see details, add labels, log play dates, or write notes</li>
						<li>Hide games you don't want to see (toggle in game details)</li>
						<li>Pick 2 pinned labels in <strong>Settings</strong> for quick filtering</li>
					</ul>
				</section>
			</div>
		</div>
	</dialog>
{/if}

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		max-width: 960px;
		margin: 0 auto;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--surface);
		border-bottom: 1px solid var(--divider);
		position: sticky;
		top: 0;
		z-index: 100;
		height: 52px;
	}

	.app-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.01em;
	}

	.title-icon {
		font-size: 1.3rem;
	}

	.top-bar-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		color: var(--text-secondary);
		transition: background 0.15s, color 0.15s;
	}

	.icon-btn:hover {
		background: var(--divider);
		color: var(--text);
	}

	.user-btn {
		padding: 0;
		border-radius: 50%;
		overflow: hidden;
		width: 32px;
		height: 32px;
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-avatar-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--primary);
		color: white;
		font-size: 0.85rem;
		font-weight: 600;
		border-radius: 50%;
	}

	.avatar-placeholder {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--divider);
	}

	.sign-in-btn {
		padding: 6px 16px;
		background: var(--primary);
		color: white;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 500;
		transition: background 0.15s;
	}

	.sign-in-btn:hover {
		background: var(--primary-dark);
	}

	.content {
		flex: 1;
		padding-bottom: 60px;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		background: var(--surface);
		border-top: 1px solid var(--divider);
		z-index: 100;
		max-width: 960px;
		margin: 0 auto;
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 0 6px;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--text-secondary);
		transition: color 0.15s;
		text-decoration: none;
	}

	.nav-item:hover,
	.nav-item.active {
		color: var(--primary);
	}

	.nav-item svg {
		width: 22px;
		height: 22px;
		opacity: 0.7;
	}

	.nav-item.active svg {
		opacity: 1;
	}

	/* Help dialog */
	.help-dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(440px, calc(100vw - 24px));
		width: 100%;
		max-height: calc(100dvh - 24px);
		overflow: visible;
		margin: auto;
	}

	.help-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	.help-content {
		background: var(--surface);
		border-radius: var(--radius);
		display: flex;
		flex-direction: column;
		max-height: calc(100dvh - 24px);
		overflow: hidden;
	}

	.help-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--divider);
	}

	.help-header h2 {
		font-size: 1.05rem;
		font-weight: 700;
	}

	.help-close {
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

	.help-close:hover {
		background: var(--divider);
	}

	.help-body {
		flex: 1;
		overflow-y: auto;
		padding: 12px 16px 20px;
	}

	.help-section {
		margin-bottom: 16px;
	}

	.help-section:last-child {
		margin-bottom: 0;
	}

	.help-section h3 {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--primary);
		margin-bottom: 4px;
	}

	.help-section p,
	.help-section li {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.help-section ol,
	.help-section ul {
		padding-left: 18px;
		margin: 0;
	}

	.help-section li {
		margin-bottom: 2px;
	}

	.help-section strong {
		color: var(--text);
	}
</style>
