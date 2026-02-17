<script lang="ts">
	import { goto } from '$app/navigation';
	import { getAuthState, loginWithGoogle } from '$lib/auth.svelte';
	import { onMount } from 'svelte';

	const authState = getAuthState();
	const defaultBg = '#f5f5f5';
	let bgColor = $state(defaultBg);

	async function handleSignIn() {
		await loginWithGoogle();
		goto('/collection');
	}

	onMount(() => {
		const feats = [...document.querySelectorAll<HTMLElement>('.feat')];
		const heroEl = document.querySelector('.hero');

		function updateBg() {
			const midY = window.innerHeight / 2;

			if (heroEl) {
				const heroRect = heroEl.getBoundingClientRect();
				if (heroRect.top <= midY && heroRect.bottom >= midY) {
					bgColor = defaultBg;
					return;
				}
			}

			for (const feat of feats) {
				const rect = feat.getBoundingClientRect();
				if (rect.top <= midY && rect.bottom >= midY) {
					bgColor = feat.dataset.bg || defaultBg;
					return;
				}
			}
		}

		window.addEventListener('scroll', updateBg, { passive: true });
		updateBg();

		return () => {
			window.removeEventListener('scroll', updateBg);
			document.body.style.backgroundColor = '';
		};
	});

	$effect(() => {
		document.body.style.backgroundColor = bgColor;
	});
</script>

<div class="home">
	<!-- Hero -->
	<section class="hero">
		<div class="hero-bg">
			<img src="/home.jpg" alt="" class="hero-img" />
		</div>
		<div class="hero-overlay"></div>
		<div class="hero-content">
			<h1 class="hero-title">Board Game Hype</h1>
			<p class="hero-sub">Track your collection.<br />Rank by excitement.<br />Find your next play.</p>
			{#if authState.user}
				<a href="/collection" class="cta">Go to my collection</a>
			{:else}
				<button class="cta" onclick={handleSignIn}>
					<svg viewBox="0 0 24 24" width="18" height="18">
						<path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
						<path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Sign in with Google
				</button>
			{/if}
		</div>
	</section>

	<!-- Feature sections -->
	<section class="feat" data-bg="#FFF3E0">
		<div class="feat-inner">
			<span class="feat-emoji">🔥</span>
			<h2>Hype-driven ranking</h2>
			<p>Tap to hype a game. Scores <strong>decay over time</strong> so your list always reflects what excites you <em>right now</em>. Forgotten games drift down naturally.</p>
		</div>
	</section>

	<section class="feat" data-bg="#E3F2FD">
		<div class="feat-inner">
			<span class="feat-emoji">📦</span>
			<h2>Import from BGG</h2>
			<p>Paste a <strong>BoardGameGeek link</strong> to add a single game, or bulk-import your entire collection via <strong>CSV export</strong>. Scores, weight, and player counts come along.</p>
		</div>
	</section>

	<section class="feat" data-bg="#E0F2F1">
		<div class="feat-inner">
			<span class="feat-emoji">🏷️</span>
			<h2>Labels &amp; filters</h2>
			<p>Tag games with <strong>custom labels</strong>. Filter by player count, type, weight, or label — all in one tap. Find the perfect game for tonight.</p>
		</div>
	</section>

	<section class="feat" data-bg="#EDE7F6">
		<div class="feat-inner">
			<span class="feat-emoji">🔗</span>
			<h2>Share your shelf</h2>
			<p>Pick a username, go public, and <strong>share your collection link</strong> with friends. They can browse, filter, and get inspired.</p>
		</div>
	</section>

	<!-- Footer CTA -->
	<section class="footer-cta">
		<p class="footer-note">Free. No ads. Just games.</p>
		{#if authState.user}
			<a href="/collection" class="cta dark">My collection →</a>
		{:else}
			<button class="cta dark" onclick={handleSignIn}>Get started</button>
		{/if}
	</section>
</div>

<style>
	.home {
	}

	/* ===================== Hero ===================== */
	.hero {
		position: relative;
		height: 100vh;
		height: 100dvh;
		min-height: 480px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		width: 100vw;
		margin-left: calc(50% - 50vw);
	}

	.hero-bg {
		position: absolute;
		inset: -20% 0 0 0;
		z-index: 0;
	}

	.hero-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		will-change: transform;
		animation: hero-parallax linear both;
		animation-timeline: scroll();
		animation-range: 0vh 100vh;
	}

	@keyframes hero-parallax {
		from { transform: translateY(0) scale(1.05); }
		to   { transform: translateY(18%) scale(1); }
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		z-index: 1;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.7) 0%,
			rgba(0, 0, 0, 0.35) 50%,
			rgba(0, 0, 0, 0.15) 100%
		);
	}

	.hero-content {
		position: relative;
		z-index: 2;
		text-align: center;
		padding: 0 32px;
		color: white;
		animation:
			hero-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both,
			hero-out linear both;
		animation-timeline: auto, scroll();
		animation-range: normal, 0vh 60vh;
	}

	@keyframes hero-in {
		from { opacity: 0; transform: translateY(28px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	@keyframes hero-out {
		from { opacity: 1; transform: translateY(0); filter: blur(0); }
		to   { opacity: 0; transform: translateY(-24px); filter: blur(3px); }
	}

	.hero-title {
		font-size: 2.8rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
	}

	.hero-sub {
		margin-top: 16px;
		font-size: 1.05rem;
		font-weight: 400;
		line-height: 1.6;
		opacity: 0.85;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
	}

	/* ===================== CTA Button ===================== */
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 28px;
		padding: 13px 30px;
		border-radius: 28px;
		background: var(--primary);
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		box-shadow: 0 4px 20px rgba(92, 107, 192, 0.3);
		transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
		letter-spacing: 0.01em;
	}

	.cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 28px rgba(92, 107, 192, 0.4);
		background: var(--primary-dark);
	}

	.cta:active { transform: translateY(0); }
	.cta svg { flex-shrink: 0; }

	.cta.dark {
		background: var(--text);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
	}

	.cta.dark:hover {
		background: #424242;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
	}

	/* ===================== Feature sections ===================== */
	.feat {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
		padding: 80px 32px;
		background: transparent;
	}

	.feat-inner {
		max-width: 440px;
		text-align: center;

		/* Content reveal on scroll */
		animation: feat-reveal linear both;
		animation-timeline: view();
		animation-range: entry 10% entry 55%;
	}

	@keyframes feat-reveal {
		from {
			opacity: 0;
			transform: translateY(40px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.feat-emoji {
		display: block;
		font-size: 2.8rem;
		margin-bottom: 20px;
		line-height: 1;
	}

	.feat h2 {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.01em;
		margin-bottom: 12px;
	}

	.feat p {
		font-size: 0.88rem;
		color: var(--text-secondary);
		line-height: 1.7;
	}

	.feat p strong {
		color: var(--text);
		font-weight: 600;
	}

	/* ===================== Footer CTA ===================== */
	.footer-cta {
		text-align: center;
		padding: 80px 32px 100px;

		animation: footer-in linear both;
		animation-timeline: view();
		animation-range: entry 0% entry 50%;
	}

	@keyframes footer-in {
		from { opacity: 0; transform: translateY(20px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.footer-note {
		font-size: 0.85rem;
		color: var(--text-hint);
		margin-bottom: 4px;
		letter-spacing: 0.02em;
	}

	/* ===================== Responsive ===================== */
	@media (max-width: 480px) {
		.hero-title {
			font-size: 2rem;
		}

		.hero-sub {
			font-size: 0.92rem;
		}

		.feat {
			min-height: 60vh;
			padding: 60px 24px;
		}

		.feat-emoji {
			font-size: 2.2rem;
		}

		.feat h2 {
			font-size: 1.2rem;
		}

		.footer-cta {
			padding: 60px 24px 80px;
		}
	}
</style>
