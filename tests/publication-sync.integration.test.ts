import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { syncPublicationToCommerce } from "@/lib/sync-commerce";

const cases: Array<{ publicationId: string; variantId: string; ipSlug: string }> = [];

function makeInput(options: {
  title?: string;
  projectVersion?: string;
  cover?: string;
  gallery?: string[];
  price?: number;
} = {}) {
  const id = randomUUID();
  const publicationId = `publication:${id}`;
  const variantId = `variant:${id}`;
  const ipSlug = `integration-${id}`;
  cases.push({ publicationId, variantId, ipSlug });

  const title = options.title ?? "Integration test publication";
  return {
    ok: true,
    schema_version: "website_ingest_v1",
    publication_id: publicationId,
    variant_id: variantId,
    project_id: `project:${id}`,
    project_version: options.projectVersion ?? "2026-11-12T20:00:00.000000+00:00",
    published_at: "2026-11-12T20:05:00.000000+00:00",
    checksum: "a".repeat(64),
    payload: {
      project_id: `project:${id}`,
      project_slug: `project-${id}`,
      ip_slug: ipSlug,
      ip_name: "Integration Test IP",
      series_name: "",
      language: "pt-PT",
      title,
      subtitle: "",
      description: "PostgreSQL integration test.",
      short_description: "Integration test",
      formats: ["ebook"],
      price: options.price ?? 9.9,
      currency: "EUR",
      channel: "website",
      assets: {
        cover: options.cover ?? "https://assets.example.test/cover.png",
        logos: [],
        gallery: options.gallery ?? ["https://assets.example.test/gallery-1.png"],
        sample_pages: [],
        audiobook_preview: null,
        video_trailer: null,
        downloadable_files: [],
      },
      seo: {
        title,
        description: "PostgreSQL integration test.",
        keywords: [],
        canonical_url: "",
        og_image: "",
      },
      characters: [],
      themes: [],
      values: [],
      authors: [],
      badges: [],
      buy_links: [],
    },
    related_variants: [],
    related_projects: [],
    asset_manifest: null,
    branding_pack: null,
    marketplace_visuals: null,
  };
}

async function cleanupCase(item: { publicationId: string; variantId: string; ipSlug: string }) {
  await prisma.publicationAsset.deleteMany({ where: { variantIdRef: item.variantId } });
  await prisma.product.deleteMany({ where: { publicationVariantId: item.variantId } });
  await prisma.publicationVariant.deleteMany({ where: { variantId: item.variantId } });
  await prisma.publication.deleteMany({ where: { publicationId: item.publicationId } });
  await prisma.series.deleteMany({ where: { slug: { startsWith: item.ipSlug } } });
  await prisma.intellectualProperty.deleteMany({ where: { slug: item.ipSlug } });
}

after(async () => {
  for (const item of cases) await cleanupCase(item);
  await prisma.$disconnect();
});

test("PostgreSQL ingestion replay replaces assets and keeps one stable product", async () => {
  const firstInput = makeInput();
  const first = await syncPublicationToCommerce(firstInput as never);

  assert.equal(first.product.priceCents, 990);
  assert.equal(await prisma.product.count({
    where: { publicationVariantId: firstInput.variant_id },
  }), 1);
  assert.equal(await prisma.publicationAsset.count({
    where: { variantIdRef: firstInput.variant_id },
  }), 2);

  const replay = {
    ...firstInput,
    published_at: "2026-11-12T20:06:00.000000+00:00",
  };
  await syncPublicationToCommerce(replay as never);

  const nextVersion = makeInput({
    title: "Integration test publication",
    projectVersion: "2026-11-12T20:00:01.000000+00:00",
    gallery: [],
    price: 12.5,
  });
  // Reuse the original identity while advancing the frozen project version.
  const updated = {
    ...nextVersion,
    publication_id: firstInput.publication_id,
    variant_id: firstInput.variant_id,
    project_id: firstInput.project_id,
    payload: {
      ...nextVersion.payload,
      project_id: firstInput.project_id,
      ip_slug: firstInput.payload.ip_slug,
      ip_name: firstInput.payload.ip_name,
      project_slug: firstInput.payload.project_slug,
    },
  };
  await syncPublicationToCommerce(updated as never);

  const products = await prisma.product.findMany({
    where: { publicationVariantId: firstInput.variant_id },
  });
  const assets = await prisma.publicationAsset.findMany({
    where: { variantIdRef: firstInput.variant_id },
  });

  assert.equal(products.length, 1);
  assert.equal(products[0].priceCents, 1250);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].role, "COVER");
});

test("PostgreSQL transaction rolls back publication, variant and product after asset failure", async () => {
  const input = makeInput({ cover: "https://assets.example.test/force-failure.png" });

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION baribudos_test_reject_asset()
    RETURNS trigger AS $$
    BEGIN
      IF NEW."fileUrl" = 'https://assets.example.test/force-failure.png' THEN
        RAISE EXCEPTION 'forced_asset_write_failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER baribudos_test_reject_asset_trigger
    BEFORE INSERT ON "PublicationAsset"
    FOR EACH ROW EXECUTE FUNCTION baribudos_test_reject_asset()
  `);

  try {
    await assert.rejects(
      syncPublicationToCommerce(input as never),
      /forced_asset_write_failure/
    );
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS baribudos_test_reject_asset_trigger ON "PublicationAsset"');
    await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS baribudos_test_reject_asset()");
  }

  assert.equal(await prisma.intellectualProperty.count({
    where: { slug: input.payload.ip_slug },
  }), 0);
  assert.equal(await prisma.publication.count({
    where: { publicationId: input.publication_id },
  }), 0);
  assert.equal(await prisma.publicationVariant.count({
    where: { variantId: input.variant_id },
  }), 0);
  assert.equal(await prisma.product.count({
    where: { publicationVariantId: input.variant_id },
  }), 0);
  assert.equal(await prisma.publicationAsset.count({
    where: { variantIdRef: input.variant_id },
  }), 0);
});

test("concurrent PostgreSQL deliveries never leave an older frozen version on top", async () => {
  const older = makeInput({
    title: "Concurrent older snapshot",
    projectVersion: "2026-11-12T20:00:00.000000+00:00",
  });
  const newer = {
    ...older,
    project_version: "2026-11-12T20:00:01.000000+00:00",
    checksum: "b".repeat(64),
    payload: { ...older.payload, title: "Concurrent newer snapshot", seo: { ...older.payload.seo, title: "Concurrent newer snapshot" } },
  };

  const outcomes = await Promise.allSettled([
    syncPublicationToCommerce(older as never),
    syncPublicationToCommerce(newer as never),
  ]);
  assert.ok(outcomes.some((outcome) => outcome.status === "fulfilled"));

  const stored = await prisma.publicationVariant.findUnique({
    where: { variantId: older.variant_id },
  });
  assert.ok(stored);

  const storedPayload = stored.payloadJson as Record<string, unknown>;
  const studioMeta = storedPayload._studio as Record<string, unknown>;
  assert.equal(studioMeta.project_version, newer.project_version);

  assert.equal(await prisma.product.count({
    where: { publicationVariantId: older.variant_id },
  }), 1);
});
