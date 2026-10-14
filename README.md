# Wichtel-Generator

An online "Wichteltopf" (Secret Santa pot):

1. The organiser creates a pot and gets two links: a **participation link** and a secret **admin link**.
2. Participants open the participation link, enter their name and receive a secret **code name**.
3. The organiser can remove participants and add **exclusions** (e.g. couples shouldn't draw each other).
4. Closing the pot draws the assignment: one big circle where possible, so there are no "A ↔ B" pairs. The result page lists "code name → receiver" and is visible to everyone with the participation link. Each participant only knows their own code name.

## Development

Requires Node.js ≥ 24 (TypeScript runs natively, no build step).

```bash
npm install
npm run dev      # Node version: http://localhost:8080, restarts on change
npm run cf:dev   # Cloudflare version with local D1: http://localhost:8787
npm run check    # typecheck + lint + tests
npm run test:mobile  # checks all pages at phone widths in headless Chrome
npm run screenshots  # phone screenshots of all pages into screenshots/ (demo data: scripts/demo.ts)
npm run format   # auto-format with Biome
```

### Structure

| Path                  | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `src/worker.ts`       | Entry point for Cloudflare Workers (incl. daily cleanup cron) |
| `src/server.ts`       | Entry point for Node.js / Docker                              |
| `src/app.ts`          | Routes (Hono), shared by both entry points                    |
| `src/store.ts`        | Data access, written against the async interface in `db.ts`   |
| `src/db-d1.ts`        | Database driver for Cloudflare D1                             |
| `src/db-node.ts`      | Database driver for `node:sqlite`                             |
| `migrations/`         | SQL schema, used by both drivers                              |
| `src/draw.ts`         | The drawing algorithm                                         |
| `src/views.ts`        | Server-rendered HTML                                          |
| `src/themes.ts`       | Background themes                                             |
| `src/codenames.ts`    | Code name lists to choose from; a list's size limits the pot |
| `public/static/`      | CSS, JS, generated images                                     |
| `assets/backgrounds/` | Source photos for the themes                                  |

Schema changes go into a new `migrations/NNNN_name.sql` file. Never edit an applied migration.

### Adding a theme

1. Put the photo into `assets/backgrounds/<id>.jpg`.
2. Run `npm run images` (requires `cwebp`: `brew install webp`).
3. Add `{ id, dark, align }` to `src/themes.ts` and run `npm run themes`.

## Deployment on Cloudflare (main)

The app runs as a Cloudflare Worker with a D1 database. Static files are served directly by Cloudflare. The free plan is plenty.

One-time setup:

```bash
npx wrangler login
npx wrangler d1 create wichteltopf-eu --jurisdiction eu   # put the returned database_id into wrangler.jsonc
npm run deploy                       # applies migrations, then deploys
```

Custom domain: once `wichteltopf.de` is active in Cloudflare, enable the `routes` entry in `wrangler.jsonc` and deploy again.

CI deploys automatically on every push to `main`. This needs the repository secrets `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers", plus permission "D1: Edit") and `CLOUDFLARE_ACCOUNT_ID`.

Useful commands: `npx wrangler tail` (live logs), `npx wrangler d1 time-travel restore DB --timestamp=…` (restore the DB to a point in time).

## Self-hosting with Node.js / Docker (alternative)

| Variable        | Default                   | Description                                                       |
| --------------- | ------------------------- | ----------------------------------------------------------------- |
| `PORT`          | `8080`                    |                                                                   |
| `BASEURL`       | derived from request      | Public URL used in the displayed links, e.g. `https://wichteln.example.org` |
| `DATABASE_PATH` | `database/wichtel.sqlite` | SQLite file                                                       |
| `TRUST_PROXY`   | off                       | Set to `1` behind a reverse proxy, to rate-limit by `X-Forwarded-For` |
| `POT_TTL_DAYS`  | `90`                      | Pots without activity are deleted after this many days            |

```bash
docker pull ghcr.io/michaelkreil/wichtel-generator:latest   # published for tags v*
```

The image runs as a non-root user, stores data in the `/app/database` volume and has a healthcheck on `/healthz`. Put it behind a reverse proxy for TLS and set `BASEURL` and `TRUST_PROXY=1`.
