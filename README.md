# Board Game Hype 🎲🔥

Track your board game collection with a smart hype score system. Search [BoardGameGeek](https://boardgamegeek.com/) for games, manage your collection, and track which games you're most excited about.

## Features

- **BGG Search** — Search the BoardGameGeek database and add games to your collection
- **Smart Hype Score** — Time-decaying enthusiasm score: hype fades naturally, repeated hypes stack up
- **Collection Views** — List or tile view with sorting by BGG score, weight, player count, best at, hype
- **Game Details** — Labels, play date tracking, personal notes
- **Google Auth** — Sign in with Google, data secured per-user in Firestore

## Setup

### 1. Firebase Project

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → Google provider
3. Enable **Cloud Firestore** (start in production mode)
4. Add a **Web app** and copy the config values

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Deploy to Firebase Hosting

```bash
npm run build
firebase deploy
```

For the BGG API proxy in production, also deploy the Cloud Function:

```bash
cd functions && npm install && cd ..
firebase deploy --only functions,hosting
```

## Hype Score System

Each "hype up" or "cool down" action creates a timestamped event. The score is computed using exponential decay:

```
score = Σ (direction × e^(-0.02 × days_since_event))
```

- **Half-life ~35 days**: a hype from 5 weeks ago counts half as much
- **Stacking**: hyping 3× today ≈ score of 3.0
- **Natural decay**: forgotten games cool down on their own
- **Floor at 0**: score never goes negative

## Tech Stack

- SvelteKit 5 (Svelte 5 with runes)
- Firebase Auth + Firestore
- Firebase Hosting + Cloud Functions
- BoardGameGeek XML API2
