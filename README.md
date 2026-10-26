# Block Puzzle 2

8x8 drag-and-drop block puzzle. Single-file web game (`index.html`), no build step.

- Levels: Easy, Medium, Hard, Daily (same pieces for everyone, one go a day).
- Scores and saved games live in the browser's local storage.
- The daily leaderboard backend is not wired up here yet.

Leaderboard: Vercel functions in `api/` backed by Upstash Redis (players pick a username, no accounts).
