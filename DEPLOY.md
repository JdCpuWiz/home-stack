# HomeStack — Deployment Guide

## Prerequisites on the remote server

- Docker + Docker Compose v2
- Traefik running as a reverse proxy with:
  - An external Docker network named `traefik`
  - An HTTPS entrypoint named `websecure`
  - A cert resolver named `letsencrypt`
- Git
- Access to the remote Postgres server from the remote host
- A domain/subdomain pointed at the server (e.g. `homestack.example.com`)

---

## 1. Clone the repo

```bash
git clone https://github.com/JdCpuWiz/home-stack.git
cd home-stack
```

---

## 2. Create the `.env` file

```bash
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Fill in all three values:

```env
DATABASE_URL="postgresql://user:password@host:5432/homestack?schema=public"
NEXTAUTH_SECRET="<random secret>"
NEXTAUTH_URL="https://homestack.example.com"
HOMESTACK_HOST="homestack.example.com"
```

**Generate a secure `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

> `HOMESTACK_HOST` is used by the Traefik router rule. It must match your domain exactly.

---

## 3. Build and start

```bash
docker compose up -d --build
```

This will:
1. Build the Next.js app inside Docker (multi-stage)
2. Run `prisma db push` on startup to sync the schema
3. Start the app on port 3000 (behind Traefik)

**Check logs:**
```bash
docker compose logs -f
```

Look for `Ready` to confirm startup. You should see Prisma sync output followed by the Next.js server starting.

---

## 4. Seed the first admin user

Run this once after the first deployment:

```bash
docker compose exec homestack sh -c "
  SEED_USERNAME=admin \
  SEED_EMAIL=admin@example.com \
  SEED_PASSWORD=changeme \
  npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts
"
```

Or use the defaults (username: `admin`, password: `changeme`):

```bash
docker compose exec homestack sh -c "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
```

**Change the password immediately** after first login via Settings → Users.

---

## 5. Verify

- Open `https://homestack.example.com` in a browser
- You should be redirected to `/login`
- Sign in with `admin` / `changeme`
- Change the password via the **Users** link in the header

---

## Updating

```bash
git pull origin main
docker compose up -d --build
```

Schema changes are applied automatically on startup via `prisma db push`.

---

## Traefik not running / no Traefik setup

If you want to test without Traefik, expose the port directly instead.
Replace the `labels` and `networks` section in `compose.yaml` temporarily:

```yaml
services:
  homestack:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
```

Then access via `http://<server-ip>:3000`.

---

## Troubleshooting

**Container exits immediately**
```bash
docker compose logs homestack
```
Usually a missing or malformed `DATABASE_URL` or `NEXTAUTH_SECRET`.

**Prisma db push fails**
- Confirm the DB server is reachable from the Docker host
- Check `DATABASE_URL` credentials and database name
- The DB user needs SELECT, INSERT, UPDATE, DELETE, CREATE TABLE privileges (but NOT create database)

**Traefik not routing**
- Confirm the `traefik` external network exists: `docker network ls | grep traefik`
- Confirm `HOMESTACK_HOST` in `.env` matches your DNS record exactly
- Check Traefik dashboard for the `homestack` router

**QR codes point to wrong URL**
- `NEXTAUTH_URL` must be set to the public HTTPS URL — this is used to build the QR code link on labels
