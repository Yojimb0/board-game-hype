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

	const allLinks = Array.from(item.getElementsByTagName('link'));
	const categories: string[] = [];
	const mechanics: string[] = [];
	for (const link of allLinks) {
		const lt = link.getAttribute('type');
		const val = link.getAttribute('value');
		if (!val) continue;
		if (lt === 'boardgamecategory') categories.push(val);
		else if (lt === 'boardgamemechanic') mechanics.push(val);
	}

	const bggType: string[] = [];
	const ranks = item.getElementsByTagName('rank');
	for (const rank of Array.from(ranks)) {
		if (rank.getAttribute('type') === 'family') {
			const name = rank.getAttribute('friendlyname') || '';
			if (name) bggType.push(name.replace(/ Rank$/, ''));
		}
	}

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
		bggType,
		categories,
		mechanics
	};
}

export async function fetchBggCollection(username: string): Promise<BggGameDetails[]> {
	const MAX_CLIENT_RETRIES = 6;
	let lastStatus = 0;

	for (let attempt = 0; attempt < MAX_CLIENT_RETRIES; attempt++) {
		const res = await fetch(`/api/bgg/collection?username=${encodeURIComponent(username)}`);
		lastStatus = res.status;

		if (res.status === 202) {
			if (attempt < MAX_CLIENT_RETRIES - 1) {
				await new Promise((r) => setTimeout(r, 3000));
				continue;
			}
			throw new Error('BGG is still preparing the collection. Please try again in a moment.');
		}

		if (!res.ok) throw new Error(`Failed to fetch collection (${res.status})`);

		const xml = await res.text();
		if (!xml.includes('<item')) {
			throw new Error('Unexpected response from BGG');
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(xml, 'text/xml');

		if (doc.querySelector('parsererror')) {
			throw new Error('Failed to parse BGG collection XML');
		}

		const items = doc.querySelectorAll('item');

		return Array.from(items)
			.filter((item) => item.querySelector('status')?.getAttribute('own') === '1')
			.map((item) => {
				const id = parseInt(item.getAttribute('objectid') || '0');
				const name = item.querySelector('name')?.textContent?.trim() || 'Unknown';
				const thumbnail = item.querySelector('thumbnail')?.textContent?.trim() || '';
				const image = item.querySelector('image')?.textContent?.trim() || '';
				const yearPublished = parseInt(item.querySelector('yearpublished')?.textContent || '0');
				const stats = item.querySelector('stats');
				const minPlayers = parseInt(stats?.getAttribute('minplayers') || '0');
				const maxPlayers = parseInt(stats?.getAttribute('maxplayers') || '0');
				const playingTime = parseInt(stats?.getAttribute('playingtime') || '0');
				const avg = stats?.querySelector('rating average');
				const bggScore = parseFloat(avg?.getAttribute('value') || '0');
				const avgWeight = stats?.querySelector('rating averageweight');
				const weight = parseFloat(avgWeight?.getAttribute('value') || '0');

			const bggType: string[] = [];
			for (const rank of Array.from(item.getElementsByTagName('rank'))) {
				if (rank.getAttribute('type') === 'family') {
					const fname = rank.getAttribute('friendlyname') || '';
					if (fname) bggType.push(fname.replace(/ Rank$/, ''));
				}
			}

			return {
				id,
				name,
				thumbnail,
				image,
				description: '',
				yearPublished,
				minPlayers,
				maxPlayers,
				playingTime,
				minPlayTime: playingTime,
				maxPlayTime: playingTime,
				bggScore,
				averageRating: 0,
				weight,
				bestPlayerCount: [],
				recommendedPlayerCount: [],
				bggType,
				categories: [],
				mechanics: []
			};
			})
			.filter((g) => g.id > 0);
	}

	throw new Error(`Failed to fetch collection after ${MAX_CLIENT_RETRIES} attempts (last status: ${lastStatus})`);
}

export async function getBggGameFromUrl(url: string): Promise<BggGameDetails | null> {
	const res = await fetch(`/api/bgg/scrape?url=${encodeURIComponent(url)}`);
	if (!res.ok) throw new Error('Failed to fetch game from BGG');
	return res.json();
}
