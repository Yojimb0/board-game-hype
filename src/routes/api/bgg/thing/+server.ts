import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) {
		return new Response('Missing id parameter', { status: 400 });
	}

	const token = env.BGG_API_TOKEN;
	if (!token) {
		return new Response('BGG API token not configured', { status: 503 });
	}

	const bggUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(id)}&stats=1`;

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
