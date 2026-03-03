<p align="center">
  <img src="public/logo.png" alt="HomeStack" width="220" />
</p>

<h3 align="center">Self-hosted home management — totes, todos, and grocery lists.</h3>

<p align="center">
  <img alt="GitHub release" src="https://img.shields.io/github/v/release/JdCpuWiz/home-stack?style=flat-square" />
  <img alt="Docker image" src="https://img.shields.io/badge/image-ghcr.io%2Fjdcpuwiz%2Fhome--stack-blue?style=flat-square&logo=docker" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
</p>

---

## Features

| Module | Description |
|---|---|
| **Totes** | Label physical storage totes with QR codes. Scan to see contents. Print 4×6 shipping labels. |
| **Todos** | Task list with priority levels, due dates, and categories. |
| **Grocery** | Plan shopping trips by store and aisle. Check off items as you shop. Searchable item history. |

All modules share a single login. First-time setup creates your admin account through a built-in wizard — no seeding scripts required.

---

## Quick Start

**Requirements**
- Docker + Docker Compose v2
- PostgreSQL database (external — not bundled)
- A reverse proxy with a domain/SSL cert (Traefik, Nginx, Caddy, etc.)

```bash
# 1. Get the files
git clone https://github.com/JdCpuWiz/home-stack.git
cd home-stack

# 2. Configure
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXTAUTH_SECRET, and NEXTAUTH_URL

# 3. Start
docker compose pull
docker compose up -d
```

Open your app URL. You'll be redirected to `/setup` to create your admin account.

See **[DEPLOY.md](DEPLOY.md)** for full setup details — environment variables, reverse proxy config, PUID/PGID, and troubleshooting.

---

## Updating

```bash
docker compose pull
docker compose up -d
```

Database schema changes are applied automatically on startup. Photos and data are preserved — they live outside the container.

---

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [PostgreSQL](https://postgresql.org) + [Prisma](https://prisma.io)
- [NextAuth.js](https://next-auth.js.org) (credentials provider)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- Docker + Docker Compose

---

## License

[MIT](LICENSE)
