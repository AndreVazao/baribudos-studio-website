import Link from "next/link";
import { ProductType } from "@prisma/client";
import ProductCard from "@/components/product-card";
import { prisma } from "@/lib/prisma";

const proofCards = [
  "Página focada só em audiobooks ativos e compráveis.",
  "Boa para tráfego que já vem com intenção de ouvir e não de ler.",
  "Ajuda a separar melhor o discurso comercial por formato.",
];

export default async function AudiobooksPage() {
  const products = await prisma.product.findMany({
    where: { active: true, type: ProductType.AUDIOBOOK },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    include: {
      variant: {
        include: {
          assets: true,
        },
      },
    },
  });

  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Audiobooks</p>
        <h1>Audiobooks prontos para compra imediata no Website oficial.</h1>
        <p className="muted">
          Esta página concentra os audiobooks ativos para dar um caminho comercial direto a quem prefere ouvir, com menos ruído e mais intenção de compra.
        </p>

        <div className="hero-actions">
          <Link href="/loja" className="btn">
            Ver loja completa
          </Link>
          <Link href="/lancamentos" className="btn secondary">
            Ver lançamentos
          </Link>
          <Link href="/ebooks" className="btn secondary">
            Ver ebooks
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Porque esta página interessa</h2>
            <p>Boa para separar campanhas de áudio e melhorar foco comercial.</p>
          </div>
        </div>
        <div className="bullet-grid">
          {proofCards.map((item) => (
            <div key={item} className="bullet-card">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Catálogo de audiobooks</h2>
            <p>Produtos de áudio ativos vindos diretamente do pipeline oficial do Studio.</p>
          </div>
        </div>

        <div className="grid">
          {products.map((product: any) => {
            const payload = product.variant.payloadJson as any;
            const cover = product.variant.assets.find((asset: any) => asset.role === "COVER");
            return (
              <ProductCard
                key={product.id}
                slug={product.slug}
                title={product.title}
                description={payload.short_description || payload.description || "Audiobook pronto para escuta imediata."}
                language={product.variant.language || payload.language || "pt-PT"}
                amountCents={product.priceCents}
                currency={product.currency}
                kind={product.type}
                coverUrl={cover?.fileUrl || null}
                featured={product.featured}
              />
            );
          })}

          {!products.length ? (
            <div className="card">
              Ainda não existem audiobooks ativos. Assim que o Studio publicar audiobooks vendáveis, esta página passa a mostrá-los aqui.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
