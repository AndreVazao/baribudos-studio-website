import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicationCard from "@/components/publication-card";

export default async function IPPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const ip = await prisma.intellectualProperty.findUnique({
    where: { slug },
    include: {
      publications: {
        include: {
          variants: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ip) {
    notFound();
  }

  const variants = ip.publications.flatMap((publication) => publication.variants);

  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Universo editorial</p>
        <h1>{ip.name}</h1>
        <p className="muted">{ip.description || "Universo sem descrição pública ainda."}</p>

        <div className="bullet-grid" style={{ marginTop: 18 }}>
          <div className="bullet-card">{ip.publications.length} publicações base</div>
          <div className="bullet-card">{variants.length} variantes disponíveis</div>
          <div className="bullet-card">Escala preparada para novas sagas</div>
        </div>

        <div className="hero-actions" style={{ marginTop: 18 }}>
          <Link href="/loja" className="btn">
            Ver produtos da loja
          </Link>
          <Link href="/ips" className="btn secondary">
            Voltar aos universos
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Entradas disponíveis neste universo</h2>
            <p>Variantes editoriais e portas de entrada para exploração comercial.</p>
          </div>
        </div>

        <div className="grid" style={{ marginTop: 24 }}>
          {variants.map((variant) => (
            <PublicationCard
              key={variant.id}
              slug={variant.slug}
              title={variant.title}
              description={variant.shortDescription}
              language={variant.language}
              format={variant.format}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
