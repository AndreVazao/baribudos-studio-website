import Link from "next/link";

type Props = {
  slug: string;
  title: string;
  description?: string | null;
  language: string;
  format: string;
};

export default function PublicationCard({
  slug,
  title,
  description,
  language,
  format,
}: Props) {
  return (
    <article className="card publication-card-strong">
      <p className="hero-kicker">Publicação</p>
      <h3>{title}</h3>
      <p className="muted">{description || "Entrada editorial pronta para expansão comercial."}</p>
      <div className="product-meta-line">
        <span>{language}</span>
        <span>{format}</span>
      </div>
      <div className="bullet-grid compact-bullets">
        <div className="bullet-card">Exploração rápida</div>
        <div className="bullet-card">Pronta para catálogo</div>
        <div className="bullet-card">Ligada ao universo</div>
      </div>
      <Link href={`/loja/${slug}`} className="btn secondary">
        Abrir produto
      </Link>
    </article>
  );
}
