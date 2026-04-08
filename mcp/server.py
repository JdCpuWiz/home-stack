#!/usr/bin/env python3
"""HomeStack MCP Server — todos, packages, and pantry tools for Jarvis AI."""

import os

import httpx
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

mcp = FastMCP(
    "homestack",
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)

_BASE = os.getenv("HOMESTACK_URL", "http://192.168.7.28:3005").rstrip("/")
_KEY  = os.getenv("HOMESTACK_API_KEY", "")


def _headers() -> dict:
    return {"Authorization": f"Bearer {_KEY}"}


# ── Todos ──────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_todos() -> str:
    """List all current to-do items.

    Returns each todo with its title, priority (HIGH/MEDIUM/LOW), due date (if any),
    category (if any), and ID. Use the ID when deleting a todo.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{_BASE}/api/todos", headers=_headers(), timeout=10)
        r.raise_for_status()
        todos = r.json()

    if not todos:
        return "No todos."

    lines = [f"{len(todos)} todo{'s' if len(todos) != 1 else ''}:"]
    for t in todos:
        line = f"  [{t['id']}] {t['title']} — {t['priority']}"
        if t.get("dueDate"):
            line += f" (due {t['dueDate'][:10]})"
        if t.get("category"):
            line += f" [{t['category']}]"
        lines.append(line)

    return "\n".join(lines)


@mcp.tool()
async def add_todo(
    title: str,
    priority: str = "MEDIUM",
    due_date: str = "",
    category: str = "",
    notes: str = "",
) -> str:
    """Add a new to-do item.

    Args:
        title: The task description.
        priority: HIGH, MEDIUM (default), or LOW.
        due_date: Optional due date in YYYY-MM-DD format (e.g. '2026-04-15').
        category: Optional category label (e.g. 'Health', 'Home', 'Work').
        notes: Optional extra notes.
    """
    priority = priority.upper()
    if priority not in ("HIGH", "MEDIUM", "LOW"):
        return f"Invalid priority '{priority}'. Use HIGH, MEDIUM, or LOW."

    body: dict = {"title": title, "priority": priority}
    if due_date:
        body["dueDate"] = due_date
    if category:
        body["category"] = category
    if notes:
        body["notes"] = notes

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{_BASE}/api/todos",
            headers={**_headers(), "Content-Type": "application/json"},
            json=body,
            timeout=10,
        )
        r.raise_for_status()
        todo = r.json()

    return f"Todo added: [{todo['id']}] {todo['title']} — {todo['priority']}"


@mcp.tool()
async def delete_todo(todo_id: int) -> str:
    """Delete (mark complete) a to-do item by its ID.

    Use get_todos() to find the ID first.

    Args:
        todo_id: The numeric ID of the todo to delete.
    """
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{_BASE}/api/todos/{todo_id}",
            headers=_headers(),
            timeout=10,
        )
        if r.status_code == 404:
            return f"Todo {todo_id} not found."
        r.raise_for_status()

    return f"Todo {todo_id} deleted."


# ── Packages ───────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_packages(include_delivered: bool = False) -> str:
    """List tracked shipments.

    Args:
        include_delivered: Set True to include already-delivered packages (default: active only).
    """
    params: dict = {}
    if include_delivered:
        params["all"] = "true"

    async with httpx.AsyncClient() as client:
        r = await client.get(f"{_BASE}/api/packages", headers=_headers(), params=params, timeout=10)
        r.raise_for_status()
        packages = r.json()

    if not packages:
        suffix = " (including delivered)" if include_delivered else " in transit"
        return f"No packages{suffix}."

    lines = [f"{len(packages)} package{'s' if len(packages) != 1 else ''}:"]
    for p in packages:
        desc = p.get("description") or p.get("trackingNumber", "?")
        shipper = p.get("shipperName", "")
        status = p.get("status", "UNKNOWN").replace("_", " ").title()
        detail = p.get("statusDetail", "")
        eta = p.get("estimatedDelivery", "")

        line = f"  {desc}"
        if shipper:
            line += f" ({shipper})"
        line += f" — {status}"
        if detail:
            line += f": {detail}"
        if eta:
            line += f" | ETA {eta[:10]}"
        lines.append(line)

    return "\n".join(lines)


# ── Pantry ─────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_pantry(filter: str = "all") -> str:
    """List pantry inventory items.

    Args:
        filter: 'all' (default) — all items; 'low' — low stock and out of stock;
                'out' — only out of stock items.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{_BASE}/api/pantry", headers=_headers(), timeout=10)
        r.raise_for_status()
        products = r.json()

    if filter == "out":
        products = [p for p in products if p.get("quantity", 0) == 0]
    elif filter == "low":
        products = [
            p for p in products
            if p.get("minQty", 0) > 0 and p.get("quantity", 0) <= p.get("minQty", 0)
        ]

    if not products:
        empty = {"out": "No out-of-stock items.", "low": "No low-stock items.", "all": "Pantry is empty."}
        return empty.get(filter, "No items.")

    lines = [f"{len(products)} pantry item{'s' if len(products) != 1 else ''}:"]
    for p in products:
        qty = p.get("quantity", 0)
        min_qty = p.get("minQty", 0)

        label = p["name"]
        if p.get("brand"):
            label += f" — {p['brand']}"
        if p.get("size"):
            label += f" {p['size']}"

        if qty == 0:
            stock = " [OUT]"
        elif min_qty > 0 and qty <= min_qty:
            stock = f" [LOW: {qty}]"
        else:
            stock = f" [{qty}]"

        lines.append(f"  [{p['id']}] {label}{stock}")

    return "\n".join(lines)


@mcp.tool()
async def adjust_pantry_stock(product_id: int, quantity: int) -> str:
    """Set the stock quantity for a pantry item.

    Args:
        product_id: The numeric ID of the pantry product (from get_pantry()).
        quantity: New stock quantity (0 or more).
    """
    if quantity < 0:
        return "Quantity must be 0 or greater."

    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{_BASE}/api/pantry/{product_id}",
            headers={**_headers(), "Content-Type": "application/json"},
            json={"quantity": quantity},
            timeout=10,
        )
        if r.status_code == 404:
            return f"Pantry product {product_id} not found."
        r.raise_for_status()
        product = r.json()

    return f"Stock updated: {product['name']} → {product['quantity']}"


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.settings.host = "0.0.0.0"
    mcp.settings.port = 8012
    mcp.run(transport="streamable-http")
