export const dynamic = "force-dynamic";

import { requirePageUser } from "@/lib/auth-guards";

export default async function ContaPage() {
  const user = await requirePageUser();

  return (
    <main className="page-shell">
      <div className="card">
        <h1>A minha conta</h1>
        <p><strong>Nome:</strong> {user.name || "-"}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Papel:</strong> {user.role}</p>

        <form action="/api/auth/logout" method="post" style={{ marginTop: 18 }}>
          <button className="btn secondary" type="submit">
            Terminar sessão
          </button>
        </form>
      </div>
    </main>
  );
}
