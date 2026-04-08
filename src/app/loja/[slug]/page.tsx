import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutBox from "@/components/checkout-box";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variant: {
        include: {
          assets: true,
        },
      },
    },
  });

  if (!product || !product.active) {
    notFound();
  }

  const payload = product.variant.payloadJson as any;
  const cover = product.variant.assets.find((a) => a.role === "COVER");
  const preview = product.variant.assets.find((a) => a.role === "AUDIOBOOK_PREVIEW");
  const trailer = product.variant.assets.find((a) => a.role === "VIDEO_TRAILER");
  const highlights = [
    payload.language ? `Idioma: ${payload.language}` : null,
    Array.isArray(payload.formats) && payload.formats.length ? `Formatos: ${payload.formats.join(", ")}` : null,
    product.type ? `Tipo: ${product.type}` : null,
    "Compra imediata com Stripe ou PayPal",
  ].filter(Boolean);

  return (
    <main className="page-shell">
      <div className="product-detail-layout">
        <section className="card product-detail-main">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.fileUrl} alt={product.title} className="product-detail-cover" />
          ) : null}

          <div className="product-detail-copy">
            <p className="hero-kicker">Produto oficial</p>
            <h1>{product.title}</h1>
            <p className="muted lead-text">{payload.short_description || "Conteúdo editorial pronto para leitura, audição ou coleção."}</p>
            <p>{payload.description}</p>

            <div className="bullet-grid">
              {highlights.map((item) => (
                <div key={item} className="bullet-card">
                  {item}
                </div>
              ))}
            </div>

            <div className="asset-stack">
              {preview ? (
                <div className="asset-card">
                  <strong>Preview áudio</strong>
                  <audio controls src={preview.fileUrl} style={{ width: "100%" }} />
                </div>
              ) : null}

              {trailer ? (
                <div className="asset-card">
                  <strong>Trailer</strong>
                  <video controls src={trailer.fileUrl} style={{ width: "100%", borderRadius: 12 }} />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <CheckoutBox
          productId={product.id}
          title={product.title}
          amountCents={product.priceCents}
          currency={product.currency}
        />
      </div>
    </main>
  );
}
