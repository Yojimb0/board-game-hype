import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';

const bggApiToken = defineString('BGG_API_TOKEN', { default: '' });
const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';

export const bggProxy = onRequest({ cors: true }, async (req, res) => {
	const path = req.path.replace(/^\/api\/bgg/, '');

	// --- Scrape route (no API token needed) ---
	if (path === '/scrape' || path.startsWith('/scrape')) {
		const bggUrl = req.query.url as string;
		if (!bggUrl) {
			res.status(400).send('Missing url parameter');
			return;
		}

		const match = bggUrl.match(/boardgame(?:expansion)?\/(\d+)/);
		if (!match) {
			res.status(400).send('Invalid BGG URL');
			return;
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
				res.status(response.status).send(`BGG returned ${response.status}`);
				return;
			}

			const html = await response.text();
			const preloadMatch = html.match(/GEEK\.geekitemPreload\s*=\s*(\{.+?\});\s*$/m);
			if (!preloadMatch) {
				res.status(502).send('Could not parse game data from BGG page');
				return;
			}

			const preload = JSON.parse(preloadMatch[1]);
			const item = preload.item;
			if (!item) {
				res.status(404).send('No game data found');
				return;
			}

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

			const bggType = (item.links?.boardgamesubdomain || []).map(
				(l: { name: string }) => l.name
			);
			const categories = (item.links?.boardgamecategory || []).map(
				(l: { name: string }) => l.name
			);
			const mechanics = (item.links?.boardgamemechanic || []).map(
				(l: { name: string }) => l.name
			);

			const rawDesc: string = item.description || '';
			const description = rawDesc
				.replace(/<[^>]*>/g, '')
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&mdash;/g, '\u2014')
				.replace(/&ndash;/g, '\u2013')
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

			res.set('Content-Type', 'application/json');
			res.set('Cache-Control', 'public, max-age=300');
			res.json(gameDetails);
		} catch (error) {
			console.error('Scrape error:', error);
			res.status(502).send('Failed to fetch game from BGG');
		}
		return;
	}

	// --- Collection route ---
	if (path === '/collection' || path.startsWith('/collection')) {
		const username = req.query.username as string;
		if (!username) {
			res.status(400).send('Missing username parameter');
			return;
		}

		const token = bggApiToken.value();
		const collectionUrl = `${BGG_BASE}/collection?username=${encodeURIComponent(username)}&stats=1&subtype=boardgame`;

		const MAX_RETRIES = 5;
		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			try {
				const headers: Record<string, string> = {
					'User-Agent': 'BoardGameHype/1.0'
				};
				if (token) headers['Authorization'] = `Bearer ${token}`;

				const response = await fetch(collectionUrl, { headers });

				// BGG returns 202 while it prepares the collection — retry after a delay
				if (response.status === 202) {
					if (attempt < MAX_RETRIES - 1) {
						await new Promise((r) => setTimeout(r, 2000));
						continue;
					}
					res.status(202).send('BGG is still preparing the collection. Try again shortly.');
					return;
				}

				if (!response.ok) {
					res.status(response.status).send(`BGG API error: ${response.status}`);
					return;
				}

				const xml = await response.text();
				res.set('Content-Type', 'application/xml');
				res.set('Cache-Control', 'public, max-age=60');
				res.send(xml);
				return;
			} catch (error) {
				if (attempt === MAX_RETRIES - 1) {
					console.error('BGG collection error:', error);
					res.status(502).send('Failed to fetch collection from BGG');
					return;
				}
			}
		}
		return;
	}

	// --- XML API routes (require token) ---
	const token = bggApiToken.value();
	let bggUrl: string;

	if (path === '/search' || path.startsWith('/search')) {
		const q = req.query.q as string;
		if (!q) {
			res.status(400).send('Missing query parameter');
			return;
		}
		if (!token) {
			res.status(503).send('BGG API token not configured');
			return;
		}
		bggUrl = `${BGG_BASE}/search?query=${encodeURIComponent(q)}&type=boardgame`;
	} else if (path === '/thing' || path.startsWith('/thing')) {
		const id = req.query.id as string;
		if (!id) {
			res.status(400).send('Missing id parameter');
			return;
		}
		if (!token) {
			res.status(503).send('BGG API token not configured');
			return;
		}
		bggUrl = `${BGG_BASE}/thing?id=${encodeURIComponent(id)}&stats=1`;
	} else {
		res.status(404).send('Not found');
		return;
	}

	try {
		const response = await fetch(bggUrl, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			res.status(response.status).send(`BGG API error: ${response.status}`);
			return;
		}

		const xml = await response.text();

		res.set('Content-Type', 'application/xml');
		res.set('Cache-Control', 'public, max-age=300');
		res.send(xml);
	} catch (error) {
		console.error('BGG proxy error:', error);
		res.status(502).send('Failed to fetch from BGG');
	}
});
