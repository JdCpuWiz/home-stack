# HomeStack — Deployment Guide

## Prerequisites on the remote server

- Docker + Docker Compose v2
- Git
- Access to the remote Postgres server from the remote host
- A reverse proxy (Traefik, Nginx, Caddy, etc.) fronting port 3000

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
nano .env
```

Fill in all values:

```env
# Postgres connection string (remote server)
DATABASE_URL="postgresql://user:password@host:5432/homestack?schema=public"

# Random secret for NextAuth JWT signing
NEXTAUTH_SECRET="<random secret>"

# Public URL the app is served at (used in QR codes on labels)
NEXTAUTH_URL="https://homestack.example.com"

# User/group ID for file permissions (match your server user)
PUID=1000
PGID=1000

# Timezone
TZ=America/New_York
```

**Generate a secure `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

**Find your PUID/PGID:**
```bash
id
# uid=1000(youruser) gid=1000(youruser)
```

---

## 3. Build and start

```bash
docker compose up -d --build
```

This will:
1. Build the Next.js app inside Docker (multi-stage, node:20-alpine)
2. Run `prisma db push` on startup to sync the schema to your Postgres DB
3. Start the app listening on `0.0.0.0:3000`

**Check logs:**
```bash
docker compose logs -f
```

Look for `Ready` to confirm startup. You'll see Prisma sync output first, then the Next.js server.

---

## 4. Seed the first admin user

Run once after the first deployment:

```bash
docker compose exec homestack sh -c "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
```

To customise the credentials:

```bash
docker compose exec homestack sh -c "
  SEED_USERNAME=admin \
  SEED_EMAIL=admin@example.com \
  SEED_PASSWORD=changeme \
  npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts
"
```

**Change the password immediately** after first login via Settings → Users.

---

## 5. Point your reverse proxy at port 3000

The app listens on port 3000. Configure your reverse proxy to forward traffic to it.

**NEXTAUTH_URL must match the public URL** your proxy serves the app on — this is also used to build the QR code URLs printed on labels.

---

## 6. Verify

- Open your configured URL in a browser
- You should be redirected to `/login`
- Sign in with your seeded credentials
- Change the password via the **Users** link in the header

---

## Updating

```bash
git pull origin main
docker compose up -d --build
```

Schema changes are applied automatically on startup via `prisma db push`.

---

## Troubleshooting

**Container exits immediately**
```bash
docker compose logs homestack
```
Usually a missing or malformed `DATABASE_URL` or `NEXTAUTH_SECRET`.

**Prisma db push fails**
- Confirm the DB host is reachable from the Docker host: `docker compose exec homestack ping <db-host>`
- Check `DATABASE_URL` credentials and database name
- The DB user needs SELECT, INSERT, UPDATE, DELETE, CREATE TABLE privileges — but NOT create database

**App loads but login redirects incorrectly**
- Check `NEXTAUTH_URL` is set to the exact public URL (with `https://`)
- Ensure your reverse proxy passes the `Host` header through

**QR codes point to the wrong URL**
- `NEXTAUTH_URL` is used to build the QR code link on labels — must be the correct public HTTPS URL
