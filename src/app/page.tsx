import Link from "next/link";
import BrandLogos from "@/components/brand/BrandLogos";
import SagaHeroMedia from "@/components/brand/SagaHeroMedia";

const BARIBUDOS_VISUALS = {
  heroVideo: "/media/sagas/baribudos/baribudos-hero-intro-main-20s.mp4",
  heroVideoAlt: "/media/sagas/baribudos/baribudos-hero-intro-alt-13s.mp4",
  mobileTeaser: "/media/sagas/baribudos/baribudos-mobile-teaser-vertical-5s.mp4",
};

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="inline-logos">
            <BrandLogos variant="studio-primary" priority />
          </div>

          <h1>O Baribudos Studio cria universos. O Website organiza, apresenta e vende.</h1>

          <p>
            Plataforma editorial multi-IP para publicar, apresentar e vender
            histórias digitais, eBooks, audiobooks e séries. O Studio é a origem
            oficial do conteúdo. O Website é a camada pública, comercial e de
            distribuição.
          </p>

          <div className="hero-actions">
            <Link href="/ips" className="btn">
              Explorar IPs
            </Link>
            <Link href="/loja" className="btn secondary">
              Abrir loja
            </Link>
          </div>
        </div>

        <div className="hero-visual saga-ambient" style={{ gap: 14 }}>
          <div className="hero-visual-top">
            <BrandLogos variant="badge" />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(64,89,70,0.12)", background: "rgba(255,255,255,0.55)", minHeight: 180 }}>
              <SagaHeroMedia
                src={BARIBUDOS_VISUALS.heroVideo}
                aspectRatio="16 / 9"
                label="Entrada principal da saga Baribudos"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(64,89,70,0.12)", background: "rgba(255,255,255,0.55)", display: "grid", gap: 12 }}>
                <div>
                  <p className="hero-note" style={{ marginTop: 0 }}>Saga em destaque</p>
                  <BrandLogos variant="ip-secondary" />
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  A entrada visual da homepage já usa ativos próprios da saga Baribudos. Futuras sagas terão visual sets próprios sem mistura entre universos.
                </p>
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(64,89,70,0.12)", background: "rgba(255,255,255,0.6)", minHeight: 120 }}>
                  <SagaHeroMedia
                    src={BARIBUDOS_VISUALS.heroVideoAlt}
                    aspectRatio="16 / 9"
                    label="Variação visual da saga Baribudos"
                  />
                </div>
              </div>

              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(64,89,70,0.12)", background: "rgba(255,255,255,0.55)", minHeight: 188 }}>
                <SagaHeroMedia
                  src={BARIBUDOS_VISUALS.mobileTeaser}
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

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Como esta plataforma está pensada</h2>
            <p>Separação limpa entre produção, catálogo e comércio.</p>
          </div>
        </div>

        <div className="grid">
          <article className="card">
            <h3>Studio</h3>
            <p className="muted">
              Cria histórias, imagens, ilustrações, capas, variantes e assets.
            </p>
          </article>

          <article className="card">
            <h3>Website</h3>
            <p className="muted">
              Recebe payloads congelados, organiza o catálogo, apresenta e vende.
            </p>
          </article>

          <article className="card">
            <h3>Escala multi-IP</h3>
            <p className="muted">
              Hoje Baribudos. Amanhã novas sagas, novos universos e novas linhas editoriais.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
