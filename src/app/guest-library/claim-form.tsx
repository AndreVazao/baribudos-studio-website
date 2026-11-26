"use client"

import { useState } from "react"

export default function GuestLibraryClaimForm({ token }: { token: string }) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    if (!token) {
      setMessage("O link de acesso está incompleto ou expirado.")
      return
    }
    if (password.length < 12 || password.length > 128) {
      setMessage("A palavra-passe deve ter entre 12 e 128 caracteres.")
      return
    }
    if (password !== confirmation) {
      setMessage("As palavras-passe não coincidem.")
      return
    }

    setBusy(true)
    try {
      const response = await fetch("/api/checkout/guest-claim/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível ativar a biblioteca.")
      window.location.href = data.redirectTo || "/biblioteca"
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.")
      setBusy(false)
    }
  }

  return (
    <form className="card" style={{ maxWidth: 560 }} onSubmit={submit}>
      <h1>Ativar a minha biblioteca</h1>
      <p>Define uma palavra-passe para acederes aos conteúdos comprados.</p>
      <label htmlFor="guest-password">Nova palavra-passe</label>
      <input
        id="guest-password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <label htmlFor="guest-password-confirm">Confirmar palavra-passe</label>
      <input
        id="guest-password-confirm"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      {message ? <p role="alert">{message}</p> : null}
      <button className="btn" type="submit" disabled={busy || !token}>
        {busy ? "A ativar..." : "Ativar biblioteca"}
      </button>
    </form>
  )
}
