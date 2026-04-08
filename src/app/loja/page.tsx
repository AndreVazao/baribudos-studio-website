import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";

export default async function LojaPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
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
      <section className="page-intro sales-intro-card">
        <p className="hero-kicker">Loja oficial</p>
        <h1>Escolhe o formato certo e compra sem sair do universo.</h1>
        <p className="muted">
          Produtos comerciais derivados das publication variants recebidas do Studio. Cada produto pode
          trazer capa, trailer, preview e descrição própria para aumentar conversão.
        </p>
      </section>

      <div className="grid" style={{ marginTop: 24 }}>
        {products.map((product) => {
          const payload = product.variant.payloadJson as any;
          const cover = product.variant.assets.find((asset) => asset.role === "COVER");

          return (
            <ProductCard
              key={product.id}
              slug={product.slug}
              title={product.title}
              description={payload.short_description || payload.description || null}
              language={product.variant.language || payload.language || product.currency}
              amountCents={product.priceCents}
              currency={product.currency}
              kind={product.type}
              coverUrl={cover?.fileUrl || null}
              featured={product.featured}
            />
          );
        })}
      </div>
    </main>
  );
}
