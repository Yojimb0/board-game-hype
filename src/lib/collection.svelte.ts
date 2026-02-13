import { db } from './firebase';
import {
	collection,
	doc,
	getDocs,
	setDoc,
	deleteDoc,
	updateDoc,
	onSnapshot,
	query,
	arrayUnion,
	arrayRemove,
	writeBatch
} from 'firebase/firestore';
import type { GameEntry, HypeEvent, BggGameDetails } from './types';
import { getBggGameFromUrl } from './bgg';

let games = $state<GameEntry[]>([]);
let loading = $state(true);
let unsubscribe: (() => void) | null = null;

export function getCollection() {
	return {
		get games() {
			return games;
		},
		get loading() {
			return loading;
		}
	};
}

export function subscribeToCollection(userId: string) {
	if (unsubscribe) unsubscribe();

	const q = query(collection(db, 'users', userId, 'games'));
	loading = true;

	unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			games = snapshot.docs.map(
				(d) =>
					({
						id: d.id,
						...d.data()
					}) as GameEntry
			);
			loading = false;
		},
		(error) => {
			console.error('Collection subscription error:', error);
			loading = false;
		}
	);
}

export function unsubscribeFromCollection() {
	if (unsubscribe) {
		unsubscribe();
		unsubscribe = null;
	}
	games = [];
	loading = true;
}

export function isInCollection(bggId: number): boolean {
	return games.some((g) => g.bggId === bggId);
}

export function getGameFromCollection(bggId: number): GameEntry | undefined {
	return games.find((g) => g.bggId === bggId);
}

export async function addGameToCollection(
	userId: string,
	details: BggGameDetails
) {
	const entry: Omit<GameEntry, 'id'> = {
		bggId: details.id,
		name: details.name,
		thumbnail: details.thumbnail,
		image: details.image,
		yearPublished: details.yearPublished,
		bggScore: details.bggScore,
		weight: details.weight,
		minPlayers: details.minPlayers,
		maxPlayers: details.maxPlayers,
		bestPlayerCount: details.bestPlayerCount,
		recommendedPlayerCount: details.recommendedPlayerCount || [],
		playingTime: details.playingTime,
		labels: [],
		playDates: [],
		personalNote: '',
		hypeEvents: [{ direction: 1, timestamp: Date.now() }],
		addedAt: Date.now(),
		description: details.description,
		bggType: details.bggType || [],
		categories: details.categories,
		mechanics: details.mechanics
	};

	const ref = doc(db, 'users', userId, 'games', String(details.id));
	await setDoc(ref, entry);
}

export async function removeGameFromCollection(
	userId: string,
	bggId: number
) {
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await deleteDoc(ref);
}

export async function clearCollection(userId: string) {
	const q = query(collection(db, 'users', userId, 'games'));
	const snapshot = await getDocs(q);

	// Firestore batches can hold up to 500 operations
	const BATCH_LIMIT = 500;
	let batch = writeBatch(db);
	let count = 0;

	for (const d of snapshot.docs) {
		batch.delete(d.ref);
		count++;
		if (count % BATCH_LIMIT === 0) {
			await batch.commit();
			batch = writeBatch(db);
		}
	}

	if (count % BATCH_LIMIT !== 0) {
		await batch.commit();
	}
}

export async function toggleHidden(
	userId: string,
	bggId: number,
	hidden: boolean
) {
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await updateDoc(ref, { hidden });
}

export async function nudgeHype(
	userId: string,
	bggId: number,
	direction: 1 | -1
) {
	const event: HypeEvent = { direction, timestamp: Date.now() };
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await updateDoc(ref, {
		hypeEvents: arrayUnion(event)
	});
}

export async function addPlayDate(
	userId: string,
	bggId: number,
	date: string
) {
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await updateDoc(ref, {
		playDates: arrayUnion(date)
	});
}

export async function removePlayDate(
	userId: string,
	bggId: number,
	date: string
) {
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await updateDoc(ref, {
		playDates: arrayRemove(date)
	});
}

export async function addLabel(
	userId: string,
	bggId: number,
	label: string
) {
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await updateDoc(ref, {
		labels: arrayUnion(label)
	});
}

export async function removeLabel(
	userId: string,
	bggId: number,
	label: string
) {
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await updateDoc(ref, {
		labels: arrayRemove(label)
	});
}

export async function updatePersonalNote(
	userId: string,
	bggId: number,
	note: string
) {
	const ref = doc(db, 'users', userId, 'games', String(bggId));
	await updateDoc(ref, {
		personalNote: note
	});
}

export interface ImportProgress {
	total: number;
	done: number;
	phase: 'importing' | 'enriching' | 'done';
	current?: string;
}

/**
 * Import games from a parsed BGG CSV export.
 * - New games: created with initial hype event
 * - Existing games: BGG data (score, weight, players, etc.) is updated, user data preserved
 */
export async function importBggCsv(
	userId: string,
	csvGames: BggGameDetails[],
	onProgress?: (p: ImportProgress) => void
) {
	const total = csvGames.length;
	let done = 0;

	for (const game of csvGames) {
		onProgress?.({ total, done, phase: 'importing', current: game.name });

		const existing = getGameFromCollection(game.id);
		const ref = doc(db, 'users', userId, 'games', String(game.id));

		if (existing) {
			// Update BGG data only, preserve user data (labels, hype, notes, playDates)
			await updateDoc(ref, {
				name: game.name,
				bggScore: game.bggScore,
				weight: game.weight,
				minPlayers: game.minPlayers,
				maxPlayers: game.maxPlayers,
				bestPlayerCount: game.bestPlayerCount,
				recommendedPlayerCount: game.recommendedPlayerCount,
				playingTime: game.playingTime,
				yearPublished: game.yearPublished
			});
		} else {
			// Create new entry
			const entry: Omit<GameEntry, 'id'> = {
				bggId: game.id,
				name: game.name,
				thumbnail: game.thumbnail || '',
				image: game.image || '',
				yearPublished: game.yearPublished,
				bggScore: game.bggScore,
				weight: game.weight,
				minPlayers: game.minPlayers,
				maxPlayers: game.maxPlayers,
				bestPlayerCount: game.bestPlayerCount,
				recommendedPlayerCount: game.recommendedPlayerCount,
				playingTime: game.playingTime,
				labels: [],
				playDates: [],
				personalNote: '',
				hypeEvents: [{ direction: 1, timestamp: Date.now() }],
				addedAt: Date.now(),
				description: game.description || '',
				bggType: game.bggType || [],
				categories: game.categories || [],
				mechanics: game.mechanics || []
			};
			await setDoc(ref, entry);
		}
		done++;
	}

	onProgress?.({ total, done: total, phase: 'done' });
}

/**
 * Enrich collection entries that lack thumbnails or BGG type by scraping BGG pages.
 * Runs in batches to avoid hammering BGG.
 */
export async function enrichMissingThumbnails(
	userId: string,
	onProgress?: (p: ImportProgress) => void
) {
	const toEnrich = games.filter((g) => !g.thumbnail || !g.bggType?.length);
	const total = toEnrich.length;
	let done = 0;

	onProgress?.({ total, done, phase: 'enriching' });

	const BATCH_SIZE = 3;
	for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
		const batch = toEnrich.slice(i, i + BATCH_SIZE);

		await Promise.all(
			batch.map(async (game) => {
				try {
					onProgress?.({
						total,
						done,
						phase: 'enriching',
						current: game.name
					});

					const details = await getBggGameFromUrl(
						`https://boardgamegeek.com/boardgame/${game.bggId}`
					);

					if (details) {
						const ref = doc(db, 'users', userId, 'games', String(game.bggId));
						await updateDoc(ref, {
							thumbnail: details.thumbnail || '',
							image: details.image || '',
							description: details.description || '',
							bggType: details.bggType || [],
							categories: details.categories || [],
							mechanics: details.mechanics || [],
							bggScore: details.bggScore,
							weight: details.weight,
							bestPlayerCount: details.bestPlayerCount,
							recommendedPlayerCount: details.recommendedPlayerCount || []
						});
					}
				} catch (e) {
					console.warn(`Failed to enrich ${game.name}:`, e);
				}
				done++;
				onProgress?.({ total, done, phase: done >= total ? 'done' : 'enriching' });
			})
		);

		// Small delay between batches to be polite to BGG
		if (i + BATCH_SIZE < toEnrich.length) {
			await new Promise((r) => setTimeout(r, 500));
		}
	}

	onProgress?.({ total, done: total, phase: 'done' });
}
