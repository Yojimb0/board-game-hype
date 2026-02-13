import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) {
		return new Response('Missing query parameter', { status: 400 });
	}

	const token = env.BGG_API_TOKEN;
	if (!token) {
		return new Response('BGG API token not configured', { status: 503 });
	}

	const bggUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`;

	const response = await fetch(bggUrl, {
		headers: {
			Authorization: `Bearer ${token}`
		}
		
	});

	if (!response.ok) {
		return new Response(`BGG API error: ${response.status}`, { status: response.status });
	}

	const xml = await response.text();

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=300'
		}
	});
};
