import Link from "next/link";
import { prisma } from "@/lib/prisma";

function extractMarketing(payload: any = {}) {
  return payload?.website_marketing || payload?.marketing || payload?.commercial?.website_marketing || {};
}

export default async function ComingSoonPage() {
  const variants = await prisma.publicationVariant.findMany({
    orderBy: { updatedAt: "desc" },
    take: 24,
    include: {
      assets: true,
      publication: true,
      products: true,
    },
  });

  const items = variants
    .map((variant) => {
      const payload = variant.payloadJson as any;
      const marketing = extractMarketing(payload);
      const publicState = String(marketing?.public_state || "").trim();
      const isPrelaunch = ["teaser_ready", "prelaunch_public", "launch_ready"].includes(publicState) || marketing?.prelaunch_enabled;
      if (!isPrelaunch) return null;

      return {
        id: variant.id,
        slug: variant.slug,
        title: marketing?.teaser_headline || variant.title,
        subtitle: marketing?.teaser_subtitle || variant.shortDescription || variant.description,
        badge: marketing?.teaser_badge || "Em breve",
        releaseLabel: marketing?.teaser_release_label || "Pré-lançamento",
        cover: marketing?.teaser_cover_url || variant.assets.find((asset) => asset.role === "COVER")?.fileUrl || null,
        gallery: Array.isArray(marketing?.teaser_gallery) ? marketing.teaser_gallery : [],
      };
    })
    .filter(Boolean);

  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Em breve</p>
        <h1>Pré-lançamentos e teasers controlados diretamente pelo Studio.</h1>
        <p className="muted">Esta página existe para mostrar o que está em fase pública de teaser ou pré-lançamento antes da publicação final.</p>
      </section>

      <section className="section">
        <div className="grid">
          {items.map((item: any) => (
            <article key={item.id} className="card prelaunch-card">
              {item.cover ? <img src={item.cover} alt={item.title} className="product-cover" /> : null}
              <div className="prelaunch-badge">{item.badge}</div>
              <h3>{item.title}</h3>
              <p className="muted">{item.subtitle}</p>
              <div className="bullet-card">{item.releaseLabel}</div>
              {item.gallery?.length ? <div className="muted">Galeria teaser: {item.gallery.length} imagem(ns)</div> : null}
              <Link href={`/novidades/${item.slug}`} className="btn btn-wide">Abrir teaser</Link>
            </article>
          ))}
          {!items.length ? <div className="card">Sem pré-lançamentos públicos neste momento.</div> : null}
        </div>
      </section>
    </main>
  );
}
