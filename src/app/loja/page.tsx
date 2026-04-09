import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";
import Link from "next/link";

const collectionItems = [
  {
    title: "Primeira compra",
    text: "Pensada para quem quer entrar rápido no universo e experimentar um produto sem fricção.",
    href: "/loja",
    cta: "Começar por aqui",
  },
  {
    title: "Ouvir e ler",
    text: "Caminho ideal para produtos que combinam leitura, trailer ou preview áudio quando os assets existem.",
    href: "/loja",
    cta: "Explorar formatos",
  },
  {
    title: "Universos em expansão",
    text: "Boa porta de entrada para vender coleção, recorrência e futura progressão por sagas e volumes.",
    href: "/ips",
    cta: "Ver universos",
  },
];

const proofCards = [
  "Produtos ativos ordenados para destacar o que está mais pronto para vender",
  "Página de detalhe pensada para reduzir atrito antes do checkout",
  "Camada editorial ligada a IPs para aumentar descoberta e recorrência",
];

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

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Como comprar melhor</h2>
            <p>Coleções e caminhos simples para orientar quem chega à loja.</p>
          </div>
        </div>
        <div className="grid">
          {collectionItems.map((item) => (
            <article key={item.title} className="card collection-card">
              <p className="hero-kicker">Coleção</p>
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
              <Link href={item.href} className="btn secondary btn-wide">
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Porque esta loja está preparada para crescer</h2>
            <p>Prova estrutural de organização comercial e editorial.</p>
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
