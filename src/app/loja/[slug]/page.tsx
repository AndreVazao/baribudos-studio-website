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

  return (
    <main style={{ marginTop: 24 }}>
      <div className="grid" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
        <section className="card">
          <h1>{product.title}</h1>
          <p className="muted">{payload.short_description || ""}</p>
          <p>{payload.description}</p>

          <p>
            <strong>Idioma:</strong> {payload.language}
          </p>
          <p>
            <strong>Formatos:</strong> {(payload.formats || []).join(", ")}
          </p>

          {cover ? (
            <p>
              <a href={cover.fileUrl} target="_blank">
                Ver capa
              </a>
            </p>
          ) : null}

          {preview ? (
            <p>
              <a href={preview.fileUrl} target="_blank">
                Ouvir preview
              </a>
            </p>
          ) : null}

          {trailer ? (
            <p>
              <a href={trailer.fileUrl} target="_blank">
                Ver trailer
              </a>
            </p>
          ) : null}
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
