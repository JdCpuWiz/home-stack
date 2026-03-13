# HomeStack API Reference

Base URL: `https://homestack.deckerzoo.com` (or `http://localhost:3000` for local dev)

---

## Authentication

HomeStack uses NextAuth.js session cookies. All protected endpoints require a valid session cookie (`next-auth.session-token`).

### Signing in from n8n (or any HTTP client)

**Step 1 — Get CSRF token**

```
GET /api/auth/csrf
```

Response:
```json
{ "csrfToken": "abc123..." }
```

**Step 2 — Sign in**

```
POST /api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

csrfToken=abc123...&username=admin&password=yourpassword&redirect=false&json=true
```

Response sets a `next-auth.session-token` cookie. Capture and send this cookie with all subsequent requests.

### n8n workflow pattern

1. **HTTP Request node** → `GET /api/auth/csrf` → parse `csrfToken` from response body
2. **HTTP Request node** → `POST /api/auth/callback/credentials` with form body → save session cookie
3. All subsequent **HTTP Request nodes** → include the session cookie in headers:
   `Cookie: next-auth.session-token=<value>`

> Tip: In n8n, use the "Store Cookies" option on the HTTP Request node to handle cookie persistence automatically.

---

## Totes

### List all totes
```
GET /api/totes
Auth: required
```
Response: array of tote objects with nested items, ordered by `updatedAt` descending.
```json
[
  {
    "id": 1,
    "title": "Holiday Decorations",
    "items": [
      { "id": 1, "toteId": 1, "description": "Wreath", "position": 0 }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Get single tote
```
GET /api/totes/:id
Auth: public
```
Response: tote with items and photos, or 404.

### Create tote
```
POST /api/totes
Auth: required
Content-Type: application/json
```
Body:
```json
{ "title": "Camping Gear", "items": ["Tent", "Sleeping bag", "Lantern"] }
```
Response `201`: created tote object.

### Update tote
```
PUT /api/totes/:id
Auth: required
Content-Type: application/json
```
Body (replaces all items atomically):
```json
{ "title": "Camping Gear", "items": ["Tent", "Sleeping bag", "Lantern", "Stove"] }
```
Response: updated tote.

### Delete tote
```
DELETE /api/totes/:id
Auth: required
```
Response: `{ "ok": true }`

### Upload photo
```
POST /api/totes/:id/photos
Auth: required
Content-Type: multipart/form-data

field name: photo
```
Response `201`: created photo record.

### Delete photo
```
DELETE /api/totes/:id/photos/:photoId
Auth: required
```
Response: `{ "ok": true }`

### Search
```
GET /api/search?q=<query>
Auth: public
```
Response: array of matching totes (searches title + item descriptions).

---

## Todos

### List todos
```
GET /api/todos
Auth: required
```
Response: array of todos ordered by dueDate asc, then createdAt asc.
```json
[
  {
    "id": 1,
    "title": "Buy groceries",
    "notes": null,
    "dueDate": null,
    "priority": "MEDIUM",
    "category": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Create todo
```
POST /api/todos
Auth: required
Content-Type: application/json
```
Body:
```json
{
  "title": "Call doctor",
  "notes": "Annual checkup",
  "dueDate": "2025-06-01",
  "priority": "HIGH",
  "category": "Health"
}
```
`priority`: `"HIGH"` | `"MEDIUM"` | `"LOW"` (default `"MEDIUM"`)
`dueDate`: ISO date string, optional

Response `201`: created todo.

### Update todo
```
PUT /api/todos/:id
Auth: required
Content-Type: application/json
```
Body: same fields as create (all optional).

Response: updated todo.

### Delete todo
```
DELETE /api/todos/:id
Auth: required
```
Response: `{ "ok": true }`

### Clear all todos
```
DELETE /api/todos
Auth: required
```
Deletes every todo. Response: `{ "ok": true }`

---

## Grocery — Stores

### List stores
```
GET /api/grocery/stores
Auth: required
```
Response: array of stores ordered by position.
```json
[{ "id": 1, "name": "Walmart", "position": 0, "createdAt": "..." }]
```

### Create store
```
POST /api/grocery/stores
Auth: required
Content-Type: application/json

{ "name": "Costco" }
```
Response `201`: created store.

### Update store
```
PUT /api/grocery/stores/:id
Auth: required
Content-Type: application/json

{ "name": "Walmart Supercenter", "position": 0 }
```

### Delete store
```
DELETE /api/grocery/stores/:id
Auth: required
```
Response: `{ "ok": true }`

### Add item to store's active list
```
POST /api/grocery/stores/:id/items
Auth: required
Content-Type: application/json
```
Finds or creates the ACTIVE list for this store and adds the item. Returns `409` if item already on list (case-insensitive).
```json
{ "name": "Milk", "quantity": "1 gallon", "areaName": "Dairy" }
```
`areaName` is matched case-sensitively to an existing GroceryArea. Optional.

Response `201`: `{ "storeId": 1 }`
Response `409`: `{ "error": "Item already on list" }`

---

## Grocery — Areas

### List areas
```
GET /api/grocery/areas
Auth: required
```
Response: array of areas ordered by position.

### Create area
```
POST /api/grocery/areas
Auth: required
Content-Type: application/json

{ "name": "Produce" }
```
Response `201`: created area.

### Update area
```
PUT /api/grocery/areas/:id
Auth: required
Content-Type: application/json

{ "name": "Fresh Produce", "position": 0 }
```

### Delete area
```
DELETE /api/grocery/areas/:id
Auth: required
```

---

## Grocery — Lists

### Get active list for store
```
GET /api/grocery/lists?storeId=1
Auth: required
```
Returns the ACTIVE list with all items (including area details), or `null` if none exists.

### Create list
```
POST /api/grocery/lists
Auth: required
Content-Type: application/json

{ "storeId": 1 }
```
Returns `409` if an ACTIVE list already exists for that store.
Response `201`: created list.

### Get list by ID
```
GET /api/grocery/lists/:id
Auth: required
```

### Add item to list
```
POST /api/grocery/lists/:id/items
Auth: required
Content-Type: application/json
```
Returns `409` if item name already exists unpurchased (case-insensitive).
```json
{ "name": "Eggs", "quantity": "1 dozen", "areaId": 3 }
```
`areaId`: ID of a GroceryArea, optional.

Response `201`: created item with area relation.

### Update item
```
PUT /api/grocery/lists/:id/items/:itemId
Auth: required
Content-Type: application/json
```
```json
{ "name": "Eggs", "quantity": "2 dozen", "areaId": 3, "purchased": true }
```
All fields optional. Setting `purchased: true` marks it as checked off.

### Delete item
```
DELETE /api/grocery/lists/:id/items/:itemId
Auth: required
```

### Complete trip
```
POST /api/grocery/lists/:id/complete
Auth: required
```
Snapshots all items (purchased and unpurchased) into a `GroceryTrip`, marks list as `COMPLETED`.
A new ACTIVE list is auto-created next time the store page is visited.

Response `201`: created trip object with items.

### Clear list (no history)
```
DELETE /api/grocery/lists/:id/clear
Auth: required
```
Deletes all items from the list without creating a trip snapshot.
Response: `{ "ok": true }`

---

## Grocery — Trips & History

### List all trips
```
GET /api/grocery/trips
Auth: required
```
Response: all trips ordered by `completedAt` desc, with nested items.
```json
[
  {
    "id": 1,
    "listId": 2,
    "storeName": "Walmart",
    "completedAt": "2025-03-01T18:00:00.000Z",
    "items": [
      { "id": 1, "tripId": 1, "name": "Milk", "quantity": "1 gallon", "areaName": "Dairy", "purchased": true }
    ]
  }
]
```

### Get suggestions for store
```
GET /api/grocery/suggestions?storeId=1
Auth: required
```
Returns past item names for this store ordered by frequency (most used first).
Response: `["Milk", "Eggs", "Bread", ...]`

### Re-add history item to a store
```
POST /api/grocery/trips/:tripId/items/:itemId/readd
Auth: required
```
Finds or creates active list for the trip's store, adds the item.
Response `201`: `{ "item": {...}, "storeId": 1 }`

### Delete item from all history
```
DELETE /api/grocery/history/items?name=Milk
Auth: required
```
Permanently removes all `GroceryTripItem` records matching the name (case-insensitive).
Response: `{ "ok": true }`

---

## Packages

Packages are tracked shipments. Status is normally updated by an n8n workflow polling UPS/USPS APIs. `description` and `shipperName` are manually editable in the UI (inline edit, pencil icon on hover).

### List packages
```
GET /api/packages
Auth: required (session or Bearer)
```
Query params:
- `all=true` — include delivered packages (default: active only)
- `eta=today` — only packages with estimated delivery today

Response: array of package objects.
```json
[
  {
    "id": 1,
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "UPS",
    "description": "Kitchen stand mixer",
    "status": "IN_TRANSIT",
    "statusDetail": "Louisville, KY - UPS Hub",
    "estimatedDelivery": "2025-03-15T00:00:00.000Z",
    "delivered": false,
    "sourceEmail": "ship-confirm@amazon.com",
    "shipperName": "Amazon",
    "originCity": "Louisville",
    "originState": "KY",
    "trackingUrl": "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    "createdAt": "2025-03-12T10:00:00.000Z",
    "updatedAt": "2025-03-13T08:30:00.000Z"
  }
]
```

### Create package (idempotent)
```
POST /api/packages
Auth: required (session or Bearer)
Content-Type: application/json
```
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "sourceEmail": "ship-confirm@amazon.com"
}
```
`carrier`: `"UPS"` | `"USPS"`
`description`: optional — **do not** populate this from the email subject line; leave it blank so users can fill it in manually via the UI.
`sourceEmail`: optional — the email address the tracking number was parsed from.

If a package with the same `trackingNumber` already exists, returns the existing record (idempotent).

Response `201`: created package. `200`: already existed.

### Update package status
```
PATCH /api/packages/:id
Auth: required (session or Bearer)
Content-Type: application/json
```
Used by n8n to push tracking updates. All fields optional — only provided fields are updated.
```json
{
  "status": "IN_TRANSIT",
  "statusDetail": "Louisville, KY - UPS Hub",
  "estimatedDelivery": "2025-03-15T00:00:00.000Z",
  "delivered": false,
  "events": [...],
  "shipperName": "Amazon",
  "originCity": "Louisville",
  "originState": "KY"
}
```
`status`: `"UNKNOWN"` | `"PENDING"` | `"IN_TRANSIT"` | `"OUT_FOR_DELIVERY"` | `"DELIVERED"` | `"EXCEPTION"`

**Guard rails** (enforced server-side):
- Once `delivered = true` or `status = "DELIVERED"` is set, subsequent PATCHes will **never** reset it — prevents n8n re-runs from downgrading a delivered package.

Response: updated package object.

### Delete package
```
DELETE /api/packages/:id
Auth: required (session or Bearer)
```
Response: `{ "ok": true }`

### n8n — package_status_updater body reference

**POST (create) node body** — do not include `description`:
```
{{ JSON.stringify({ trackingNumber: $json.trackingNumber, carrier: $json.carrier, sourceEmail: $json.sourceEmail }) }}
```

**PATCH (update) node body:**
```
{{ JSON.stringify({ status: $json.status, statusDetail: $json.statusDetail, estimatedDelivery: $json.estimatedDelivery, events: $json.events, delivered: $json.delivered, shipperName: $json.shipperName, originCity: $json.originCity, originState: $json.originState }) }}
```

---

## Email Digest

All email digest endpoints accept either a valid session cookie **or** a Bearer token (`Authorization: Bearer <HOMESTACK_API_KEY>`), making them safe to call from n8n without a login flow.

### Get today's digest
```
GET /api/email-digest
Auth: required (session or Bearer)
```
Returns today's digest object or `null` if none has been posted yet.
```json
{
  "id": 1,
  "reportDate": "2025-03-13T00:00:00.000Z",
  "totalCount": 42,
  "entries": [
    { "sender": "orders@amazon.com", "count": 15 },
    { "sender": "@paypal.com", "count": 8 }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Upsert today's digest
```
POST /api/email-digest
Auth: required (session or Bearer)
Content-Type: application/json
```
Creates or updates the digest for today (midnight UTC). Automatically prunes digests older than 7 days.
```json
{
  "entries": [
    { "sender": "orders@amazon.com", "count": 15 },
    { "sender": "@paypal.com", "count": 8 }
  ]
}
```
`entries`: non-empty array of `{ sender: string, count: number }` — totals are summed automatically.

Response `200`: upserted digest object.

### List approved senders
```
GET /api/email-digest/senders
Auth: required (session or Bearer)
```
Response: array of approved sender objects.
```json
[
  { "id": 1, "value": "orders@amazon.com", "label": "Amazon", "createdAt": "..." },
  { "id": 2, "value": "@paypal.com", "label": null, "createdAt": "..." }
]
```

### Create approved sender (admin only)
```
POST /api/email-digest/senders
Auth: admin session
Content-Type: application/json
```
```json
{ "value": "orders@amazon.com", "label": "Amazon" }
```
`value`: exact email or domain wildcard (e.g. `@amazon.com`). Stored lowercased.
`label`: optional display name.

Response `201`: created sender.
Response `409`: `{ "error": "Sender already exists" }`

### Delete approved sender (admin only)
```
DELETE /api/email-digest/senders/:id
Auth: admin session
```
Response: `{ "ok": true }` or `404` if not found.

---

## Users (Admin only)

### List users
```
GET /api/users
Auth: admin
```
Response: array of users (no passwordHash).

### Create user
```
POST /api/users
Auth: admin
Content-Type: application/json

{ "username": "jane", "email": "jane@example.com", "password": "secret", "role": "USER" }
```
`role`: `"ADMIN"` | `"USER"`
Response `201`: created user.

### Update user
```
PATCH /api/users/:id
Auth: admin
Content-Type: application/json

{ "password": "newpassword", "role": "ADMIN" }
```
Both fields optional.

### Delete user
```
DELETE /api/users/:id
Auth: admin
```
Cannot delete yourself. Response: `{ "ok": true }`

---

## n8n Workflow Ideas

### Add grocery item via webhook
Trigger: webhook → extract item name, store name → look up store ID → POST to `/api/grocery/stores/:id/items`

### Voice/assistant-driven todo creation
Trigger: webhook with parsed text → POST to `/api/todos` with title + priority

### Morning briefing
Trigger: schedule → GET `/api/todos` → filter by dueDate = today → format → send notification

### Tote inventory check
Trigger: webhook with search term → GET `/api/search?q=<term>` → return matching tote + items

### Auto-complete trip at midnight
Trigger: schedule → GET `/api/grocery/lists?storeId=1` → if items exist and purchased count > 0 → POST `/api/grocery/lists/:id/complete`

### Grocery list import from meal plan
Trigger: webhook with ingredient list → loop → POST each ingredient to `/api/grocery/stores/:id/items` (409 responses are safe to ignore — item already there)

### Daily email triage digest
Trigger: schedule (e.g. daily at 6 AM) → query email provider API or Gmail → group messages by sender → POST to `/api/email-digest` with `entries` array. Use `Authorization: Bearer <HOMESTACK_API_KEY>` header to skip login flow. The endpoint is idempotent — re-running the workflow overwrites the day's digest.

### Package status updater
Trigger: schedule → GET active packages from `/api/packages` → split → call UPS/USPS tracking APIs → parse response → PATCH `/api/packages/:id` with status, statusDetail, estimatedDelivery, events, delivered, shipperName, originCity, originState. When creating new packages from email, POST only `trackingNumber`, `carrier`, and `sourceEmail` — omit `description` so users can label packages manually in the UI.
