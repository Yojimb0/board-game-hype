
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
const MAX_RETRIES = 5;

export const GET: RequestHandler = async ({ url }) => {
	const username = url.searchParams.get('username');
	if (!username) {
		return new Response('Missing username parameter', { status: 400 });
	}

	const token = env.BGG_API_TOKEN;
	const collectionUrl = `${BGG_BASE}/collection?username=${encodeURIComponent(username)}&stats=1&subtype=boardgame`;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const headers: Record<string, string> = {
				'User-Agent': 'BoardGameHype/1.0'
			};
			if (token) headers['Authorization'] = `Bearer ${token}`;

			const response = await fetch(collectionUrl, { headers });

			if (response.status === 202) {
				if (attempt < MAX_RETRIES - 1) {
					await new Promise((r) => setTimeout(r, 2000));
					continue;
				}
				return new Response('BGG is still preparing the collection. Try again shortly.', {
					status: 202
				});
			}

			if (!response.ok) {
				return new Response(`BGG API error: ${response.status}`, { status: response.status });
			}

			const xml = await response.text();
			return new Response(xml, {
				headers: {
					'Content-Type': 'application/xml',
					'Cache-Control': 'public, max-age=60'
				}
			});
		} catch (error) {
			if (attempt === MAX_RETRIES - 1) {
				console.error('BGG collection error:', error);
				return new Response('Failed to fetch collection from BGG', { status: 502 });
			}
		}
	}

	return new Response('Failed to fetch collection from BGG', { status: 502 });
};
