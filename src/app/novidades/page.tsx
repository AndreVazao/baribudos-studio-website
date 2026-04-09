import Link from "next/link";
import { prisma } from "@/lib/prisma";

function extractMarketing(payload: any = {}) {
  return payload?.website_marketing || payload?.marketing || payload?.commercial?.website_marketing || {};
}

export default async function NewsPage() {
  const variants = await prisma.publicationVariant.findMany({
    orderBy: { updatedAt: "desc" },
    take: 24,
    include: {
      assets: true,
      products: true,
      publication: true,
    },
  });

  const items = variants
    .map((variant) => {
      const payload = variant.payloadJson as any;
      const marketing = extractMarketing(payload);
      const publicState = String(marketing?.public_state || "").trim();
      const isNews = ["teaser_ready", "prelaunch_public", "launch_ready", "published"].includes(publicState) || variant.published;
      if (!isNews) return null;
      const activeProduct = variant.products.find((product) => product.active);
      return {
        id: variant.id,
        title: marketing?.teaser_headline || variant.title,
        subtitle: marketing?.teaser_subtitle || variant.shortDescription || variant.description,
        badge: marketing?.teaser_badge || (activeProduct ? "Já disponível" : "Novidade"),
        href: activeProduct ? `/loja/${activeProduct.slug}` : "/em-breve",
        cover: marketing?.teaser_cover_url || variant.assets.find((asset) => asset.role === "COVER")?.fileUrl || null,
      };
    })
    .filter(Boolean);

  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Novidades</p>
        <h1>O que o Studio decidiu tornar visível agora no Website.</h1>
        <p className="muted">Novidades, teasers, pré-lançamentos e lançamentos finais reunidos numa superfície pública única.</p>
      </section>

      <section className="section">
        <div className="grid">
          {items.map((item: any) => (
            <article key={item.id} className="card prelaunch-card">
              {item.cover ? <img src={item.cover} alt={item.title} className="product-cover" /> : null}
              <div className="prelaunch-badge">{item.badge}</div>
              <h3>{item.title}</h3>
              <p className="muted">{item.subtitle}</p>
              <Link href={item.href} className="btn btn-wide">Abrir</Link>
            </article>
          ))}
          {!items.length ? <div className="card">Sem novidades públicas neste momento.</div> : null}
        </div>
      </section>
    </main>
  );
}
