"use client"

import { useEffect, useState } from "react"

export default function PayPalReturnPage() {
  const [message, setMessage] = useState("A validar pagamento PayPal...")
  const [orderId, setOrderId] = useState("")
  const [retry, setRetry] = useState(false)
  const [busy, setBusy] = useState(false)

  async function capture(id: string) {
    setBusy(true)
    setRetry(false)
    setMessage("A confirmar pagamento e preparar o acesso à biblioteca...")
    try {
      const response = await fetch("/api/checkout/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Falha ao capturar pagamento.")

      if (data.guestClaimPending) {
        setMessage("Pagamento confirmado. O envio do email de acesso está pendente. Podes tentar novamente dentro de instantes.")
        setRetry(true)
        return
      }
      if (data.guestClaimEmailSent) {
        window.location.href = "/guest-library/claim-sent"
        return
      }
      window.location.href = data.successUrl || "/biblioteca"
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido.")
      setRetry(true)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get("token") || ""
    if (!id) {
      setMessage("Token PayPal não encontrado.")
      return
    }
    setOrderId(id)
    void capture(id)
  }, [])

  return (
    <main style={{ marginTop: 24 }}>
      <div className="card" style={{ maxWidth: 720 }}>
        <h1>PayPal</h1>
        <p>{message}</p>
        {retry && orderId ? (
          <button className="btn" type="button" disabled={busy} onClick={() => void capture(orderId)}>
            {busy ? "A tentar..." : "Tentar novamente"}
          </button>
        ) : null}
      </div>
    </main>
  )
}
