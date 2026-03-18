import Link from "next/link";
import { centsToEuro } from "@/lib/pricing";

type Props = {
  slug: string;
  title: string;
  description?: string | null;
  language: string;
  amountCents: number;
  kind: string;
};

export default function ProductCard({
  slug,
  title,
  description,
  language,
  amountCents,
  kind,
}: Props) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p className="muted">{description || "Sem descrição curta."}</p>
      <p>
        <strong>{centsToEuro(amountCents)}</strong>
      </p>
      <p className="muted">
        {kind} · {language}
      </p>
      <Link href={`/loja/${slug}`} className="btn">
        Ver produto
      </Link>
    </article>
  );
}
