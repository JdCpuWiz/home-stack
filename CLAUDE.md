# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HomeStack** is a self-hosted home management platform with three modules: Totes (labeled storage inventory), Todos, and Grocery Lists. Physical totes get thermal labels printed with a QR code linking to the tote's detail page. A global search is publicly accessible; all other features require authentication.

This is intended to be the first of a suite of home management apps sharing the same auth system, design system, and deployment infrastructure.

## Tech Stack

Follows the same stack as the sibling projects **wiz3d_prints** and **wiz3dtools**:

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 (dark mode only — `dark` class forced on `<html>`)
- **UI Components**: shadcn/ui
- **Auth**: NextAuth.js (credentials provider, JWT sessions)
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
npx prisma db push           # apply schema changes (use instead of migrate — managed Postgres)
npx prisma studio            # visual DB explorer
npx prisma db seed           # run prisma/seed.ts (creates admin/changeme user + seeded data)

# Versioning (no git tag)
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version major --no-git-tag-version
```

## Design System

Always dark, never toggled. `dark` class forced on `<html>` in layout.tsx.

### Colors
- **Background layers**: `#0a0a0a` (bg-base), `#1a1a1a` (bg-100), `#2d2d2d` (bg-200), `#3a3a3a` (bg-300), `#4a4a4a` (bg-400)
- **Text**: `#e5e5e5` primary, `#d1d5db` secondary
- **Orange accent**: `#ff9900` / `#e68a00`

### Shadows (dual light-top + dark-bottom)
- **Subtle**: `0 1px 2px rgba(0,0,0,0.3), 0 -1px 1px rgba(255,255,255,0.05)`
- **Standard**: `0 4px 6px rgba(0,0,0,0.4), 0 -2px 3px rgba(255,255,255,0.08)`
- **Prominent**: `0 10px 20px rgba(0,0,0,0.5), 0 -3px 6px rgba(255,255,255,0.1)`

### CSS Classes (defined in globals.css)
`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.input`, `.card`, `.card-surface`, `.wiz-table`

### Nav hover (globals.css)
`.nav-link:hover` and `.section-nav-link:hover` use `!important` on both `background-color` and `color` to override inline styles on active/inactive NavLink elements.

**Important**: Never name a CSS class `list-item` — Tailwind v4 treats it as `display: list-item`, generating a browser bullet `::marker`.

### Font
Poppins (Google Fonts)

## Authentication

NextAuth.js with credentials provider. Session strategy: JWT cookies.

| Route | Auth required |
|---|---|
| `/search` | Public |
| `/totes/[id]` (view via QR code) | Public |
| All other routes | Protected — redirect to `/login` |

Login uses `username` field (not email). Users table managed via Prisma. First user via `npx prisma db seed` → `admin/changeme`. Subsequent users created by admin via Settings → Users.

## Data Model

```prisma
model User {
  id            Int      @id @default(autoincrement())
  username      String   @unique
  email         String   @unique
  passwordHash  String
  role          Role     @default(USER)
  createdAt     DateTime @default(now())
}
enum Role { ADMIN USER }

model Tote {
  id        Int         @id @default(autoincrement())
  title     String
  items     ToteItem[]
  photos    TotePhoto[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}
model ToteItem {
  id          Int    @id @default(autoincrement())
  toteId      Int
  tote        Tote   @relation(fields: [toteId], references: [id], onDelete: Cascade)
  description String @db.VarChar(100)
  position    Int
}
model TotePhoto {
  id        Int      @id @default(autoincrement())
  toteId    Int
  tote      Tote     @relation(fields: [toteId], references: [id], onDelete: Cascade)
  filename  String
  createdAt DateTime @default(now())
}

model TodoItem {
  id        Int       @id @default(autoincrement())
  title     String
  notes     String?
  dueDate   DateTime?
  priority  Priority  @default(MEDIUM)
  category  String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
enum Priority { HIGH MEDIUM LOW }

model GroceryStore {
  id        Int           @id @default(autoincrement())
  name      String        @unique
  position  Int
  createdAt DateTime      @default(now())
  lists     GroceryList[]
}
model GroceryArea {
  id        Int              @id @default(autoincrement())
  name      String           @unique
  position  Int
  createdAt DateTime         @default(now())
  items     GroceryListItem[]
}
model GroceryList {
  id        Int              @id @default(autoincrement())
  storeId   Int
  store     GroceryStore     @relation(...)
  status    ListStatus       @default(ACTIVE)
  items     GroceryListItem[]
  trips     GroceryTrip[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
}
enum ListStatus { ACTIVE COMPLETED }
model GroceryListItem {
  id        Int          @id @default(autoincrement())
  listId    Int
  areaId    Int?
  name      String
  quantity  String?
  purchased Boolean      @default(false)
  position  Int
  createdAt DateTime     @default(now())
}
model GroceryTrip {
  id          Int              @id @default(autoincrement())
  listId      Int
  storeName   String
  completedAt DateTime         @default(now())
  items       GroceryTripItem[]
}
model GroceryTripItem {
  id        Int     @id @default(autoincrement())
  tripId    Int
  name      String
  quantity  String?
  areaName  String?
  purchased Boolean @default(false)
}
```

## Key Features

**Totes**: Physical storage bins with labeled items. `/totes/[id]` is public (QR code target). Print label at `/totes/[id]/label` — 4×6 format with QR code.

**Todos**: Simple task list with priority (HIGH/MEDIUM/LOW), optional due date, notes, category. Grouped display with overdue highlighting.

**Grocery**: Per-store shopping lists. Single unified list view — check an item to remove it (saved as `purchased: true`). "Complete Trip" archives to `GroceryTrip` history. "Clear List" wipes without archiving. History page shows all past unique items (deduplicated by name), grouped by area — acts as an item catalog to re-add to any store.

**Duplicate prevention**: Adding an item already on the active list (case-insensitive) returns 409.

**Versioning**: `NEXT_PUBLIC_APP_VERSION` read from `package.json` at build time via `next.config.ts`. Displayed in SideNav footer. Use `patch` for fixes, `minor` for new features, `major` for breaking changes.

## API Routes

See `docs/API.md` for full documentation including request/response shapes and n8n usage.

```
# Totes
GET  /api/totes
POST /api/totes
GET  /api/totes/[id]
PUT  /api/totes/[id]
DELETE /api/totes/[id]
POST /api/totes/[id]/photos
DELETE /api/totes/[id]/photos/[photoId]
GET  /api/search?q=

# Todos
GET    /api/todos
POST   /api/todos
PUT    /api/todos/[id]
DELETE /api/todos/[id]
DELETE /api/todos              # clear all

# Grocery
GET    /api/grocery/stores
POST   /api/grocery/stores
PUT    /api/grocery/stores/[id]
DELETE /api/grocery/stores/[id]
POST   /api/grocery/stores/[id]/items   # add to active list (dup check)

GET    /api/grocery/areas
POST   /api/grocery/areas
PUT    /api/grocery/areas/[id]
DELETE /api/grocery/areas/[id]

GET    /api/grocery/lists?storeId=
POST   /api/grocery/lists
GET    /api/grocery/lists/[id]
POST   /api/grocery/lists/[id]/items
PUT    /api/grocery/lists/[id]/items/[itemId]
DELETE /api/grocery/lists/[id]/items/[itemId]
POST   /api/grocery/lists/[id]/complete
DELETE /api/grocery/lists/[id]/clear

GET    /api/grocery/trips
GET    /api/grocery/suggestions?storeId=

DELETE /api/grocery/history/items?name=   # purge item from all trip history
```

## Layout Architecture

```
Root layout → SessionWrapper → Shell (client) → [Header + SideNav + main]
```
- **Shell**: manages `sidebarOpen` state; wraps with `GroceryActionsProvider`
- **Header**: mobile-only (`md:hidden`) — hamburger + logo
- **SideNav**: always visible on desktop (`md:static`), slide-in on mobile. Contains all nav, sign out, version. Fetches stores dynamically via `useEffect`. Reads `GroceryActionsContext` to show "Complete Trip" when on a store page.
- **GroceryActionsContext**: context provider (in Shell) that lets `GroceryListView` register a `completeTrip` callback consumed by `SideNav`.

## Project Structure

```
app/
  page.tsx                          # Home — tote list
  login/page.tsx + LoginForm.tsx
  search/page.tsx
  todos/page.tsx
  totes/[id]/page.tsx               # Public tote detail
  totes/[id]/edit/page.tsx
  totes/[id]/label/page.tsx + layout.tsx
  totes/new/page.tsx
  grocery/page.tsx                  # All Lists (store cards)
  grocery/[storeId]/page.tsx        # Active list for store
  grocery/history/page.tsx          # Item history catalog
  settings/users/page.tsx + UsersClient.tsx
  settings/grocery/page.tsx         # Admin: store + area management
  api/
    auth/[...nextauth]/route.ts
    search/route.ts
    totes/route.ts + [id]/route.ts + [id]/photos/... + uploads/...
    todos/route.ts + [id]/route.ts
    users/route.ts + [id]/route.ts
    grocery/stores/route.ts + [id]/route.ts + [id]/items/route.ts
    grocery/areas/route.ts + [id]/route.ts
    grocery/lists/route.ts + [id]/route.ts + [id]/items/... + [id]/complete + [id]/clear
    grocery/trips/route.ts
    grocery/suggestions/route.ts
    grocery/history/items/route.ts
    grocery/trips/[tripId]/items/[itemId]/readd/route.ts
components/
  layout/Header.tsx                 # Mobile-only header
  layout/Shell.tsx                  # Client wrapper + GroceryActionsProvider
  layout/SideNav.tsx                # Full nav, sign out, dynamic stores
  layout/SessionWrapper.tsx
  todos/TodoFormDialog.tsx, TodoList.tsx, todoUtils.ts
  totes/ToteCard.tsx, ToteForm.tsx, LabelView.tsx, TotePhotoManager.tsx
  grocery/GroceryListView.tsx       # Single list view (no modes)
  grocery/GroceryItemHistory.tsx    # Item history catalog client
  grocery/GrocerySettingsClient.tsx
  grocery/AddItemDialog.tsx
  grocery/GroceryActionsContext.tsx # Context for Complete Trip → SideNav
  grocery/groceryUtils.ts
lib/prisma.ts, lib/auth.ts
proxy.ts                            # Next.js middleware (renamed from middleware.ts)
prisma/schema.prisma
next.config.ts                      # standalone + /uploads rewrite + NEXT_PUBLIC_APP_VERSION
```

## Deployment

Docker Compose, single app container. Postgres is external.

```bash
# On server:
git pull origin main
docker compose up -d --build
# entrypoint.sh runs: npx prisma db push && node server.js
# Photos persist via ./uploads:/app/public/uploads volume
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Public URL (e.g. `https://homestack.deckerzoo.com`) |
| `PORT` | Host port (default 3000 internally, mapped via compose) |
| `PUID` / `PGID` | File ownership for uploads (set to match host user) |
| `OLLAMA_URL` | Ollama base URL for recipe scan (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | Ollama model name (default: `llava`; must be multimodal for photo scan) |

## Gotchas

- **Prisma v5** — pinned because server has Node 20.18.1 (v7 requires 20.19+)
- **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed middleware
- **Tailwind v4**: `@apply dark` invalid — dark class set on `<html>` in layout.tsx
- **`useSearchParams()` needs Suspense** — login page split into page.tsx + LoginForm.tsx
- **Next.js standalone doesn't serve `public/`** — uploaded files served via `/api/uploads/[...path]`, rewritten from `/uploads/*` in next.config.ts
- **`list-item` class name** — Tailwind treats it as `display: list-item`, adds browser bullet point. Use `grocery-row` or similar instead.
- **Nav hover** — NavLink uses inline `style` for active state; hover rules in globals.css require `!important` to override

## Session Management

At the end of every work session, run `/savesession` to update memory, commit all changes, and push to GitHub.

**GitHub repo**: https://github.com/JdCpuWiz/home-stack

## Future Suite Context

HomeStack is the first module in a self-hosted home management platform. When adding future modules, reuse:
- The `User`/`Role` auth model and NextAuth config
- The shared design system (colors, shadows, CSS classes, Poppins font)
- The Docker Compose deployment pattern with external Postgres
- The `GroceryActionsContext` pattern for wiring page-level actions into SideNav
