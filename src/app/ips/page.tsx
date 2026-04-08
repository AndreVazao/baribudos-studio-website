import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function IPsPage() {
  const ips = await prisma.intellectualProperty.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      publications: {
        include: {
          variants: true,
        },
      },
    },
  });

  return (
    <main className="page-shell">
      <section className="page-intro sales-intro-card">
        <p className="hero-kicker">Universos do estúdio</p>
        <h1>Explora cada IP como um universo vivo, com publicações, variantes e portas de entrada para compra.</h1>
        <p className="muted">
          Esta área serve para apresentar os mundos editoriais do estúdio antes da compra. O objetivo é
          criar ligação ao universo, às personagens e aos formatos disponíveis para aumentar interesse e conversão.
        </p>
      </section>

      <div className="grid" style={{ marginTop: 24 }}>
        {ips.map((ip) => {
          const publicationsCount = ip.publications.length;
          const variantsCount = ip.publications.reduce((acc, publication) => acc + publication.variants.length, 0);

          return (
            <article key={ip.id} className="card sales-card ip-showcase-card">
              <p className="hero-kicker">IP editorial</p>
              <h3>{ip.name}</h3>
              <p className="muted">{ip.description || "Universo pronto para crescer com novas histórias, sagas e produtos."}</p>

              <div className="bullet-grid compact-bullets">
                <div className="bullet-card">{publicationsCount} publicações</div>
                <div className="bullet-card">{variantsCount} variantes</div>
                <div className="bullet-card">Pronto para loja</div>
              </div>

              <Link href={`/ip/${ip.slug}`} className="btn secondary">
                Abrir universo
              </Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}
