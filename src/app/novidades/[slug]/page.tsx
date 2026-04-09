import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function extractMarketing(payload: any = {}) {
  return payload?.website_marketing || payload?.marketing || payload?.commercial?.website_marketing || {};
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const variant = await prisma.publicationVariant.findUnique({
    where: { slug },
    include: {
      assets: true,
      products: true,
      publication: true,
    },
  });

  if (!variant) notFound();

  const payload = variant.payloadJson as any;
  const marketing = extractMarketing(payload);
  const activeProduct = variant.products.find((product) => product.active);
  const cover = marketing?.teaser_cover_url || variant.assets.find((asset) => asset.role === "COVER")?.fileUrl || null;
  const trailer = marketing?.teaser_trailer_url || variant.assets.find((asset) => asset.role === "VIDEO_TRAILER")?.fileUrl || null;
  const gallery = Array.isArray(marketing?.teaser_gallery) ? marketing.teaser_gallery : [];
  const title = marketing?.teaser_headline || variant.title;
  const subtitle = marketing?.teaser_subtitle || variant.shortDescription || variant.description;
  const excerpt = marketing?.teaser_excerpt || variant.description || "";
  const releaseLabel = marketing?.teaser_release_label || (activeProduct ? "Já disponível" : "Em breve");

  return (
    <main className="page-shell">
      <section className="sales-intro-card" style={{ display: "grid", gap: 16 }}>
        <div className="prelaunch-badge">{marketing?.teaser_badge || (activeProduct ? "Novidade" : "Em breve")}</div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        <div className="bullet-card">{releaseLabel}</div>
      </section>

      <section className="section" style={{ display: "grid", gap: 18 }}>
        {cover ? <img src={cover} alt={title} className="product-cover" style={{ maxWidth: 420 }} /> : null}

        {excerpt ? (
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <strong>Excerto público</strong>
            <p className="muted" style={{ margin: 0 }}>{excerpt}</p>
          </div>
        ) : null}

        {trailer ? (
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <strong>Trailer teaser</strong>
            <video controls src={trailer} style={{ width: "100%", borderRadius: 12 }} />
          </div>
        ) : null}

        {gallery.length ? (
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <strong>Galeria teaser</strong>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {gallery.map((item: string) => <img key={item} src={item} alt={title} className="product-cover" />)}
            </div>
          </div>
        ) : null}
      </section>

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Próximo passo</p>
          <h2 style={{ margin: 0 }}>{activeProduct ? "O lançamento já tem produto ativo na loja." : "Segue novidades até ao lançamento final."}</h2>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          {activeProduct ? <Link href={`/loja/${activeProduct.slug}`} className="btn">Abrir produto</Link> : <Link href="/em-breve" className="btn">Voltar a Em breve</Link>}
          <Link href="/novidades" className="btn secondary">Ver novidades</Link>
        </div>
      </section>
    </main>
  );
}
