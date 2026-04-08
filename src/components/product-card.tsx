import Link from "next/link";
import { centsToEuro } from "@/lib/pricing";

type Props = {
  slug: string;
  title: string;
  description?: string | null;
  language: string;
  amountCents: number;
  currency?: string;
  kind: string;
  coverUrl?: string | null;
  featured?: boolean;
};

export default function ProductCard({
  slug,
  title,
  description,
  language,
  amountCents,
  currency = "EUR",
  kind,
  coverUrl,
  featured = false,
}: Props) {
  return (
    <article className="card product-card-strong product-card-premium">
      <div className="product-card-media">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={title} className="product-cover" />
        ) : (
          <div className="product-cover product-cover-fallback">
            <span>{kind}</span>
          </div>
        )}
        {featured ? <span className="product-badge">Destaque</span> : null}
      </div>

      <div className="product-card-body">
        <div className="product-meta-line">
          <span>{kind}</span>
          <span>{language}</span>
        </div>

        <h3>{title}</h3>
        <p className="muted">{description || "História pronta para compra imediata."}</p>

        <div className="product-card-promise">Compra rápida · apresentação oficial · catálogo ligado ao Studio</div>

        <div className="product-price-row">
          <strong>{centsToEuro(amountCents, currency)}</strong>
          <span className="muted">Compra direta</span>
        </div>

        <Link href={`/loja/${slug}`} className="btn btn-wide">
          Ver produto
        </Link>
      </div>
    </article>
  );
}
