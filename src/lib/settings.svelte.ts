import type { ViewMode } from './types';

const STORAGE_KEY = 'bgh-settings';

interface Settings {
	defaultView: ViewMode;
	showHidden: boolean;
}

const defaults: Settings = {
	defaultView: 'list',
	showHidden: false
};

function load(): Settings {
	if (typeof localStorage === 'undefined') return { ...defaults };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return { ...defaults, ...JSON.parse(raw) };
	} catch {
		// ignore
	}
	return { ...defaults };
}

function save(s: Settings) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let settings = $state<Settings>(load());

export function getSettings() {
	return {
		get defaultView() {
			return settings.defaultView;
		},
		set defaultView(v: ViewMode) {
			settings.defaultView = v;
			save(settings);
		},
		get showHidden() {
			return settings.showHidden;
		},
		set showHidden(v: boolean) {
			settings.showHidden = v;
			save(settings);
		}
	};
}
