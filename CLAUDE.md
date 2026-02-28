# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HomeStack** is a self-hosted home management platform, starting with a tote inventory module. Each tote has a title and a free-text item list. Physical totes get thermal labels printed with a QR code linking to the tote's detail page. A global search is publicly accessible; all other features require authentication.

This is intended to be the first of a suite of home management apps sharing the same auth system, design system, and deployment infrastructure.

## Tech Stack

Follows the same stack as the sibling projects **wiz3d_prints** and **wiz3dtools**:

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS (dark mode only — `dark` class forced on `<html>`)
- **UI Components**: shadcn/ui
- **Auth**: NextAuth.js (credentials provider, session-based)
- **Database**: PostgreSQL with Prisma ORM (external managed Postgres — not in Docker Compose)
- **Package Manager**: npm
- **Deployment**: Docker Compose, reverse-proxied by Traefik

## Development Commands

```bash
npm install

npm run dev        # development server
npm run build      # production build
npm start          # production server
npm run lint

# Prisma / database
npx prisma migrate dev       # create and apply a new migration
npx prisma migrate deploy    # apply migrations in production
npx prisma studio            # visual DB explorer
npx prisma db seed           # run prisma/seed.ts
```

## Design System

Identical to wiz3d_prints / wiz3dtools — always dark, never toggled.

### Colors
- **Background layers**: `#0a0a0a` (iron-950), `#1a1a1a`, `#2d2d2d`, `#3a3a3a`, `#4a4a4a`
- **Text**: `#e5e5e5` primary, `#d1d5db` secondary
- **Orange accent**: `#ff9900` / `#e68a00`

### Shadows (dual light-top + dark-bottom)
- **Subtle**: `0 1px 2px rgba(0,0,0,0.3), 0 -1px 1px rgba(255,255,255,0.05)`
- **Standard**: `0 4px 6px rgba(0,0,0,0.4), 0 -2px 3px rgba(255,255,255,0.08)`
- **Prominent**: `0 10px 20px rgba(0,0,0,0.5), 0 -3px 6px rgba(255,255,255,0.1)`

### CSS Classes (defined in globals.css)
`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.input`, `.card`, `.card-surface`, `.wiz-table`

### Font
Poppins (Google Fonts)

## Authentication

NextAuth.js with credentials provider. Session strategy: JWT cookies.

| Route | Auth required |
|---|---|
| `/search` | Public |
| `/totes/[id]` (view via QR code) | Public |
| All other routes | Protected — redirect to `/login` |

Users table managed via Prisma. First user registered becomes admin. Subsequent users created by admin via a settings/users page.

## Data Model

```prisma
model User {
  id            Int       @id @default(autoincrement())
  username      String    @unique
  email         String    @unique
  passwordHash  String
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
}

enum Role { ADMIN USER }

model Tote {
  id        Int        @id @default(autoincrement())
  title     String
  items     ToteItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model ToteItem {
  id          Int    @id @default(autoincrement())
  toteId      Int
  tote        Tote   @relation(fields: [toteId], references: [id], onDelete: Cascade)
  description String @db.VarChar(100)   // 100 chars — revisit as needed
  position    Int
}
```

## Key Features

**Tote detail URL**: `/totes/[id]` — publicly accessible (QR code target). Shows all items and a Print Label button.

**Edit**: `/totes/[id]/edit` — protected. Edit tote title and items.

**Search**: `/search?q=` — public, spans tote titles and item descriptions.

**Label print view**: `/totes/[id]/label` — minimal page (no nav) styled for `@media print` to match Jadens JD-668BT label dimensions (4" wide). QR code generated client-side with `qrcode.react`.

## API Routes

```
GET  /api/totes              # list all totes (protected)
POST /api/totes              # create tote (protected)
GET  /api/totes/[id]         # tote detail + items (public)
PUT  /api/totes/[id]         # update tote + items (protected)
DEL  /api/totes/[id]         # delete tote (protected)
GET  /api/search?q=          # full-text search across totes + items (public)
```

## Project Structure (planned)

```
app/
  page.tsx                   # Home — tote list (protected)
  login/page.tsx             # Login page
  search/page.tsx            # Public search
  totes/
    new/page.tsx             # Create tote (protected)
    [id]/
      page.tsx               # Tote detail (public)
      edit/page.tsx          # Edit tote (protected)
      label/page.tsx         # Print-only label view (public)
  settings/
    users/page.tsx           # Admin: user management
  api/
    auth/[...nextauth]/route.ts
    totes/route.ts
    totes/[id]/route.ts
    search/route.ts
components/
  ui/                        # shadcn/ui base components
  layout/                    # Header, Footer, Nav
  totes/                     # ToteCard, ToteItemList, SearchBar, QRCode, LabelPreview
  auth/                      # LoginForm, ProtectedRoute wrapper
lib/
  prisma.ts                  # Prisma client singleton
  auth.ts                    # NextAuth config
prisma/
  schema.prisma
  migrations/
```

## Deployment

Docker Compose with a single app container. **Postgres is external** (remote managed server — not in compose).

```yaml
# compose.yaml (sketch)
services:
  homestack:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ...
      NEXTAUTH_SECRET: ...
      NEXTAUTH_URL: ...
    restart: unless-stopped
```

Traefik handles TLS termination and routing externally.

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (remote server) |
| `NEXTAUTH_SECRET` | Required — random secret for NextAuth JWT signing |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `https://homestack.local`) |

### Deploy updates

```bash
git pull origin main
docker compose up -d --build
# Migrations run automatically on startup via postinstall or entrypoint
```

## Session Management

At the end of every work session, run `/savesession` to update memory, commit all changes, and push to GitHub.

**GitHub repo**: https://github.com/JdCpuWiz/home-stack

## Future Suite Context

HomeStack is designed to be the first module in a self-hosted home management platform. When adding future modules (e.g. pantry tracking, home inventory), reuse:
- The `User`/`Role` auth model and NextAuth config from this project
- The shared design system (colors, shadows, CSS classes, Poppins font)
- The Docker Compose deployment pattern with external Postgres
