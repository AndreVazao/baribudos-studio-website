import Link from "next/link";

const rails = [
  {
    title: "Lançamentos",
    text: "Entrada mais direta para produtos ativos e prontos para compra imediata.",
    href: "/lancamentos",
    cta: "Comprar lançamentos",
  },
  {
    title: "Ebooks",
    text: "Caminho certo para quem quer leitura digital com menos ruído e mais foco no formato.",
    href: "/ebooks",
    cta: "Ver ebooks",
  },
  {
    title: "Audiobooks",
    text: "Caminho certo para quem prefere ouvir e quer descobrir áudio pronto para comprar.",
    href: "/audiobooks",
    cta: "Ver audiobooks",
  },
  {
    title: "Loja completa",
    text: "Visão total do catálogo ativo com produtos, variantes e diferentes tipos de oferta.",
    href: "/loja",
    cta: "Abrir loja",
  },
];

const proofCards = [
  "O catálogo é alimentado pelo Studio oficial.",
  "Os produtos ativos já entram com capa, descrição e preço.",
  "O checkout está preparado para Stripe e PayPal.",
  "A estrutura já separa ebooks e audiobooks por formato.",
];

export default function ComprarPage() {
  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Comprar</p>
        <h1>Escolhe o caminho mais rápido para fechar compra no Website oficial.</h1>
        <p className="muted">
          Esta página existe para reduzir dispersão. Em vez de obrigar o visitante a adivinhar para onde deve ir,
          aqui ele escolhe logo entre lançamentos, ebooks, audiobooks ou catálogo completo.
        </p>

        <div className="hero-actions">
          <Link href="/lancamentos" className="btn">
            Ver lançamentos
          </Link>
          <Link href="/ebooks" className="btn secondary">
            Ver ebooks
          </Link>
          <Link href="/audiobooks" className="btn secondary">
            Ver audiobooks
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Entradas comerciais</h2>
            <p>Quatro caminhos simples para orientar o visitante até à compra certa.</p>
          </div>
        </div>

        <div className="grid">
          {rails.map((item) => (
            <article key={item.title} className="card collection-card">
              <p className="hero-kicker">Caminho de compra</p>
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
              <Link href={item.href} className="btn btn-wide">
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section sales-cta-strip">
        <div>
          <p className="hero-kicker">Porque esta página interessa</p>
          <h2 style={{ margin: 0 }}>Quando o visitante quer comprar, menos caminhos errados significa mais receita.</h2>
        </div>
        <div className="bullet-grid" style={{ width: "100%" }}>
          {proofCards.map((item) => (
            <div key={item} className="bullet-card">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
