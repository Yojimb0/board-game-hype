import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';

let currentUser = $state<User | null>(null);
let loading = $state(true);

onAuthStateChanged(auth, (user) => {
	currentUser = user;
	loading = false;
});

export function getAuthState() {
	return {
		get user() {
			return currentUser;
		},
		get loading() {
			return loading;
		}
	};
}

export async function loginWithGoogle() {
	await signInWithPopup(auth, googleProvider);
}

export async function logout() {
	await signOut(auth);
}
