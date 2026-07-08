# BFF Test

A friendship-quiz web app. A creator writes multiple-choice questions about
themselves and picks the correct answer for each; friends take the quiz, get a
server-scored result with a tier badge, and land on a leaderboard.

Scoring is **cheat-proof**: the creator's answer key never leaves the server.
`GET /api/quiz/:id` returns questions *without* answers — the correct picks only
appear in the per-question breakdown returned *after* an attempt is submitted.

## Two interchangeable backends, one API contract

Both backends expose the identical JSON API, so the frontend in `public/` works
against either without changes.

### Local dev — simple file-backed Node server

Zero dependencies. Persists to `data.json` in the repo root.

```
node server.js
```

Serves the app (and API) at http://localhost:5178 (auto-bumps the port if busy).
Code lives in `server.js` + `lib/` (`store.js`, `scoring.js`, `mime.js`).

### Cloudflare Pages Functions + D1 (production)

The `functions/` directory mirrors the same API as Pages Functions backed by a
D1 (SQLite) database bound as `env.DB`. This is what deploys to Cloudflare
Pages, which has no persistent Node server.

Run it locally with Wrangler (uses a local SQLite D1 emulation):

```
npx wrangler d1 execute bff-test --local --file=schema.sql   # one-time, creates tables
npx wrangler pages dev public
```

- `functions/_lib/scoring.js` — shared scoring/tier logic (imported, not routed;
  files under `functions/` beginning with `_` are never treated as routes).
- `functions/api/quiz.js` — `POST /api/quiz` (create).
- `functions/api/quiz/[id].js` — `GET /api/quiz/:id` (public, answers stripped).
- `functions/api/quiz/[id]/attempt.js` — `POST /api/quiz/:id/attempt` (score + store).
- `functions/api/quiz/[id]/leaderboard.js` — `GET /api/quiz/:id/leaderboard`.

## API contract

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/quiz` | `{creatorName, questions:[{text, options:[...], answer:int}]}` | `{id}` |
| GET | `/api/quiz/:id` | — | `{creatorName, total, questions:[{text, options:[...]}]}` (no answers) |
| POST | `/api/quiz/:id/attempt` | `{friendName, guesses:[int]}` | `{score, total, tier, breakdown:[{text, options, yourPick, correctPick, right}]}` |
| GET | `/api/quiz/:id/leaderboard` | — | `{creatorName, attempts:[{friendName, score, total, tier}]}` (score desc) |

Tiers (by score/total ratio): ≥.9 `🏆 S · CERTIFIED BFF`, ≥.7 `💛 A · BESTIES`,
≥.5 `😎 B · GOOD FRIEND`, ≥.3 `🤔 C · ACQUAINTANCE`, ≥1 correct `😬 D · BARELY`,
else `👻 F · STRANGER`.

## Deploy notes

1. Create the D1 database: `npx wrangler d1 create bff-test`.
2. Put the returned `database_id` into `wrangler.toml` (replace `PLACEHOLDER_D1_ID`).
3. Apply the schema to remote: `npx wrangler d1 execute bff-test --remote --file=schema.sql`.
4. Deploy: connect the repo to Cloudflare Pages (build output dir `public`) or
   `npx wrangler pages deploy public`. Bind the `DB` D1 database to the Pages
   project in the Cloudflare dashboard (or via `wrangler.toml`).

`schema.sql` holds the table definitions. `questions` is stored as a JSON string
and parsed on read. All SQL uses parameterized `.bind(...)` statements.
