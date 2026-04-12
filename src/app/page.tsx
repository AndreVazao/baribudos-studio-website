import Link from "next/link";
import BrandLogos from "@/components/brand/BrandLogos";
import SagaHeroMedia from "@/components/brand/SagaHeroMedia";
import ProductCard from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getLocalSagaVisualSet, normalizeSagaVisualSet } from "@/lib/saga-visual-sets";

function extractMarketing(payload: any = {}) {
  return payload?.website_marketing || payload?.marketing || payload?.commercial?.website_marketing || {};
}

function buildFeaturedTeaserCard(variant: any) {
  const payload = variant?.payloadJson as any;
  const marketing = extractMarketing(payload);
  const activeProduct = variant?.products?.find((product: any) => product.active);
  const publicState = String(marketing?.public_state || "").trim();

  if (!["teaser_ready", "prelaunch_public", "launch_ready", "published"].includes(publicState) && !variant?.published) {
    return null;
  }

  return {
    id: variant.id,
    slug: variant.slug,
    title: marketing?.teaser_headline || variant.title,
    subtitle: marketing?.teaser_subtitle || variant.shortDescription || variant.description || "",
    badge:
      marketing?.teaser_badge ||
      (publicState === "prelaunch_public"
        ? "Pré-lançamento"
        : publicState === "published" || activeProduct
          ? "Já disponível"
          : "Em destaque"),
    releaseLabel: marketing?.teaser_release_label || (activeProduct ? "Disponível agora" : "Lançamento em breve"),
    cover:
      marketing?.teaser_cover_url ||
      variant?.assets?.find((asset: any) => asset.role === "COVER")?.fileUrl ||
      null,
    href: activeProduct ? `/loja/${activeProduct.slug}` : `/novidades/${variant.slug}`,
    cta: marketing?.teaser_cta_label || (activeProduct ? "Comprar agora" : "Abrir teaser"),
  };
}

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

async function loadCatalogStats() {
  try {
    const [ipCount, publicationCount, productCount] = await Promise.all([
      prisma.intellectualProperty.count(),
      prisma.publication.count(),
      prisma.product.count({ where: { active: true } }),
    ]);

    return { ipCount, publicationCount, productCount };
  } catch {
    return { ipCount: 0, publicationCount: 0, productCount: 0 };
  }
}

async function loadFeaturedTeaser() {
  try {
    const variants = await prisma.publicationVariant.findMany({
      orderBy: [{ published: "desc" }, { updatedAt: "desc" }],
      take: 12,
      include: {
        assets: true,
        products: true,
        publication: true,
      },
    });

    for (const variant of variants) {
      const card = buildFeaturedTeaserCard(variant);
      if (card) return card;
    }

    return null;
  } catch {
    return null;
  }
}

const trustItems = [
  "Checkout imediato com Stripe e PayPal",
  "Catálogo alimentado pelo Studio oficial",
  "Assets comerciais como capa, trailer e preview quando existirem",
  "Estrutura pronta para crescer para novos universos",
];

const receiveItems = [
  "Produto editorial organizado por variante comercial",
  "Entrega associada ao email usado na compra",
  "Página de produto com contexto, formatos e assets",
  "Acesso a uma montra oficial ligada ao universo Baribudos",
];

const faqItems = [
  {
    question: "O que encontro aqui?",
    answer: "Produtos editoriais e comerciais vindos diretamente do Studio, preparados para apresentação e venda no Website.",
  },
  {
    question: "Posso comprar com cartão ou PayPal?",
    answer: "Sim. O Website já está preparado para checkout com Stripe e PayPal.",
  },
  {
    question: "O catálogo pode crescer?",
    answer: "Sim. A base está pronta para novas sagas, novos formatos e novos produtos sem reestruturar o Website.",
  },
];

const collectionItems = [
  {
    title: "Entrada rápida no universo",
    text: "Coleção ideal para quem quer começar por uma compra simples e perceber o tom da marca.",
    cta: "Ver produtos de entrada",
    href: "/loja",
  },
  {
    title: "Formatos para ouvir e ler",
    text: "Páginas de produto preparadas para combinar leitura, trailer e preview áudio sempre que existirem assets.",
    cta: "Explorar formatos",
    href: "/loja",
  },
  {
    title: "Universos em crescimento",
    text: "A navegação por IP ajuda a vender não só um produto isolado, mas um mundo editorial inteiro.",
    cta: "Explorar universos",
    href: "/ips",
  },
];

const proofCards = [
  {
    title: "Montra oficial",
    text: "O Website recebe publicações do Studio oficial, o que aumenta coerência entre catálogo, ativos e apresentação pública.",
  },
  {
    title: "Compra sem fricção",
    text: "O fluxo foi desenhado para reduzir passos e aproximar mais rapidamente o visitante do checkout.",
  },
  {
    title: "Base para recorrência",
    text: "A navegação por universo, produto e coleção prepara o terreno para futuras compras repetidas.",
  },
];

const audienceCards = [
  "Famílias que procuram histórias com identidade visual própria",
  "Quem quer começar com uma compra simples e direta",
  "Quem prefere descobrir primeiro o universo e só depois escolher produto",
  "Quem valoriza capa, trailer e preview antes de fechar compra",
];

const conversionSteps = [
  "O Studio produz, aprova e decide o estado público.",
  "O Website recebe o teaser, aquece descoberta e prepara compra.",
  "O lançamento final empurra para produto, loja e próximos destinos de distribuição.",
];

const distributionSteps = [
  "Website próprio para descoberta, pré-lançamento e venda direta.",
  "Expansão futura para Amazon, YouTube e outros destinos controlados pelo Studio.",
  "Um só centro editorial, vários canais de distribuição sem partir a marca.",
];

export default async function HomePage() {
  const [visualSet, featuredProducts, stats, featuredTeaser] = await Promise.all([
    loadHomepageVisualSet(),
    loadFeaturedProducts(),
    loadCatalogStats(),
    loadFeaturedTeaser(),
  ]);

  const heroVideo =
    visualSet?.slots?.hero_video?.path || "/media/sagas/baribudos/baribudos-hero-intro-main-20s.mp4";
  const heroVideoAlt =
    visualSet?.slots?.hero_video_alt?.path || "/media/sagas/baribudos/baribudos-hero-intro-alt-13s.mp4";
  const mobileTeaser =
    visualSet?.slots?.mobile_teaser?.path || "/media/sagas/baribudos/baribudos-mobile-teaser-vertical-5s.mp4";

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="inline-logos">
            <BrandLogos variant="studio-primary" size="hero" priority />
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

      {featuredTeaser ? (
        <section className="section">
          <div
            className="sales-intro-card"
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: featuredTeaser.cover ? "minmax(240px, 360px) 1fr" : "1fr",
              alignItems: "center",
            }}
          >
            {featuredTeaser.cover ? (
              <div
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <img
                  src={featuredTeaser.cover}
                  alt={featuredTeaser.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div className="prelaunch-badge">{featuredTeaser.badge}</div>
                <div className="stage-chip">{featuredTeaser.releaseLabel}</div>
              </div>

              <div>
                <p className="hero-kicker" style={{ marginBottom: 8 }}>
                  Destaque automático do momento
                </p>
                <h2 style={{ margin: 0 }}>{featuredTeaser.title}</h2>
              </div>

              <p className="muted" style={{ margin: 0 }}>
                {featuredTeaser.subtitle}
              </p>

              <div className="hero-actions" style={{ marginTop: 4 }}>
                <Link href={featuredTeaser.href} className="btn">
                  {featuredTeaser.cta}
                </Link>
                <Link href="/novidades" className="btn secondary">
                  Ver novidades
                </Link>
                <Link href="/em-breve" className="btn secondary">
                  Ver em breve
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Como isto se transforma em venda</p>
          <h2 style={{ margin: 0 }}>
            Do Studio para a descoberta, da descoberta para a compra, da compra para a expansão.
          </h2>
        </div>
        <div className="bullet-grid" style={{ width: "100%" }}>
          {conversionSteps.map((step) => (
            <div key={step} className="bullet-card">
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Expansão editorial e comercial</p>
          <h2 style={{ margin: 0 }}>
            O Website é o teu canal próprio hoje. A estrutura já prepara o terreno para vários destinos amanhã.
          </h2>
        </div>
        <div className="bullet-grid" style={{ width: "100%" }}>
          {distributionSteps.map((step) => (
            <div key={step} className="bullet-card">
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Descoberta orientada</p>
          <h2 style={{ margin: 0 }}>Vê o que já está disponível e o que está a aquecer para o próximo lançamento.</h2>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <Link href="/novidades" className="btn">
            Abrir novidades
          </Link>
          <Link href="/em-breve" className="btn secondary">
            Ver em breve
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Catálogo vivo</h2>
            <p>Números reais que ajudam a dar densidade e confiança à montra.</p>
          </div>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>IPs</span>
            <strong>{stats.ipCount}</strong>
          </div>
          <div className="kpi-card">
            <span>Publicações</span>
            <strong>{stats.publicationCount}</strong>
          </div>
          <div className="kpi-card">
            <span>Produtos ativos</span>
            <strong>{stats.productCount}</strong>
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
            {featuredProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                slug={product.slug}
                title={product.title}
                description={
                  (product.variant.payloadJson as any)?.short_description ||
                  (product.variant.payloadJson as any)?.description ||
                  null
                }
                language={
                  product.variant.language ||
                  (product.variant.payloadJson as any)?.language ||
                  product.currency
                }
                amountCents={product.priceCents}
                currency={product.currency}
                kind={product.type}
                coverUrl={product.variant.assets.find((asset: any) => asset.role === "COVER")?.fileUrl || null}
                featured={product.featured}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Coleções e caminhos de compra</h2>
            <p>Estrutura comercial simples para orientar quem chega sem saber o que escolher.</p>
          </div>
        </div>
        <div className="grid">
          {collectionItems.map((item) => (
            <article key={item.title} className="card collection-card">
              <p className="hero-kicker">Coleção editorial</p>
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
            <h2>Porque esta montra tem tração comercial</h2>
            <p>Social proof estrutural sem inventar reviews falsas.</p>
          </div>
        </div>
        <div className="grid">
          {proofCards.map((item) => (
            <article key={item.title} className="card proof-card">
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Ideal para</h2>
            <p>Ajuda o visitante a perceber rapidamente se está no sítio certo.</p>
          </div>
        </div>
        <div className="bullet-grid">
          {audienceCards.map((item) => (
            <div key={item} className="bullet-card">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>O que recebes deste Website</h2>
            <p>Menos discurso técnico, mais valor percebido e mais clareza para comprar.</p>
          </div>
        </div>

        <div className="bullet-grid">
          {receiveItems.map((item) => (
            <div key={item} className="bullet-card">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section trust-section-card">
        <div className="section-header">
          <div>
            <h2>Porque dá confiança comprar aqui</h2>
            <p>A montra pública está ligada ao Studio oficial e preparada para crescer sem perder coerência.</p>
          </div>
        </div>

        <div className="bullet-grid">
          {trustItems.map((item) => (
            <div key={item} className="bullet-card">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section interest-strip">
        <div>
          <p className="hero-kicker">Queres acompanhar novidades</p>
          <h2 style={{ margin: 0 }}>Guarda este Website e acompanha novas sagas, novos produtos e novas variantes.</h2>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <Link href="/loja" className="btn">
            Ver catálogo agora
          </Link>
          <a href="mailto:contacto@baribudos.pt?subject=Interesse%20em%20novidades%20Baribudos" className="btn secondary">
            Pedir novidades por email
          </a>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Perguntas rápidas antes de comprar</h2>
            <p>Bloco curto para reduzir atrito e aumentar confiança.</p>
          </div>
        </div>

        <div className="grid">
          {faqItems.map((item) => (
            <article key={item.question} className="card faq-card">
              <h3>{item.question}</h3>
              <p className="muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Pronto para comprar</p>
          <h2 style={{ margin: 0 }}>Segue para a loja e fecha a compra com menos fricção.</h2>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <Link href="/loja" className="btn">
            Ir para a loja
          </Link>
          <Link href="/ips" className="btn secondary">
            Ver universos
          </Link>
        </div>
      </section>
    </main>
  );
}
