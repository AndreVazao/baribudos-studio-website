import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function extractMarketing(payload: any = {}) {
  return payload?.website_marketing || payload?.marketing || payload?.commercial?.website_marketing || {};
}

function getStageLabel(publicState: string, hasProduct: boolean) {
  if (hasProduct || publicState === "published") return "Já disponível";
  if (publicState === "launch_ready") return "Pronto para lançamento";
  if (publicState === "prelaunch_public") return "Pré-lançamento";
  if (publicState === "teaser_ready") return "Teaser";
  return "Em breve";
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
  const publicState = String(marketing?.public_state || "").trim();
  const stageLabel = getStageLabel(publicState, !!activeProduct);
  const cover = marketing?.teaser_cover_url || variant.assets.find((asset) => asset.role === "COVER")?.fileUrl || null;
  const trailer = marketing?.teaser_trailer_url || variant.assets.find((asset) => asset.role === "VIDEO_TRAILER")?.fileUrl || null;
  const gallery = Array.isArray(marketing?.teaser_gallery) ? marketing.teaser_gallery : [];
  const title = marketing?.teaser_headline || variant.title;
  const subtitle = marketing?.teaser_subtitle || variant.shortDescription || variant.description;
  const excerpt = marketing?.teaser_excerpt || variant.description || "";
  const releaseLabel = marketing?.teaser_release_label || stageLabel;
  const primaryCta = marketing?.teaser_cta_label || (activeProduct ? "Comprar agora" : "Acompanhar novidade");

  return (
    <main className="page-shell">
      <section className="sales-intro-card" style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div className="prelaunch-badge">{marketing?.teaser_badge || stageLabel}</div>
          <div className="stage-chip">{stageLabel}</div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p className="muted" style={{ margin: 0 }}>{subtitle}</p>
        </div>

        <div className="bullet-grid compact-bullets">
          <div className="bullet-card">{releaseLabel}</div>
          <div className="bullet-card">{gallery.length ? `${gallery.length} imagem(ns) teaser` : "Sem galeria teaser"}</div>
          <div className="bullet-card">{trailer ? "Trailer teaser disponível" : "Sem trailer teaser"}</div>
        </div>

        <div className="hero-actions" style={{ marginTop: 0 }}>
          {activeProduct ? (
            <Link href={`/loja/${activeProduct.slug}`} className="btn">{primaryCta}</Link>
          ) : (
            <Link href="/em-breve" className="btn">{primaryCta}</Link>
          )}
          <Link href="/novidades" className="btn secondary">Ver novidades</Link>
        </div>
      </section>

      <section className="section teaser-detail-layout">
        <div className="teaser-detail-main">
          {cover ? (
            <div className="card" style={{ display: "grid", gap: 12 }}>
              <strong>Imagem principal</strong>
              <img src={cover} alt={title} className="product-detail-cover" />
            </div>
          ) : null}

          {excerpt ? (
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <strong>Excerto público</strong>
              <p className="muted" style={{ margin: 0 }}>{excerpt}</p>
            </div>
          ) : null}

          {gallery.length ? (
            <div className="card" style={{ display: "grid", gap: 12 }}>
              <strong>Galeria teaser</strong>
              <div className="teaser-gallery-grid">
                {gallery.map((item: string) => (
                  <img key={item} src={item} alt={title} className="product-cover" />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="card teaser-detail-aside">
          <div className="stage-chip">{stageLabel}</div>
          <h3 style={{ margin: 0 }}>Estado desta página</h3>
          <p className="muted" style={{ margin: 0 }}>
            Esta superfície foi publicada pelo Studio para aquecer descoberta, criar contexto visual e preparar o próximo passo comercial.
          </p>

          <div className="bullet-grid">
            <div className="bullet-card">Estado público: {publicState || "-"}</div>
            <div className="bullet-card">CTA atual: {primaryCta}</div>
            <div className="bullet-card">Produto ativo: {activeProduct ? "Sim" : "Não"}</div>
          </div>

          {trailer ? (
            <div className="card" style={{ display: "grid", gap: 10, padding: 12 }}>
              <strong>Trailer teaser</strong>
              <video controls src={trailer} style={{ width: "100%", borderRadius: 12 }} />
            </div>
          ) : null}
        </aside>
      </section>

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Próximo passo</p>
          <h2 style={{ margin: 0 }}>{activeProduct ? "O lançamento já tem produto ativo na loja." : "Continua a acompanhar até ao lançamento final."}</h2>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          {activeProduct ? <Link href={`/loja/${activeProduct.slug}`} className="btn">Abrir produto</Link> : <Link href="/em-breve" className="btn">Voltar a Em breve</Link>}
          <Link href="/novidades" className="btn secondary">Ver novidades</Link>
        </div>
      </section>
    </main>
  );
}
