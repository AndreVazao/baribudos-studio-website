import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";

export default async function LojaPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main style={{ marginTop: 24 }}>
      <h1>Loja</h1>
      <p className="muted">
        Produtos comerciais derivados das publication variants recebidas do Studio.
      </p>

      <div className="grid" style={{ marginTop: 24 }}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            slug={product.slug}
            title={product.title}
            description={null}
            language={product.currency}
            amountCents={product.priceCents}
            kind={product.type}
          />
        ))}
      </div>
    </main>
  );
      }
