import Link from "next/link";
import { ProductType } from "@prisma/client";
import ProductCard from "@/components/product-card";
import { prisma } from "@/lib/prisma";

const proofCards = [
  "Página focada só em ebooks ativos e compráveis.",
  "Boa para campanhas diretas e tráfego pago mais limpo.",
  "Menos ruído, mais clareza sobre o formato que o cliente vai receber.",
];

export default async function EbooksPage() {
  const products = await prisma.product.findMany({
    where: { active: true, type: ProductType.EBOOK },
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
        <p className="hero-kicker">Ebooks</p>
        <h1>Ebooks prontos para compra imediata no Website oficial.</h1>
        <p className="muted">
          Esta página concentra os ebooks ativos para reduzir atrito e dar uma entrada comercial direta a quem já sabe que quer comprar leitura digital.
        </p>

        <div className="hero-actions">
          <Link href="/loja" className="btn">
            Ver loja completa
          </Link>
          <Link href="/lancamentos" className="btn secondary">
            Ver lançamentos
          </Link>
          <Link href="/audiobooks" className="btn secondary">
            Ver audiobooks
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Porque esta página vende melhor</h2>
            <p>Boa para tráfego mais qualificado e campanhas por formato.</p>
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
            <h2>Catálogo de ebooks</h2>
            <p>Produtos de leitura digital vindos diretamente do pipeline oficial do Studio.</p>
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
                description={payload.short_description || payload.description || "Ebook pronto para leitura imediata."}
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
              Ainda não existem ebooks ativos. Assim que o Studio publicar ebooks vendáveis, esta página passa a mostrá-los aqui.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
