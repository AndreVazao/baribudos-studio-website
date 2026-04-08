import Link from "next/link";
import BrandLogos from "@/components/brand/BrandLogos";
import SagaHeroMedia from "@/components/brand/SagaHeroMedia";
import ProductCard from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getLocalSagaVisualSet, normalizeSagaVisualSet } from "@/lib/saga-visual-sets";

async function loadHomepageVisualSet() {
  try {
    const persisted = await prisma.sagaVisualSet.findFirst({
      where: { sagaSlug: "baribudos", active: true },
      orderBy: { updatedAt: "desc" },
    });

    return normalizeSagaVisualSet(persisted?.payloadJson) ?? getLocalSagaVisualSet("baribudos");
  } catch {
    return getLocalSagaVisualSet("baribudos");
  }
}

async function loadFeaturedProducts() {
  try {
    return await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 3,
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

export default async function HomePage() {
  const [visualSet, featuredProducts] = await Promise.all([
    loadHomepageVisualSet(),
    loadFeaturedProducts(),
  ]);

  const heroVideo = visualSet?.slots?.hero_video?.path || "/media/sagas/baribudos/baribudos-hero-intro-main-20s.mp4";
  const heroVideoAlt = visualSet?.slots?.hero_video_alt?.path || "/media/sagas/baribudos/baribudos-hero-intro-alt-13s.mp4";
  const mobileTeaser = visualSet?.slots?.mobile_teaser?.path || "/media/sagas/baribudos/baribudos-mobile-teaser-vertical-5s.mp4";

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="inline-logos">
            <BrandLogos variant="studio-primary" priority />
          </div>

          <p className="hero-kicker">Histórias digitais, audiobooks e universos prontos para descobrir</p>
          <h1>Entra no universo Baribudos e compra histórias feitas para prender crianças e famílias.</h1>

          <p>
            O Studio cria. O Website entrega o melhor do catálogo ao público final. Aqui tens histórias,
            trailers, previews e formatos prontos para compra imediata, com espaço para crescer para
            novas sagas, novas personagens e novas linhas editoriais.
          </p>

          <div className="hero-actions">
            <Link href="/loja" className="btn">
              Comprar agora
            </Link>
            <Link href="/ips" className="btn secondary">
              Explorar universos
            </Link>
          </div>

          <div className="hero-proof-grid">
            <div className="hero-proof-card">
              <strong>Compra direta</strong>
              <span>Loja pronta para Stripe e PayPal.</span>
            </div>
            <div className="hero-proof-card">
              <strong>Previews reais</strong>
              <span>Trailer, áudio e capa onde existirem assets.</span>
            </div>
            <div className="hero-proof-card">
              <strong>Escala editorial</strong>
              <span>Hoje Baribudos, amanhã novas sagas.</span>
            </div>
          </div>
        </div>

        <div className="hero-visual saga-ambient" style={{ gap: 14 }}>
          <div className="hero-visual-top">
            <BrandLogos variant="badge" />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(64,89,70,0.12)",
                background: "rgba(255,255,255,0.55)",
                minHeight: 180,
              }}
            >
              <SagaHeroMedia
                src={heroVideo}
                aspectRatio="16 / 9"
                label="Entrada principal da saga Baribudos"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 12 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(64,89,70,0.12)",
                  background: "rgba(255,255,255,0.55)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <p className="hero-note" style={{ marginTop: 0 }}>
                    Saga em destaque
                  </p>
                  <BrandLogos variant="ip-secondary" />
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  A homepage já mostra ativos próprios do universo Baribudos e está pronta para receber
                  novos visual sets por saga sem mistura entre marcas.
                </p>
                <div
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(64,89,70,0.12)",
                    background: "rgba(255,255,255,0.6)",
                    minHeight: 120,
                  }}
                >
                  <SagaHeroMedia
                    src={heroVideoAlt}
                    aspectRatio="16 / 9"
                    label="Variação visual da saga Baribudos"
                  />
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(64,89,70,0.12)",
                  background: "rgba(255,255,255,0.55)",
                  minHeight: 188,
                }}
              >
                <SagaHeroMedia
                  src={mobileTeaser}
                  aspectRatio="9 / 16"
                  label="Teaser mobile da saga Baribudos"
                  mode="portrait"
                  maxHeight={188}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredProducts.length ? (
        <section className="section">
          <div className="section-header">
            <div>
              <h2>Destaques prontos para vender</h2>
              <p>Produtos ativos e comercialmente prontos, diretamente alimentados pelo Studio.</p>
            </div>
            <Link href="/loja" className="btn secondary">
              Ver loja completa
            </Link>
          </div>

          <div className="grid">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                slug={product.slug}
                title={product.title}
                description={(product.variant.payloadJson as any)?.short_description || (product.variant.payloadJson as any)?.description || null}
                language={product.variant.language || (product.variant.payloadJson as any)?.language || product.currency}
                amountCents={product.priceCents}
                currency={product.currency}
                kind={product.type}
                coverUrl={product.variant.assets.find((asset) => asset.role === "COVER")?.fileUrl || null}
                featured={product.featured}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Porque isto pode vender bem</h2>
            <p>Não é só um catálogo. É uma máquina editorial ligada ao Studio.</p>
          </div>
        </div>

        <div className="grid">
          <article className="card sales-card">
            <h3>Origem oficial do conteúdo</h3>
            <p className="muted">Tudo nasce no Studio, entra congelado no Website e mantém consistência editorial.</p>
          </article>

          <article className="card sales-card">
            <h3>Assets para conversão</h3>
            <p className="muted">Capas, trailers, previews de áudio e variantes comerciais podem ser explorados para aumentar compra.</p>
          </article>

          <article className="card sales-card">
            <h3>Escala multi-IP</h3>
            <p className="muted">A mesma base pode crescer para novas sagas, coleções sazonais e linhas premium.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
