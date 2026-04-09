import Link from "next/link";

const collectionItems = [
  {
    title: "Primeira compra",
    subtitle: "Entrada simples no universo",
    text: "Pensada para quem quer começar por um produto direto, perceber o tom da marca e fechar compra sem fricção.",
    href: "/loja",
    cta: "Explorar produtos de entrada",
  },
  {
    title: "Ouvir e ler",
    subtitle: "Formatos com mais riqueza de apresentação",
    text: "Boa rota para produtos que podem combinar capa, trailer, preview áudio e descrição editorial mais completa.",
    href: "/loja",
    cta: "Ver formatos",
  },
  {
    title: "Explorar universos",
    subtitle: "Descoberta por IP e recorrência",
    text: "Criada para quem prefere entrar primeiro no universo, perceber personagens e só depois escolher o produto final.",
    href: "/ips",
    cta: "Abrir universos",
  },
  {
    title: "Crescimento editorial",
    subtitle: "Base para futuras sagas e volumes",
    text: "Esta camada prepara a montra para futuras coleções sazonais, linhas premium e progressão por volumes sem reestruturar o Website.",
    href: "/loja",
    cta: "Ir para a loja",
  },
];

export default function CollectionsPage() {
  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">Coleções</p>
        <h1>Escolhe um caminho de descoberta e compra em vez de entrares às cegas na loja.</h1>
        <p className="muted">
          Esta página organiza a montra em rotas comerciais simples. O objetivo é aumentar clareza,
          facilitar decisão e preparar o Website para futura recorrência por universos, formatos e linhas editoriais.
        </p>
      </section>

      <section className="section">
        <div className="grid">
          {collectionItems.map((item) => (
            <article key={item.title} className="card collection-card premium-collection-card">
              <p className="hero-kicker">{item.subtitle}</p>
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
              <Link href={item.href} className="btn secondary btn-wide">
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section interest-strip">
        <div>
          <p className="hero-kicker">Próximo passo</p>
          <h2 style={{ margin: 0 }}>Depois de escolheres o caminho, a compra fecha-se na loja oficial.</h2>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <Link href="/loja" className="btn">
            Ir para a loja
          </Link>
          <Link href="/ips" className="btn secondary">
            Ver IPs
          </Link>
        </div>
      </section>
    </main>
  );
}
