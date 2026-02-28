"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: Date | string;
};

export default function UsersClient({
  users: initial,
  selfId,
}: {
  users: User[];
  selfId: number;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "USER" });
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setSaving(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    setSaving(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setCreateError(d.error ?? "Failed to create user");
      return;
    }

    const created = await res.json();
    setUsers((prev) => [...prev, created]);
    setNewUser({ username: "", email: "", password: "", role: "USER" });
    setShowCreate(false);
  }

  async function handleDelete(userId: number) {
    if (!confirm("Delete this user?")) return;

    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  async function handleResetPassword(userId: number) {
    const password = prompt("New password (min 8 chars):");
    if (!password || password.length < 8) return;

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      alert("Password updated.");
    } else {
      alert("Failed to update password.");
    }
  }

  async function handleToggleRole(user: User) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!confirm(`Change ${user.username} to ${newRole}?`)) return;

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      router.refresh();
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* User table */}
      <div className="card overflow-x-auto p-0">
        <table className="wiz-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="font-medium">
                  {user.username}
                  {user.id === selfId && (
                    <span className="ml-2 text-xs" style={{ color: "var(--accent-orange)" }}>
                      (you)
                    </span>
                  )}
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                <td>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: user.role === "ADMIN" ? "var(--accent-orange)" : "var(--bg-300)",
                      color: user.role === "ADMIN" ? "#0a0a0a" : "var(--text-secondary)",
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="btn-secondary btn-sm"
                    >
                      Reset pw
                    </button>
                    {user.id !== selfId && (
                      <>
                        <button
                          onClick={() => handleToggleRole(user)}
                          className="btn-secondary btn-sm"
                        >
                          {user.role === "ADMIN" ? "→ User" : "→ Admin"}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user */}
      {showCreate ? (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">New User</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  Username
                </label>
                <input
                  className="input w-full"
                  value={newUser.username}
                  onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  Email
                </label>
                <input
                  className="input w-full"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
                <input
                  className="input w-full"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  Role
                </label>
                <select
                  className="input w-full"
                  value={newUser.role}
                  onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {createError && <p className="text-sm text-red-400">{createError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Creating…" : "Create user"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New User
        </button>
      )}
    </div>
  );
}
