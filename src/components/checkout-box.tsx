"use client";

import { useState } from "react";
import { centsToEuro } from "@/lib/pricing";
import PayPalButton from "@/components/paypal-button";

type Props = {
  productId: string;
  title: string;
  amountCents: number;
  currency: string;
};

export default function CheckoutBox({
  productId,
  title,
  amountCents,
  currency,
}: Props) {
  const [email, setEmail] = useState("");
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [error, setError] = useState("");

  async function buyStripe() {
    setError("");
    setLoadingStripe(true);

    try {
      const response = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao iniciar checkout Stripe.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoadingStripe(false);
    }
  }

  return (
    <aside className="card checkout-card-strong">
      <p className="hero-kicker">Compra segura</p>
      <h3>{title}</h3>
      <p className="checkout-price">
        <strong>{centsToEuro(amountCents, currency)}</strong>
      </p>
      <p className="muted">Pagamento imediato com Stripe ou PayPal. O email serve para entrega e confirmação da compra.</p>

      <label>
        Email do cliente
        <input
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <div className="bullet-grid compact-bullets">
        <div className="bullet-card">Checkout direto</div>
        <div className="bullet-card">Entrega por email</div>
        <div className="bullet-card">Sem passos desnecessários</div>
      </div>

      <div className="checkout-trust-box">
        <strong>Antes de pagar</strong>
        <span>Confirma o email, escolhe o método e fechas a compra no fluxo oficial do provedor.</span>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <button
          className="btn"
          onClick={buyStripe}
          disabled={!email || loadingStripe}
        >
          {loadingStripe ? "A abrir Stripe..." : "Pagar com Cartão (Stripe)"}
        </button>

        <PayPalButton
          productId={productId}
          email={email}
          title={title}
          disabled={!email}
        />
      </div>

      {error ? <p className="error-text" style={{ marginTop: 12 }}>{error}</p> : null}
    </aside>
  );
}
