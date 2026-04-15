import { NextResponse } from "next/server";
import { ProductType } from "@prisma/client";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const publicSurfaces = [
  { id: "home", path: "/", label: "Homepage" },
  { id: "comprar", path: "/comprar", label: "Comprar" },
  { id: "lancamentos", path: "/lancamentos", label: "Lançamentos" },
  { id: "ebooks", path: "/ebooks", label: "Ebooks" },
  { id: "audiobooks", path: "/audiobooks", label: "Audiobooks" },
  { id: "loja", path: "/loja", label: "Loja" },
  { id: "novidades", path: "/novidades", label: "Novidades" },
  { id: "em-breve", path: "/em-breve", label: "Em breve" },
  { id: "primeira-compra", path: "/primeira-compra", label: "Primeira compra" },
];

function siteUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
}

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    const [activeProducts, featuredProducts, ebookCount, audiobookCount, publicationCount] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.product.count({ where: { active: true, featured: true } }),
      prisma.product.count({ where: { active: true, type: ProductType.EBOOK } }),
      prisma.product.count({ where: { active: true, type: ProductType.AUDIOBOOK } }),
      prisma.publication.count(),
    ]);

    const base = siteUrl();

    return NextResponse.json({
      ok: true,
      intake: "studio_selling_status_v1",
      counts: {
        active_products: activeProducts,
        featured_products: featuredProducts,
        ebooks: ebookCount,
        audiobooks: audiobookCount,
        publications: publicationCount,
      },
      public_surfaces: publicSurfaces.map((item) => ({
        ...item,
        url: base ? `${base}${item.path}` : item.path,
      })),
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: asHttpErrorStatus(error, 400) }
    );
  }
}
