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
    <div className="card">
      <h3>Comprar</h3>
      <p>
        <strong>{centsToEuro(amountCents, currency)}</strong>
      </p>

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

      {error ? <p style={{ color: "#ff9e9e", marginTop: 12 }}>{error}</p> : null}
    </div>
  );
          }
