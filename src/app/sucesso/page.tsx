import Link from "next/link"

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>
}) {
  const { provider } = await searchParams

  return (
    <main className="page-shell" style={{ marginTop: 24 }}>
      <div className="card" style={{ maxWidth: 760 }}>
        <h1>Pagamento concluído</h1>
        <p>O pagamento foi confirmado pelo fornecedor.</p>
        <p className="muted">Se compraste como convidado, enviámos um link seguro para o email utilizado no checkout. Usa esse link para definir a tua palavra-passe e ativar a biblioteca.</p>
        <p className="muted">Se já tinhas sessão iniciada, os conteúdos ficam disponíveis na tua biblioteca.</p>
        <p className="muted">Fornecedor: {provider || "checkout"}</p>
        <Link className="btn" href="/biblioteca">Abrir biblioteca</Link>
      </div>
    </main>
  )
}
