# Study Drift

**Study Drift** turns a study guide into a racing game. Answer questions correctly to build speed, maintain a streak, and finish a lap with a clear picture of what to review next.

It ships with a ready-to-play Cellular Respiration deck, supports creating study sets from pasted notes or uploaded files, and includes a multiplayer race flow backed by Cloudflare D1.

## What you can do

- **Race solo.** Take one question per concept, earn points according to difficulty and streak, and see a topic-by-topic accuracy report at the finish line.
- **Learn from a demo immediately.** The bundled BIO 101 Cellular Respiration deck works without accounts, a database, or API keys.
- **Build a set from notes.** Paste structured notes into the importer to create a local study set in the browser.
- **Generate a set from a file.** With an OpenAI API key configured, upload a PDF, Word document, image, Markdown file, or plain-text guide (up to 8 MB). The server produces 4–12 concepts with two question variants per concept.
- **Race friends.** Create a six-character room code, share it with up to three other players, wait until everyone is ready, and race through the same frozen question deck. Rooms expire after 30 minutes.
- **Review weak spots.** The post-race report ranks topics by accuracy, making the next study pass more focused.

## How a race works

Each lap contains one question for every concept in the selected study set. The app rotates between question variants on later laps so a retry tests understanding rather than recall alone.

| Difficulty | In-game label | Base points |
| --- | --- | ---: |
| 1 | Warm-up | 100 |
| 2 | Technical | 135 |
| 3 | Apex | 170 |

Correct answers also earn a streak bonus (up to four bonuses) and increase the displayed car speed. An incorrect answer breaks the streak. In multiplayer, the first player to answer every question correctly wins; scores and progress are stored in D1.

## Technology

- React 19 with Vinext/Vite and TypeScript
- Tailwind CSS and shadcn-style UI components
- Cloudflare Workers runtime and D1 (SQLite) for multiplayer rooms, players, and answers
- Drizzle ORM and versioned SQL migrations
- OpenAI Responses API for optional file-to-study-guide generation

## Run it locally

### Prerequisites

- [Node.js](https://nodejs.org/) **22.13.0 or later** (the required version is declared in `package.json`)
- npm (included with Node.js)
- Optional: an OpenAI API key for AI file imports

### 1. Clone and install

```bash
git clone <your-repository-url>
cd study-drift
npm ci
```

`npm ci` uses the checked-in `package-lock.json`, giving local testers the same dependency versions used by the project.

### 2. Start the development server

```bash
npm run dev
```

Open the local URL printed by Vinext (normally `http://localhost:5173`). Select **Solo race** and start the Cellular Respiration deck to verify the base experience. No environment variables are required for this path.

### 3. Stop the server

Press `Ctrl+C` in the terminal running the development server.

## Enable optional features locally

### AI study-guide imports

Create a local `.env` file at the repository root. It is ignored by Git, so never commit an API key.

```dotenv
OPENAI_API_KEY=your_api_key_here
# Optional. Defaults to gpt-5.6-terra when omitted.
OPENAI_MODEL=gpt-5.6-terra
```

Restart `npm run dev`, then use **Import study guide**. The API key remains server-side: the browser sends the selected file to `/api/study-guides/generate`, and the Worker calls the OpenAI Responses API. File support is PDF, DOC, DOCX, JPG, JPEG, PNG, TXT, and Markdown; the maximum upload size is 8 MB.

If no key is configured, pasted-note imports and solo play still work. Only AI file generation is unavailable.

### Multiplayer races and local D1

Multiplayer uses Cloudflare D1, bound as `DB`. The local development configuration is generated from [`.openai/hosting.json`](.openai/hosting.json) and stores Miniflare state under `.wrangler/`.

Before creating or joining a room, apply the checked-in database migrations once. First build the Worker configuration, then execute each migration against the local D1 database:

```bash
npm run build
cd dist/server
npx wrangler d1 execute DB --local --file=../../drizzle/0000_tiny_morlun.sql --config wrangler.json
npx wrangler d1 execute DB --local --file=../../drizzle/0001_chief_white_queen.sql --config wrangler.json
cd ../..
```

Then run `npm run dev` and choose **Multiplayer** in the garage. To test with two players, open the application in a second browser profile or device that can reach the same development server, create a room in one session, and join with its room code in the other.

> The development server uses a placeholder D1 database ID intentionally. It is for local Miniflare state only. A deployed multiplayer service needs a real D1 binding supplied by its Cloudflare/OpenAI Sites hosting environment.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the local development server with hot reload. |
| `npm run build` | Create the production Worker and client bundle in `dist/`. |
| `npm run start` | Serve the already-built Worker locally through Wrangler. Run `npm run build` first. |
| `npm run typecheck` | Check TypeScript without emitting files. |
| `npm run lint` | Run Oxlint. |
| `npm run format` | Format source files with Oxfmt. |
| `npm run db:generate` | Generate a new Drizzle migration after changing `db/schema.ts`. |

## Project layout

```text
app/
  page.tsx                            Application entry point
  api/rooms/route.ts                  Multiplayer room API
  api/study-guides/generate/route.ts  AI study-guide generation API
components/
  study-drift-app.tsx                 Main solo/multiplayer app state and screens
  study-guide-importer.tsx            Note and file import dialog
  multiplayer-*.tsx                   Lobby, garage, race track, and car UI
lib/
  study-data.ts                       Study-set types and bundled demo deck
  race-engine.ts                      Scoring, speed, and report calculations
  multiplayer-server.ts               D1-backed room lifecycle and answer handling
  multiplayer-client.ts               Browser API client and session storage
  ai-study-guide.ts                   Generated-set validation and conversion
db/
  schema.ts                           Drizzle D1 schema
drizzle/                              Versioned SQLite migrations
vite.config.ts                        Vite, Cloudflare, and local environment setup
```

## Data and privacy notes

- Solo progress (tokens, completed races, longest streak, and best score) is stored in browser `localStorage`; clearing site data removes it. Imported sets live in the running app session, so re-import them after a page refresh.
- Multiplayer session tokens are kept in `sessionStorage`; closing a browser session may require joining again.
- Multiplayer records include room state, player display names, answer outcomes, and scores in the configured D1 database.
- AI imports send the selected source file to the OpenAI Responses API through the application server with `store: false`. Do not upload material you are not permitted to share.

## Troubleshooting

**The app starts, but creating a multiplayer room fails.** Apply both migrations in the “Multiplayer races and local D1” section, then restart the development server. The `race_rooms`, `race_players`, and `race_answers` tables must exist.

**“AI imports need an OpenAI API key on the server.”** Add `OPENAI_API_KEY` to `.env` and restart the server. Check that the key belongs to a project with access to the configured model.

**The AI import reports a quota or model error.** Confirm billing/credits and either remove `OPENAI_MODEL` to use the default or set it to a model available to your OpenAI project.

**Another device cannot join a locally hosted room.** The second device must be able to reach the machine running Vinext (for example, via a LAN-accessible host configuration). Browser tabs on the same machine are the simplest local test.

## Development notes

When changing the database schema, generate and commit a migration with `npm run db:generate`, then apply that migration to every local or deployed D1 environment. The multiplayer server deliberately freezes the question IDs and deck version when a room is created, so every racer receives the same questions even if the currently selected deck changes later.
