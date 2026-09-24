# Pickleball Open Play

A room-based queue/court manager for pickleball open play sessions.
Stack: React (Vite) + Express + Neon (Postgres).

## Features included

- Create a room with title, optional password, max players, number of courts
- Join via room code (+ password if set)
- Waiting queue, sorted by fewest games played / longest wait (fair rotation)
- Host can add walk-ins, remove/no-show players
- Assign next 4 queued players to an open court — two modes:
  - **Balanced**: mixes skill levels across teams
  - **Random**: pure random partner mixing
- Report match score → players return to queue, stats update automatically
- Leaderboard (win rate, wins/losses) per room
- Simple host-only controls via a host token saved in the browser that created the room
- **Your Rooms** list on the home page — Back button no longer loses your room
- **Instant updates** with Socket.io (a slow safety refresh runs underneath in case the live connection drops)
- **📺 TV Board** at `/room/<CODE>/tv` — read-only big-screen view of courts, queue and top players
- **Pause / Taking a break** — a player (or the host) sits out without losing stats; skipped by matchmaking until they return
- **📊 Session summary** at `/room/<CODE>/summary` — top player, most games, attendance, totals. The host can **End Session** (and reopen it)

Not included yet (see "Next steps" below): accounts/auth beyond the host and
player tokens, notifications.

## 1. Set up the database (Neon)

1. Create a project at https://neon.tech and copy your connection string.
2. In `backend/.env` (copy from `.env.example`), set `DATABASE_URL`.
3. Run the migration:
   ```bash
   cd backend
   npm install
   npm run migrate
   ```
   This creates the `rooms`, `players`, `courts`, `matches` tables.

## 2. Run the backend locally

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL
npm install
npm run dev
```
Runs on `http://localhost:4000`.

## 3. Run the frontend locally

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL to your backend URL
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## 4. Try it out

1. Open the app → **Create a Room** → note the room code.
2. Open a second browser (or incognito tab) → **Join a Room** with that code.
3. Back in the host tab, go to the room page → click **Assign Next 4** on a
   court once you have 4+ players in queue.
4. Enter a score and click **Finish** to close the match and return players
   to the queue — check the leaderboard update.

## Deployment

Socket.io runs inside the same backend service — no extra setup on Render
(WebSockets are supported). The backend adds the `player_token` column on
startup if it's missing, so no manual migration is needed for existing data.

- **Backend → Render**: create a Web Service from the `backend` folder,
  set `DATABASE_URL` and `CORS_ORIGIN` (your Vercel URL) as env vars,
  build command `npm install`, start command `npm start`.
- **Frontend → Vercel**: import the `frontend` folder, set `VITE_API_URL`
  to your Render backend URL as an environment variable.

## Next steps to build

- QR code for room join link
- Push/SMS notification when a player's court opens
- DUPR-style rating import
