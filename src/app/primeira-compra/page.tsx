import Link from "next/link";

const rails = [
  {
    title: "Começar por lançamentos",
    text: "Boa opção para quem quer ver primeiro o que está mais quente e mais pronto para fechar compra.",
    href: "/lancamentos",
    cta: "Ver lançamentos",
  },
  {
    title: "Entrar por ebooks",
    text: "Boa opção para quem já sabe que quer leitura digital e quer menos ruído no caminho até ao checkout.",
    href: "/ebooks",
    cta: "Ver ebooks",
  },
  {
    title: "Entrar por audiobooks",
    text: "Boa opção para quem prefere ouvir e quer encontrar logo produtos de áudio ativos.",
    href: "/audiobooks",
    cta: "Ver audiobooks",
  },
];

const proofCards = [
  "Caminho curto para o formato certo.",
  "Menos dispersão antes do checkout.",
  "Bom ponto de entrada para novos visitantes.",
  "Boa página para usar em campanhas e links rápidos.",
];

export default function PrimeiraCompraPage() {
  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Primeira compra</p>
        <h1>Entra pelo caminho mais simples e fecha a primeira compra com menos fricção.</h1>
        <p className="muted">
          Esta página existe para ajudar quem chega ao Website sem saber exatamente por onde começar.
          Em vez de obrigar a explorar tudo, damos logo três caminhos comerciais mais diretos.
        </p>

        <div className="hero-actions">
          <Link href="/comprar" className="btn">
            Ver todos os caminhos
          </Link>
          <Link href="/loja" className="btn secondary">
            Abrir loja completa
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>Escolhe como queres entrar</h2>
            <p>Três caminhos limpos para acelerar decisão e compra.</p>
          </div>
        </div>

        <div className="grid">
          {rails.map((item) => (
            <article key={item.title} className="card collection-card">
              <p className="hero-kicker">Entrada rápida</p>
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
          <p className="hero-kicker">Porque esta página ajuda a vender</p>
          <h2 style={{ margin: 0 }}>Quem compra pela primeira vez precisa de clareza, não de excesso de opções.</h2>
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
