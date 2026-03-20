# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HomeStack** is a self-hosted home management platform. Modules: Totes (labeled storage inventory), Todos, Grocery Lists, Recipes, Packages (shipment tracking), Email Digest, and Finance (monthly budget tracker). Physical totes get thermal labels printed with a QR code linking to the tote's detail page. A global search is publicly accessible; all other features require authentication.

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

**Recipes**: Scan photos with Ollama (multimodal LLM) to extract ingredients and steps. CRUD for recipes with ingredients, steps, tags, servings, source URL.

**Packages**: Shipment tracking. Packages created by n8n from email parsing. Status updated by n8n polling UPS/USPS APIs. Inline editable description and shipper name. Delivered packages never downgraded.

**Email Digest**: Persistent accumulation of incoming email senders. Unapproved senders counted separately. HIGH/NORMAL/LOW priority tiers. HIGH priority senders get Ollama-generated one-sentence description. Manually cleared via "Clear & Archive". Fed by n8n via `POST /api/email-digest/tally`.

**Finance**: Monthly budget tracker. Categories: Bills, Subscriptions, Shared Credit, My Cards, Shared Cards, Loans, Unplanned. Net pay pulled automatically from timesheet app. Amounts carry over from previous month. Inline amount editing, paid checkboxes, due-date color coding (yellow ≤5 days, red ≤1 day/overdue). Clear Defaults / Load Defaults / Complete Month (lock) actions. Dashboard card shows current month summary.

**Duplicate prevention**: Adding a grocery item already on the active list (case-insensitive) returns 409.

**Versioning**: `NEXT_PUBLIC_APP_VERSION` read from `package.json` at build time via `next.config.ts`. Displayed in SideNav footer. Use `patch` for fixes, `minor` for new features, `major` for breaking changes.

## API Routes

See `docs/API.md` for full documentation including request/response shapes and n8n usage.

```
# Totes
GET    /api/totes
POST   /api/totes
GET    /api/totes/[id]
PUT    /api/totes/[id]
DELETE /api/totes/[id]
POST   /api/totes/[id]/photos
DELETE /api/totes/[id]/photos/[photoId]
GET    /api/search?q=

# Todos  (session or Bearer)
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
DELETE /api/grocery/history/items?name=
POST   /api/grocery/trips/[tripId]/items/[itemId]/readd

# Packages  (session or Bearer)
GET    /api/packages
POST   /api/packages
PATCH  /api/packages/[id]
DELETE /api/packages/[id]

# Email Digest  (session or Bearer)
GET    /api/email-digest
POST   /api/email-digest/tally        # { sender } — increment sender count
POST   /api/email-digest/clear        # archive active digest
GET    /api/email-digest/senders
POST   /api/email-digest/senders
PATCH  /api/email-digest/senders/[id]
DELETE /api/email-digest/senders/[id]

# Finance  (session only)
GET    /api/finance/months/[year]/[month]           # get or create month
PATCH  /api/finance/months/[year]/[month]           # update netPay
POST   /api/finance/months/[year]/[month]/sync-pay  # pull from timesheet
POST   /api/finance/months/[year]/[month]/entries   # add UNPLANNED entry
POST   /api/finance/months/[year]/[month]/clear-defaults
POST   /api/finance/months/[year]/[month]/load-defaults
POST   /api/finance/months/[year]/[month]/archive   # toggle lock
PATCH  /api/finance/entries/[id]                    # update amount/isPaid/notes
DELETE /api/finance/entries/[id]
GET    /api/finance/items
POST   /api/finance/items
PATCH  /api/finance/items/[id]
DELETE /api/finance/items/[id]

# Recipes
GET    /api/recipes
POST   /api/recipes
GET    /api/recipes/[id]
PUT    /api/recipes/[id]
DELETE /api/recipes/[id]
POST   /api/recipes/scan               # Ollama photo scan
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
  page.tsx                          # Dashboard — module summary cards
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
  packages/page.tsx
  email-digest/page.tsx
  finance/page.tsx
  recipes/page.tsx + [id]/page.tsx + new/page.tsx
  settings/users/page.tsx + UsersClient.tsx
  settings/grocery/page.tsx
  settings/email-digest/page.tsx
  settings/finance/page.tsx
  api/
    auth/[...nextauth]/route.ts
    search/route.ts
    totes/route.ts + [id]/route.ts + [id]/photos/... + uploads/...
    todos/route.ts + [id]/route.ts
    users/route.ts + [id]/route.ts
    grocery/stores/route.ts + [id]/route.ts + [id]/items/route.ts
    grocery/areas/route.ts + [id]/route.ts
    grocery/lists/route.ts + [id]/route.ts + [id]/items/... + [id]/complete + [id]/clear
    grocery/trips/route.ts + [tripId]/items/[itemId]/readd/route.ts
    grocery/suggestions/route.ts
    grocery/history/items/route.ts
    packages/route.ts + [id]/route.ts
    email-digest/route.ts + tally/route.ts + clear/route.ts
    email-digest/senders/route.ts + [id]/route.ts
    finance/months/[year]/[month]/route.ts
    finance/months/[year]/[month]/sync-pay/route.ts
    finance/months/[year]/[month]/entries/route.ts
    finance/months/[year]/[month]/clear-defaults/route.ts
    finance/months/[year]/[month]/load-defaults/route.ts
    finance/months/[year]/[month]/archive/route.ts
    finance/entries/[id]/route.ts
    finance/items/route.ts + [id]/route.ts
    recipes/route.ts + [id]/route.ts + scan/route.ts
components/
  layout/Header.tsx                 # Mobile-only header
  layout/Shell.tsx                  # Client wrapper + GroceryActionsProvider
  layout/SideNav.tsx                # Collapsible sections, all nav
  layout/SessionWrapper.tsx
  finance/FinanceDashboard.tsx      # Monthly budget view
  settings/FinanceSettingsClient.tsx
  settings/EmailDigestSettingsClient.tsx
  todos/TodoFormDialog.tsx, TodoList.tsx, todoUtils.ts
  totes/ToteCard.tsx, ToteForm.tsx, LabelView.tsx, TotePhotoManager.tsx
  grocery/GroceryListView.tsx
  grocery/GroceryItemHistory.tsx
  grocery/GrocerySettingsClient.tsx
  grocery/AddItemDialog.tsx
  grocery/GroceryActionsContext.tsx
  grocery/groceryUtils.ts
  packages/PackageList.tsx
lib/prisma.ts, lib/auth.ts, lib/apiAuth.ts
lib/timesheetClient.ts              # Fetches net pay from timesheet app (node:http)
lib/ollamaDigest.ts                 # Generates sender descriptions via Ollama
middleware.ts                       # NextAuth withAuth wrapper + API exclusion list
prisma/schema.prisma
next.config.ts                      # standalone + /uploads rewrite + NEXT_PUBLIC_APP_VERSION
compose.yaml                        # build: . (local build, no GHCR image)
.github/workflows/docker.yml        # DISABLED — workflow_dispatch only
```

## Deployment

Docker Compose with **local build** (no CI/CD image registry). Postgres is external.

```bash
# On server — standard deploy:
git pull origin main
docker compose up -d --build

# Full clean rebuild (if caching issues):
docker compose down && docker system prune --all
git pull origin main
docker compose up -d --build

# entrypoint.sh runs: npx prisma db push && node server.js
# Photos persist via ./uploads:/app/public/uploads volume

# Schema changes — run from dev machine (prisma not in container):
npx prisma db push
```

> **Note**: The GitHub Actions workflow (`docker.yml`) is disabled — it only runs on `workflow_dispatch`. Do NOT re-enable push/tag triggers; deployment is done via local build on the server.

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
| `HOMESTACK_API_KEY` | Bearer token for n8n/external API calls (packages, todos, email digest) |
| `TIMESHEET_URL` | Base URL of the timesheet app (e.g. `http://192.168.7.93:3000`) — Finance module |
| `TIMESHEET_API_KEY` | Bearer token matching `INTERNAL_API_KEY` in the timesheet app — Finance module |

## Gotchas

- **Prisma v5** — pinned because server has Node 20.18.1 (v7 requires 20.19+)
- **`middleware.ts`** — file is `middleware.ts`; the exported default is a function called `proxy()` wrapping `withAuth`. Next.js 16 shows a deprecation warning suggesting `proxy.ts` — ignore it, keep `middleware.ts`.
- **Tailwind v4**: `@apply dark` invalid — dark class set on `<html>` in layout.tsx
- **`useSearchParams()` needs Suspense** — login page split into page.tsx + LoginForm.tsx
- **Next.js standalone doesn't serve `public/`** — uploaded files served via `/api/uploads/[...path]`, rewritten from `/uploads/*` in next.config.ts
- **`list-item` class name** — Tailwind treats it as `display: list-item`, adds browser bullet point. Use `grocery-row` or similar instead.
- **Nav hover** — NavLink uses inline `style` for active state; hover rules in globals.css require `!important` to override
- **n8n Bearer token auth** — new API endpoints called by n8n must be added to the `matcher` exclusion list in `middleware.ts`, or NextAuth intercepts before `isAuthorized()` runs. Current exclusions: `api/packages`, `api/todos`, `api/email-digest`
- **Always commit new route files** — new `app/api/` route files must be explicitly `git add`-ed; forgetting this causes 404s in production since the container builds from git content
- **Timesheet uses Node `http` module** — `lib/timesheetClient.ts` uses `node:http`/`node:https` directly; Next.js/Turbopack's extended `fetch` causes "l.slice is not a function" errors when combined with custom headers
- **`prisma db push` from dev machine** — `prisma` CLI is not installed in the production container; run schema migrations from the dev machine against the shared Postgres DB

## Session Management

At the end of every work session, run `/savesession` to update memory, commit all changes, and push to GitHub.

**GitHub repo**: https://github.com/JdCpuWiz/home-stack

## Future Suite Context

HomeStack is the first module in a self-hosted home management platform. When adding future modules, reuse:
- The `User`/`Role` auth model and NextAuth config
- The shared design system (colors, shadows, CSS classes, Poppins font)
- The Docker Compose deployment pattern with external Postgres
- The `GroceryActionsContext` pattern for wiring page-level actions into SideNav
