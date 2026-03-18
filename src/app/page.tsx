import Link from "next/link";
import BrandLogos from "@/components/brand/BrandLogos";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <BrandLogos variant="full" />
        <h1>Baribudos Studio</h1>
        <p>
          Uma plataforma editorial e comercial multi-IP. Hoje começa com
          Baribudos. Amanhã pode crescer para novas sagas, novos audiobooks,
          novas séries e novos universos.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <Link href="/ips" className="btn">
            Ver IPs
          </Link>
          <Link href="/loja" className="btn secondary">
            Abrir loja
          </Link>
        </div>

        <div style={{ marginTop: 32 }}>
          <BrandLogos variant="badge" />
        </div>
      </section>
    </main>
  );
}
