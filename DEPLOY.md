# HomeStack — Deployment Guide

## Requirements

- Docker + Docker Compose v2
- PostgreSQL database — HomeStack does **not** bundle a database. You need an external Postgres instance reachable from the Docker host.
- A reverse proxy (Traefik, Nginx, Caddy, etc.) to handle HTTPS and routing

---

## 1. Get the files

```bash
git clone https://github.com/JdCpuWiz/home-stack.git
cd home-stack
```

---

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
# Postgres connection string
DATABASE_URL="postgresql://user:password@host:5432/homestack?schema=public"

# Random secret for session signing — generate with:
#   openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"

# Public URL the app is served at (must match your reverse proxy)
# Also used to generate QR code URLs on tote labels
NEXTAUTH_URL="https://homestack.yourdomain.com"

# Host port to expose (container always listens on 3000 internally)
PORT=3000

# Match these to your server user to avoid permission issues on uploaded files
# Run `id` on your server to find your values
PUID=1000
PGID=1000

# Timezone
TZ=America/New_York

# Ollama — used by the Recipes "Scan" feature (parse recipe from text or photo)
# Point to your Ollama instance. Omit to use the default: http://localhost:11434
OLLAMA_URL="http://192.168.1.100:11434"
# Any model you have pulled. llava or llava:13b recommended (multimodal, needed for photo scan).
OLLAMA_MODEL="llava"
```

> **Ollama is optional.** If `OLLAMA_URL` is not set the Scan feature will attempt `http://localhost:11434`. If Ollama is unreachable the scan button will return an error, but the rest of the app works normally.

---

## 3. Start

```bash
docker compose pull
docker compose up -d
```

On first start, `entrypoint.sh` runs `prisma db push` to create the schema, then starts the app. Check logs with:

```bash
docker compose logs -f
```

Wait for `Ready` in the output before proceeding.

---

## 4. First-run setup

Open your app URL in a browser. You will be redirected to `/setup` where you create your admin account (username, email, password). This only appears once — after the first account is created, the setup page is permanently disabled.

---

## 5. Configure your reverse proxy

The app listens on the port set in `PORT` (default `3000`). Point your reverse proxy at it and ensure:

- **HTTPS** is terminated at the proxy
- The `Host` header is forwarded
- `NEXTAUTH_URL` in `.env` matches the exact public URL (including `https://`)

---

## 6. Verify

- Navigate to your configured URL
- You should see the setup wizard on first visit, or the login page if setup is already complete
- Sign in and confirm the app loads

---

## Updating

```bash
docker compose pull
docker compose up -d
```

Schema migrations run automatically on startup via `prisma db push`. Your uploaded photos and database data are unaffected — photos are bind-mounted from `./uploads/` on the host and the database is external.

---

## Data & Persistence

| Data | Where it lives | Survives updates? |
|---|---|---|
| Database (totes, todos, grocery) | External Postgres | Yes — external |
| Uploaded photos | `./uploads/` on host | Yes — bind mount |
| App configuration | `.env` on host | Yes |

---

## Troubleshooting

**Container exits immediately**
```bash
docker compose logs homestack
```
Usually a missing or malformed `DATABASE_URL` or `NEXTAUTH_SECRET`.

**`prisma db push` fails on startup**
- Confirm the DB is reachable from the Docker host: `docker compose exec homestack ping <db-host>`
- Verify `DATABASE_URL` credentials and database name
- The DB user needs `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE` — but **not** `CREATE DATABASE`

**Login redirects incorrectly / infinite loop**
- Verify `NEXTAUTH_URL` is set to the exact public URL (with `https://`)
- Ensure your reverse proxy passes the `Host` header

**QR codes on tote labels point to the wrong URL**
- `NEXTAUTH_URL` is used to build the QR code URL — must be the correct public HTTPS URL

**Photos not loading after update**
- Confirm the `./uploads` volume is present in `compose.yaml` and the directory exists on the host
- Check `PUID`/`PGID` match your server user (`id` on the host)

**Recipe "Scan" returns "Failed to reach Ollama"**
- Verify `OLLAMA_URL` is set and reachable from the Docker container: `docker compose exec homestack wget -qO- http://<ollama-host>:11434/api/tags`
- Ollama must be accessible from the container's network — if Ollama runs on the Docker host, use `http://host.docker.internal:11434` (Linux: add `extra_hosts: ["host.docker.internal:host-gateway"]` to `compose.yaml`) or the host's LAN IP
- Confirm the model is pulled: run `ollama list` on the Ollama host and check the value matches `OLLAMA_MODEL`
- For photo scanning, the model must be multimodal (e.g. `llava`, `llava:13b`); text-only models will fail on image input
