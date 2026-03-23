"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import AdminNav from "@/components/admin-nav";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "CUSTOMER";
  isActive: boolean;
  _count: {
    library: number;
    checkouts: number;
  };
};

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao carregar utilizadores.");
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao criar utilizador.");
      }

      setName("");
      setEmail("");
      setPassword("");
      setRole("CUSTOMER");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserRow) {
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao atualizar utilizador.");
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }

  return (
    <main className="admin-layout">
      <AdminNav />

      <section className="admin-stack">
        <div className="page-intro">
          <h1>Utilizadores</h1>
          <p className="notice">
            Gestão de contas de cliente, admins e editores.
          </p>
        </div>

        <form className="card" onSubmit={createUser}>
          <h3>Criar utilizador</h3>

          <label>
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password inicial
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>

          <label>
            Papel
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="EDITOR">EDITOR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </label>

          <button className="btn" type="submit" disabled={saving}>
            {saving ? "A criar..." : "Criar utilizador"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </form>

        <div className="card table-wrap">
          {loading ? <p>A carregar...</p> : null}

          {!loading ? (
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nome</th>
                  <th>Papel</th>
                  <th>Compras</th>
                  <th>Biblioteca</th>
                  <th>Ativo</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.name || "-"}</td>
                    <td>{user.role}</td>
                    <td>{user._count.checkouts}</td>
                    <td>{user._count.library}</td>
                    <td>{user.isActive ? "Sim" : "Não"}</td>
                    <td>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => toggleActive(user)}
                      >
                        {user.isActive ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>
    </main>
  );
}
