import { db } from './firebase';
import {
	doc,
	getDoc,
	setDoc,
	deleteDoc,
	onSnapshot,
	collection,
	query,
	getDocs
} from 'firebase/firestore';
import type { GameEntry } from './types';

export interface UserProfile {
	username: string;
	isPublic: boolean;
}

let profile = $state<UserProfile | null>(null);
let profileLoading = $state(true);
let unsubProfile: (() => void) | null = null;

export function getProfile() {
	return {
		get data() {
			return profile;
		},
		get loading() {
			return profileLoading;
		}
	};
}

export function subscribeToProfile(userId: string) {
	if (unsubProfile) unsubProfile();
	profileLoading = true;

	const ref = doc(db, 'users', userId, 'settings', 'profile');
	unsubProfile = onSnapshot(
		ref,
		(snap) => {
			if (snap.exists()) {
				profile = snap.data() as UserProfile;
			} else {
				profile = null;
			}
			profileLoading = false;
		},
		(error) => {
			console.error('Profile subscription error:', error);
			profileLoading = false;
		}
	);
}

export function unsubscribeFromProfile() {
	if (unsubProfile) {
		unsubProfile();
		unsubProfile = null;
	}
	profile = null;
	profileLoading = true;
}

/** Check if a username is available (not taken by another user) */
export async function isUsernameAvailable(
	username: string,
	currentUserId?: string
): Promise<boolean> {
	const ref = doc(db, 'usernames', username.toLowerCase());
	const snap = await getDoc(ref);
	if (!snap.exists()) return true;
	// Available if the current user already owns it
	return snap.data().userId === currentUserId;
}

/** Validate username format */
export function isValidUsername(username: string): string | null {
	if (username.length < 3) return 'At least 3 characters';
	if (username.length > 24) return 'Max 24 characters';
	if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Letters, numbers, _ and - only';
	if (/^(search|api|settings|login|admin)$/i.test(username)) return 'Reserved name';
	return null;
}

/** Save username + public flag. Handles the usernames lookup collection atomically. */
export async function saveProfile(
	userId: string,
	username: string,
	isPublic: boolean
) {
	const lowerUsername = username.toLowerCase();
	const profileRef = doc(db, 'users', userId, 'settings', 'profile');

	// Remove old username reservation if changing
	if (profile?.username && profile.username.toLowerCase() !== lowerUsername) {
		const oldRef = doc(db, 'usernames', profile.username.toLowerCase());
		await deleteDoc(oldRef);
	}

	// Reserve new username
	const usernameRef = doc(db, 'usernames', lowerUsername);
	await setDoc(usernameRef, { userId, username: lowerUsername });

	// Save profile
	await setDoc(profileRef, { username: lowerUsername, isPublic });
}

/** Update only the public flag */
export async function setPublic(userId: string, isPublic: boolean) {
	if (!profile) return;
	const ref = doc(db, 'users', userId, 'settings', 'profile');
	await setDoc(ref, { ...profile, isPublic }, { merge: true });
}

/** Look up a userId by username */
export async function getUserIdByUsername(
	username: string
): Promise<string | null> {
	const ref = doc(db, 'usernames', username.toLowerCase());
	const snap = await getDoc(ref);
	if (!snap.exists()) return null;
	return snap.data().userId;
}

/** Check if a user's profile is public */
export async function isUserPublic(userId: string): Promise<boolean> {
	const ref = doc(db, 'users', userId, 'settings', 'profile');
	const snap = await getDoc(ref);
	if (!snap.exists()) return false;
	return snap.data().isPublic === true;
}

/** Load a public user's game collection (one-time fetch, not realtime).
 *  Strips personal data (notes, play dates) for privacy. */
export async function loadPublicCollection(
	userId: string
): Promise<GameEntry[]> {
	const q = query(collection(db, 'users', userId, 'games'));
	const snapshot = await getDocs(q);
	return snapshot.docs.map((d) => {
		const data = d.data();
		return {
			id: d.id,
			...data,
			personalNote: '',
			playDates: []
		} as GameEntry;
	});
}

/** Get a user's public profile by userId */
export async function getPublicProfile(
	userId: string
): Promise<UserProfile | null> {
	const ref = doc(db, 'users', userId, 'settings', 'profile');
	const snap = await getDoc(ref);
	if (!snap.exists()) return null;
	return snap.data() as UserProfile;
}
