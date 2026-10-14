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
npm run dev      # http://localhost:8080, restarts on change
npm run check    # typecheck + lint + tests
npm run format   # auto-format with Biome
```

### Structure

| Path                   | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `src/server.ts`        | Entry point: config, HTTP server, cleanup of old pots    |
| `src/app.ts`           | Routes (Hono)                                            |
| `src/store.ts`         | Persistence (SQLite via `node:sqlite`)                   |
| `src/draw.ts`          | The drawing algorithm                                    |
| `src/views.ts`         | Server-rendered HTML                                     |
| `src/themes.ts`        | Background themes                                        |
| `data/codenames.txt`   | Pool of code names (also limits the participants per pot) |
| `public/`              | CSS, JS, generated images                                |
| `assets/backgrounds/`  | Source photos for the themes                             |

### Adding a theme

1. Put the photo into `assets/backgrounds/<id>.jpg`.
2. Run `npm run images` (requires `cwebp`: `brew install webp`).
3. Add `{ id, dark, align }` to `src/themes.ts`.

## Configuration

| Variable        | Default                   | Description                                                       |
| --------------- | ------------------------- | ----------------------------------------------------------------- |
| `PORT`          | `8080`                    |                                                                   |
| `BASEURL`       | derived from request      | Public URL used in the displayed links, e.g. `https://wichteln.example.org` |
| `DATABASE_PATH` | `database/wichtel.sqlite` | SQLite file                                                       |
| `POT_TTL_DAYS`  | `180`                     | Pots without activity are deleted after this many days            |

## Deployment with Docker

```bash
docker pull ghcr.io/michaelkreil/wichtel-generator:latest
```

The image runs as a non-root user, stores data in the `/app/database` volume, and has a healthcheck on `/healthz`.

CI runs typecheck, lint and tests on every push and PR. Pushes to `main` publish `:latest`, and tags `v*` publish versioned images.

### Example: Hetzner Cloud

1. Start a new server:
   - Image: Docker CE
   - Type: CAX11 (smallest ARM64)
2. Make sure DNS points to the server's IP.
3. Log in via SSH and run:

```bash
wget "https://github.com/MichaelKreil/wichtel-generator/raw/refs/heads/main/compose.yaml"
docker compose up --detach
```
