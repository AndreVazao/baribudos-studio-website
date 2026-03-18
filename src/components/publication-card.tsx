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
    <article className="card">
      <h3>{title}</h3>
      <p className="muted">{description || "Sem descrição."}</p>
      <p className="muted">
        {language} · {format}
      </p>
      <Link href={`/loja/${slug}`} className="btn secondary">
        Abrir
      </Link>
    </article>
  );
}
