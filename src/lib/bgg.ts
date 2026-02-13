import type { BggSearchResult, BggGameDetails } from './types';

const BGG_URL_REGEX = /boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)/;

export function isBggUrl(input: string): boolean {
	return BGG_URL_REGEX.test(input);
}

export function extractBggId(input: string): number | null {
	const match = input.match(BGG_URL_REGEX);
	return match ? parseInt(match[1]) : null;
}

function stripHtml(html: string): string {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return doc.body.textContent || '';
}

export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
	const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(query)}`);
	if (!res.ok) throw new Error('Search failed');

	const xml = await res.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');
	const items = doc.querySelectorAll('item');

	return Array.from(items)
		.map((item) => ({
			id: parseInt(item.getAttribute('id') || '0'),
			name:
				item.querySelector('name[type="primary"]')?.getAttribute('value') ||
				item.querySelector('name')?.getAttribute('value') ||
				'Unknown',
			yearPublished: parseInt(
				item.querySelector('yearpublished')?.getAttribute('value') || '0'
			)
		}))
		.filter((item) => item.id > 0)
		.sort((a, b) => b.yearPublished - a.yearPublished);
}

export async function getBggGameDetails(id: number): Promise<BggGameDetails | null> {
	const res = await fetch(`/api/bgg/thing?id=${id}`);
	if (!res.ok) throw new Error('Failed to fetch game details');

	const xml = await res.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');
	const item = doc.querySelector('item');

	if (!item) return null;

	// Parse best player count from poll
	const bestPlayerCount: number[] = [];
	const pollResults = item.querySelectorAll(
		'poll[name="suggested_numplayers"] results'
	);
	let maxBestVotes = 0;

	pollResults.forEach((results) => {
		const bestVotes = parseInt(
			results.querySelector('result[value="Best"]')?.getAttribute('numvotes') || '0'
		);
		if (bestVotes > maxBestVotes) maxBestVotes = bestVotes;
	});

	if (maxBestVotes > 0) {
		pollResults.forEach((results) => {
			const numplayers = results.getAttribute('numplayers');
			const bestVotes = parseInt(
				results.querySelector('result[value="Best"]')?.getAttribute('numvotes') || '0'
			);
			// Include player counts with >= 75% of the top vote count
			if (bestVotes >= maxBestVotes * 0.75 && numplayers) {
				const n = parseInt(numplayers);
				if (!isNaN(n)) bestPlayerCount.push(n);
			}
		});
	}

	const categories = Array.from(
		item.querySelectorAll('link[type="boardgamecategory"]')
	)
		.map((l) => l.getAttribute('value') || '')
		.filter(Boolean);

	const mechanics = Array.from(
		item.querySelectorAll('link[type="boardgamemechanic"]')
	)
		.map((l) => l.getAttribute('value') || '')
		.filter(Boolean);

	const rawDescription = item.querySelector('description')?.textContent || '';

	return {
		id: parseInt(item.getAttribute('id') || '0'),
		name:
			item.querySelector('name[type="primary"]')?.getAttribute('value') || 'Unknown',
		thumbnail: item.querySelector('thumbnail')?.textContent?.trim() || '',
		image: item.querySelector('image')?.textContent?.trim() || '',
		description: stripHtml(rawDescription),
		yearPublished: parseInt(
			item.querySelector('yearpublished')?.getAttribute('value') || '0'
		),
		minPlayers: parseInt(
			item.querySelector('minplayers')?.getAttribute('value') || '0'
		),
		maxPlayers: parseInt(
			item.querySelector('maxplayers')?.getAttribute('value') || '0'
		),
		playingTime: parseInt(
			item.querySelector('playingtime')?.getAttribute('value') || '0'
		),
		minPlayTime: parseInt(
			item.querySelector('minplaytime')?.getAttribute('value') || '0'
		),
		maxPlayTime: parseInt(
			item.querySelector('maxplaytime')?.getAttribute('value') || '0'
		),
		bggScore: parseFloat(
			item.querySelector('statistics ratings average')?.getAttribute('value') ||
				'0'
		),
		averageRating: parseFloat(
			item.querySelector('statistics ratings bayesaverage')?.getAttribute('value') || '0'
		),
		weight: parseFloat(
			item.querySelector('statistics ratings averageweight')?.getAttribute('value') ||
				'0'
		),
		bestPlayerCount,
		recommendedPlayerCount: bestPlayerCount,
		categories,
		mechanics
	};
}

export async function getBggGameFromUrl(url: string): Promise<BggGameDetails | null> {
	const res = await fetch(`/api/bgg/scrape?url=${encodeURIComponent(url)}`);
	if (!res.ok) throw new Error('Failed to fetch game from BGG');
	return res.json();
}
