import Link from "next/link";
import ProductCard from "@/components/product-card";
import { prisma } from "@/lib/prisma";

async function loadLaunchProducts() {
  try {
    return await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 24,
      include: {
        variant: {
          include: {
            assets: true,
          },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function LaunchesPage() {
  const products = await loadLaunchProducts();
  const featured = products.filter((item) => item.featured);
  const standard = products.filter((item) => !item.featured);

  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Lançamentos</p>
        <h1>Produtos prontos para compra imediata, vindos diretamente do Studio oficial.</h1>
        <p className="muted">
          Esta página junta os lançamentos ativos com foco direto em compra. Menos dispersão, mais clareza,
          mais tração comercial para ebooks e audiobooks que já estão prontos para vender.
        </p>

        <div className="hero-actions">
          <Link href="/loja" className="btn">
            Ir para a loja completa
          </Link>
          <Link href="/novidades" className="btn secondary">
            Ver novidades
          </Link>
          <Link href="/em-breve" className="btn secondary">
            Ver em breve
          </Link>
        </div>
      </section>

      {featured.length ? (
        <section className="section">
          <div className="section-header">
            <div>
              <h2>Destaques que devem fechar compra primeiro</h2>
              <p>Primeira linha de ataque comercial para acelerar receita no Website.</p>
            </div>
          </div>

          <div className="grid">
            {featured.map((product: any) => (
              <ProductCard
                key={product.id}
                slug={product.slug}
                title={product.title}
                description={
                  (product.variant.payloadJson as any)?.short_description ||
                  (product.variant.payloadJson as any)?.description ||
                  "Produto editorial pronto para venda imediata."
                }
                language={product.variant.language || "pt-PT"}
                amountCents={product.priceCents}
                currency={product.currency}
                kind={product.type}
                coverUrl={product.variant.assets.find((asset: any) => asset.role === "COVER")?.fileUrl || null}
                featured
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Porque esta página interessa</p>
          <h2 style={{ margin: 0 }}>Quando o visitante já vem quente, aqui ele deve chegar mais depressa ao produto certo.</h2>
        </div>
        <div className="bullet-grid" style={{ width: "100%" }}>
          {[
            "Só mostra produtos ativos e compráveis.",
            "Puxa o foco para preço, formato e capa.",
            "Reduz o caminho entre descoberta e checkout.",
          ].map((item) => (
            <div key={item} className="bullet-card">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Catálogo de lançamentos</h2>
            <p>Produtos ativos em ordem comercial para continuar a empurrar compra.</p>
          </div>
        </div>

        <div className="grid">
          {standard.map((product: any) => (
            <ProductCard
              key={product.id}
              slug={product.slug}
              title={product.title}
              description={
                (product.variant.payloadJson as any)?.short_description ||
                (product.variant.payloadJson as any)?.description ||
                "Produto editorial pronto para compra imediata."
              }
              language={product.variant.language || "pt-PT"}
              amountCents={product.priceCents}
              currency={product.currency}
              kind={product.type}
              coverUrl={product.variant.assets.find((asset: any) => asset.role === "COVER")?.fileUrl || null}
              featured={product.featured}
            />
          ))}

          {!products.length ? (
            <div className="card">
              Ainda não existem lançamentos ativos. Assim que o Studio publicar produtos vendáveis, esta página passa a mostrá-los aqui.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
