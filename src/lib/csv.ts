import type { BggGameDetails } from './types';

interface BggCsvRow {
	[key: string]: string;
}

/**
 * Parse a BGG collection CSV export into an array of BggGameDetails-like objects.
 * Handles quoted fields with commas and escaped double-quotes.
 */
export function parseBggCsv(csvText: string): BggGameDetails[] {
	const rows = parseCsvRows(csvText);
	if (rows.length === 0) return [];

	return rows
		.filter((row) => row.objectid && row.objectname)
		.map((row) => {
			const bestPlayerCount = parsePlayerList(row.bggbestplayers || '');
			const recommendedPlayerCount = parsePlayerList(row.bggrecplayers || '');

			return {
				id: parseInt(row.objectid),
				name: row.objectname || 'Unknown',
				thumbnail: '',
				image: '',
				description: '',
				yearPublished: parseInt(row.yearpublished || '0'),
				minPlayers: parseInt(row.minplayers || '0'),
				maxPlayers: parseInt(row.maxplayers || '0'),
				playingTime: parseInt(row.playingtime || '0'),
				minPlayTime: parseInt(row.minplaytime || '0'),
				maxPlayTime: parseInt(row.maxplaytime || '0'),
				bggScore: parseFloat(row.average || '0'),
				averageRating: parseFloat(row.baverage || '0'),
				weight: parseFloat(row.avgweight || '0'),
				bestPlayerCount,
				recommendedPlayerCount,
				bggType: [],
				categories: [],
				mechanics: []
			};
		});
}

function parsePlayerList(str: string): number[] {
	if (!str) return [];
	return str
		.split(',')
		.map((s) => parseInt(s.trim()))
		.filter((n) => !Number.isNaN(n) && n > 0);
}

/**
 * Parses CSV text into an array of key-value objects using the header row as keys.
 * Handles RFC 4180 quoting (double-quote escaping, fields with commas/newlines).
 */
function parseCsvRows(text: string): BggCsvRow[] {
	const lines = splitCsvLines(text);
	if (lines.length < 2) return [];

	const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
	const results: BggCsvRow[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		const values = parseCsvLine(line);
		const row: BggCsvRow = {};
		for (let j = 0; j < headers.length; j++) {
			row[headers[j]] = values[j] || '';
		}
		results.push(row);
	}

	return results;
}

/**
 * Split CSV text into logical lines, handling quoted fields that contain newlines.
 */
function splitCsvLines(text: string): string[] {
	const lines: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === '"') {
			inQuotes = !inQuotes;
			current += ch;
		} else if ((ch === '\n' || ch === '\r') && !inQuotes) {
			if (ch === '\r' && text[i + 1] === '\n') i++; // skip \r\n
			lines.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	if (current.trim()) lines.push(current);

	return lines;
}

/**
 * Parse a single CSV line into field values, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (line[i + 1] === '"') {
					current += '"';
					i++; // skip escaped quote
				} else {
					inQuotes = false;
				}
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				fields.push(current);
				current = '';
			} else {
				current += ch;
			}
		}
	}
	fields.push(current);

	return fields;
}
