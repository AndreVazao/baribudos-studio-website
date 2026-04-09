import Link from "next/link";

const faqItems = [
  {
    question: "O que é este Website?",
    answer: "É a montra editorial e comercial pública do Baribudos Studio, preparada para apresentar IPs, produtos, variantes e caminhos de compra.",
  },
  {
    question: "Posso comprar com cartão ou PayPal?",
    answer: "Sim. O checkout está preparado para Stripe e PayPal.",
  },
  {
    question: "Porque existem IPs, coleções e loja?",
    answer: "Porque cada camada serve uma etapa diferente da jornada: descoberta do universo, orientação comercial e compra direta.",
  },
  {
    question: "O catálogo vai crescer?",
    answer: "Sim. A estrutura foi desenhada para acomodar novas sagas, novos formatos, produtos premium e futuras coleções sem refazer o Website.",
  },
  {
    question: "Como acompanho novidades?",
    answer: "Podes guardar o Website, seguir as áreas de coleções e usar o contacto por email para manifestar interesse em novidades futuras.",
  },
];

export default function FAQPage() {
  return (
    <main className="page-shell">
      <section className="sales-intro-card">
        <p className="hero-kicker">FAQ</p>
        <h1>Perguntas frequentes para reduzir atrito antes da compra.</h1>
        <p className="muted">
          Esta página existe para responder rapidamente ao que um visitante precisa de perceber antes de entrar na loja,
          explorar universos ou voltar mais tarde para futuras compras.
        </p>
      </section>

      <section className="section">
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
          <p className="hero-kicker">Pronto para avançar</p>
          <h2 style={{ margin: 0 }}>Depois da FAQ, o próximo passo natural é explorar a loja ou as coleções.</h2>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <Link href="/loja" className="btn">
            Ir para a loja
          </Link>
          <Link href="/colecoes" className="btn secondary">
            Ver coleções
          </Link>
        </div>
      </section>
    </main>
  );
}
