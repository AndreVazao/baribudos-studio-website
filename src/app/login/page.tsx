"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha no login.");
      }

      window.location.href = "/conta";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell" style={{ maxWidth: 560 }}>
      <div className="card">
        <h1>Entrar</h1>
        <p className="muted">Acede à tua conta, biblioteca e histórico.</p>

        <form onSubmit={submit}>
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
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "A entrar..." : "Entrar"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </form>

        <p className="notice" style={{ marginTop: 16 }}>
          Ainda não tens conta? <a href="/registar">Criar conta</a>
        </p>
      </div>
    </main>
  );
    }
