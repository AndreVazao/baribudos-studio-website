import Link from "next/link";
import BrandLogos from "@/components/brand/BrandLogos";

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

        <div className="hero-visual">
          <div className="hero-visual-top">
            <BrandLogos variant="badge" />
          </div>

          <div className="hero-visual-bottom">
            <div>
              <p className="hero-note">IP em destaque</p>
              <BrandLogos variant="ip-secondary" />
            </div>

            <div>
              <p className="muted" style={{ margin: 0 }}>
                A marca mãe lidera o website. Cada saga ganha destaque nas suas
                páginas próprias e nos seus produtos.
              </p>
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
