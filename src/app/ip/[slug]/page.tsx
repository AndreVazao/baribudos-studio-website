import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicationCard from "@/components/publication-card";

export default async function IPPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const ip = await prisma.intellectualProperty.findUnique({
    where: { slug },
    include: {
      publications: {
        include: {
          variants: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ip) {
    notFound();
  }

  const variants = ip.publications.flatMap((publication) => publication.variants);

  return (
    <main style={{ marginTop: 24 }}>
      <div className="card">
        <h1>{ip.name}</h1>
        <p className="muted">{ip.description || "Sem descrição."}</p>
      </div>

      <div className="grid" style={{ marginTop: 24 }}>
        {variants.map((variant) => (
          <PublicationCard
            key={variant.id}
            slug={variant.slug}
            title={variant.title}
            description={variant.shortDescription}
            language={variant.language}
            format={variant.format}
          />
        ))}
      </div>
    </main>
  );
        }
