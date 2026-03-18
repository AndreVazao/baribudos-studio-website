"use client";

import { useEffect, useState } from "react";

export default function PayPalReturnPage() {
  const [message, setMessage] = useState("A validar pagamento PayPal...");

  useEffect(() => {
    async function run() {
      try {
        const url = new URL(window.location.href);
        const orderId = url.searchParams.get("token");

        if (!orderId) {
          throw new Error("Token PayPal não encontrado.");
        }

        const response = await fetch("/api/checkout/paypal/capture-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Falha ao capturar pagamento.");
        }

        window.location.href = data.successUrl;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erro desconhecido.");
      }
    }

    run();
  }, []);

  return (
    <main style={{ marginTop: 24 }}>
      <div className="card" style={{ maxWidth: 720 }}>
        <h1>PayPal</h1>
        <p>{message}</p>
      </div>
    </main>
  );
            }
