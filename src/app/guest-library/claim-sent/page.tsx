export default function GuestLibraryClaimSentPage() {
  return (
    <main className="page-shell" style={{ marginTop: 24 }}>
      <div className="card" style={{ maxWidth: 640 }}>
        <h1>Pagamento confirmado</h1>
        <p>Enviámos para o email utilizado na compra um link seguro para ativares a tua biblioteca.</p>
        <p className="muted">O link é válido durante sete dias e só pode ser utilizado uma vez. Se não encontrares a mensagem, verifica também a pasta de spam.</p>
      </div>
    </main>
  )
}
