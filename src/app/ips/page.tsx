import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function IPsPage() {
  const ips = await prisma.intellectualProperty.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main style={{ marginTop: 24 }}>
      <h1>IPs do Estúdio</h1>

      <div className="grid" style={{ marginTop: 24 }}>
        {ips.map((ip) => (
          <article key={ip.id} className="card">
            <h3>{ip.name}</h3>
            <p className="muted">{ip.description || "Sem descrição."}</p>
            <Link href={`/ip/${ip.slug}`} className="btn secondary">
              Abrir IP
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
            }
