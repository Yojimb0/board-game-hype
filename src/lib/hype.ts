import type { HypeEvent } from './types';

/**
 * Decay constant for hype score calculation.
 * Half-life ≈ ln(2) / LAMBDA ≈ 35 days.
 * - A single hype today = 1.0
 * - After 35 days that same hype ≈ 0.5
 * - After 70 days ≈ 0.25
 * - Multiple hypes accumulate: 3 hypes today ≈ 3.0
 * - Games hyped regularly stay hot; forgotten ones cool down
 */
const LAMBDA = 0.02;

export function calculateHypeScore(hypeEvents: HypeEvent[]): number {
	if (!hypeEvents || hypeEvents.length === 0) return 0;

	const now = Date.now();
	let score = 0;

	for (const event of hypeEvents) {
		const daysSince = (now - event.timestamp) / (1000 * 60 * 60 * 24);
		score += event.direction * Math.exp(-LAMBDA * daysSince);
	}

	return Math.round(Math.max(0, score) * 100) / 100;
}

export function getHypeColor(score: number): string {
	if (score <= 0) return 'var(--text-hint)';
	if (score < 1) return '#78909C'; // blue-grey
	if (score < 2) return '#FFA726'; // orange
	if (score < 3) return '#FF7043'; // deep orange
	return '#E53935'; // red – it's on fire
}

export function getHypeLabel(score: number): string {
	if (score <= 0) return 'Cold';
	if (score < 1) return 'Warm';
	if (score < 2) return 'Hot';
	if (score < 3) return 'Fire';
	return 'Blazing';
}
