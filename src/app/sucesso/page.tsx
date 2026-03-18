import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; provider?: string }>;
}) {
  const { email, token, provider } = await searchParams;

  return (
    <main style={{ marginTop: 24 }}>
      <div className="card" style={{ maxWidth: 760 }}>
        <h1>Pagamento concluído</h1>
        <p>O pagamento foi processado com sucesso.</p>
        <p className="muted">Fornecedor: {provider || "checkout"}</p>

        {email && token ? (
          <Link
            className="btn"
            href={`/biblioteca?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`}
          >
            Abrir biblioteca
          </Link>
        ) : (
          <p className="muted">
            Não foi possível gerar acesso automático à biblioteca.
          </p>
        )}
      </div>
    </main>
  );
}
