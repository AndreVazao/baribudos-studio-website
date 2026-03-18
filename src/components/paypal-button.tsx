"use client";

import { useState } from "react";

type Props = {
  productId: string;
  email: string;
  title: string;
  disabled?: boolean;
};

export default function PayPalButton({
  productId,
  email,
  title,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePayPal() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout/paypal/create-order", {
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
        throw new Error(data.error || "Falha ao iniciar PayPal.");
      }

      window.location.href = data.approveUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn secondary"
        onClick={handlePayPal}
        disabled={disabled || loading}
      >
        {loading ? "A abrir PayPal..." : `Pagar com PayPal — ${title}`}
      </button>

      {error ? <p style={{ color: "#ff9e9e" }}>{error}</p> : null}
    </>
  );
                                   }
