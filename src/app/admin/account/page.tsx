export const dynamic = "force-dynamic";

import AdminNav from "@/components/admin-nav";
import { requirePageAdmin } from "@/lib/auth-guards";

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requirePageAdmin();
  const { error, success } = await searchParams;

  return (
    <main className="admin-layout">
      <AdminNav />

      <section className="admin-stack">
        <div className="page-intro">
          <h1>Minha conta</h1>
          <p className="notice">
            Gestão da tua conta administrativa e alteração de password.
          </p>
        </div>

        <div className="card">
          <p><strong>Nome:</strong> {user.name || "-"}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Papel:</strong> {user.role}</p>
          <p><strong>Estado:</strong> {user.isActive ? "Ativo" : "Inativo"}</p>
        </div>

        {success ? (
          <div className="card">
            <p style={{ color: "#9fe3b1", margin: 0 }}>
              Password atualizada com sucesso.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="card">
            <p className="error-text" style={{ margin: 0 }}>
              {mapAccountError(error)}
            </p>
          </div>
        ) : null}

        <form className="card" action="/api/account/change-password" method="post">
          <h3>Alterar password</h3>

          <label>
            Password atual
            <input name="currentPassword" type="password" required />
          </label>

          <label>
            Nova password
            <input name="newPassword" type="password" required minLength={8} />
          </label>

          <label>
            Confirmar nova password
            <input name="confirmPassword" type="password" required minLength={8} />
          </label>

          <button className="btn" type="submit">
            Guardar nova password
          </button>
        </form>

        <div className="card">
          <form action="/api/auth/logout" method="post">
            <button className="btn secondary" type="submit">
              Terminar sessão
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function mapAccountError(code: string) {
  switch (code) {
    case "missing-fields":
      return "Preenche todos os campos.";
    case "password-mismatch":
      return "A nova password e a confirmação não coincidem.";
    case "password-too-short":
      return "A nova password tem de ter pelo menos 8 caracteres.";
    case "invalid-current-password":
      return "A password atual está incorreta.";
    default:
      return "Não foi possível atualizar a password.";
  }
}
