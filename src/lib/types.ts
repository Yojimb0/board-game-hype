export interface BggSearchResult {
	id: number;
	name: string;
	yearPublished: number;
}

export interface BggGameDetails {
	id: number;
	name: string;
	thumbnail: string;
	image: string;
	description: string;
	yearPublished: number;
	minPlayers: number;
	maxPlayers: number;
	playingTime: number;
	minPlayTime: number;
	maxPlayTime: number;
	bggScore: number;
	averageRating: number;
	weight: number;
	bestPlayerCount: number[];
	recommendedPlayerCount: number[];
	bggType: string[];
	categories: string[];
	mechanics: string[];
}

export interface HypeEvent {
	direction: 1 | -1;
	timestamp: number;
}

export interface GameEntry {
	id?: string;
	bggId: number;
	name: string;
	thumbnail: string;
	image: string;
	yearPublished: number;
	bggScore: number;
	weight: number;
	minPlayers: number;
	maxPlayers: number;
	bestPlayerCount: number[];
	recommendedPlayerCount: number[];
	playingTime: number;
	labels: string[];
	playDates: string[];
	personalNote: string;
	hypeEvents: HypeEvent[];
	addedAt: number;
	description: string;
	bggType: string[];
	categories: string[];
	mechanics: string[];
	hidden?: boolean;
}

export type SortKey = 'name' | 'bggScore' | 'weight' | 'hypeScore' | 'addedAt';
export type ViewMode = 'list' | 'tiles';
