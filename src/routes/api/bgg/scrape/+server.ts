import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const bggUrl = url.searchParams.get('url');
	if (!bggUrl) {
		return new Response('Missing url parameter', { status: 400 });
	}

	// Extract game ID from URL
	const match = bggUrl.match(/boardgame(?:expansion)?\/(\d+)/);
	if (!match) {
		return new Response('Invalid BGG URL', { status: 400 });
	}

	const gameId = match[1];
	const pageUrl = `https://boardgamegeek.com/boardgame/${gameId}`;

	try {
		const response = await fetch(pageUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; BoardGameHype/1.0)',
				Accept: 'text/html'
			}
		});

		if (!response.ok) {
			return new Response(`BGG returned ${response.status}`, { status: response.status });
		}

		const html = await response.text();

		// Extract GEEK.geekitemPreload JSON from the page
		const preloadMatch = html.match(/GEEK\.geekitemPreload\s*=\s*(\{.+?\});\s*$/m);
		if (!preloadMatch) {
			return new Response('Could not parse game data from BGG page', { status: 502 });
		}

		const preload = JSON.parse(preloadMatch[1]);
		const item = preload.item;

		if (!item) {
			return new Response('No game data found', { status: 404 });
		}

		// Extract best and recommended player counts from polls
		const bestPlayerCount: number[] = [];
		const recommendedPlayerCount: number[] = [];
		if (item.polls?.userplayers?.best) {
			for (const range of item.polls.userplayers.best) {
				for (let i = range.min; i <= range.max; i++) {
					bestPlayerCount.push(i);
				}
			}
		}
		if (item.polls?.userplayers?.recommended) {
			for (const range of item.polls.userplayers.recommended) {
				for (let i = range.min; i <= range.max; i++) {
					recommendedPlayerCount.push(i);
				}
			}
		}

		// Extract types (subdomains), categories, and mechanics
		const bggType = (item.links?.boardgamesubdomain || []).map(
			(l: { name: string }) => l.name
		);
		const categories = (item.links?.boardgamecategory || []).map(
			(l: { name: string }) => l.name
		);
		const mechanics = (item.links?.boardgamemechanic || []).map(
			(l: { name: string }) => l.name
		);

		// Strip HTML from description
		const rawDesc = item.description || '';
		const description = rawDesc
			.replace(/<[^>]*>/g, '')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&mdash;/g, '—')
			.replace(/&ndash;/g, '–')
			.replace(/&nbsp;/g, ' ')
			.replace(/\n{3,}/g, '\n\n')
			.trim();

		const gameDetails = {
			id: parseInt(item.objectid || gameId),
			name: item.name || 'Unknown',
			thumbnail: item.images?.square200 || item.images?.thumb || '',
			image: item.images?.original || item.imageurl || '',
			description,
			yearPublished: parseInt(item.yearpublished || '0'),
			minPlayers: parseInt(item.minplayers || '0'),
			maxPlayers: parseInt(item.maxplayers || '0'),
			playingTime: parseInt(item.maxplaytime || item.minplaytime || '0'),
			minPlayTime: parseInt(item.minplaytime || '0'),
			maxPlayTime: parseInt(item.maxplaytime || '0'),
			bggScore: parseFloat(item.stats?.average || '0'),
			averageRating: parseFloat(item.stats?.baverage || '0'),
			weight: parseFloat(item.stats?.avgweight || '0'),
			bestPlayerCount,
			recommendedPlayerCount,
			bggType,
			categories,
			mechanics
		};

		return new Response(JSON.stringify(gameDetails), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300'
			}
		});
	} catch (e) {
		console.error('Scrape error:', e);
		return new Response('Failed to fetch game from BGG', { status: 502 });
	}
};
