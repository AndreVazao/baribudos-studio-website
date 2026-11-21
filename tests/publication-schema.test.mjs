import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

const temporaryDirectory = await mkdtemp(join(process.cwd(), ".tmp-publication-schema-"));

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const priceSource = await readFile(new URL("../src/lib/publication-price.ts", import.meta.url), "utf8");
const assetUrlSource = await readFile(new URL("../src/lib/publication-asset-url.mjs", import.meta.url), "utf8");
const schemaSource = await readFile(new URL("../src/lib/publication-schema.ts", import.meta.url), "utf8");

await writeFile(join(temporaryDirectory, "publication-price.mjs"), compile(priceSource));
await writeFile(join(temporaryDirectory, "publication-asset-url.mjs"), assetUrlSource);
const compiledSchema = compile(schemaSource)
  .replaceAll('"@/lib/publication-price"', '"./publication-price.mjs"')
  .replaceAll('"@/lib/publication-asset-url.mjs"', '"./publication-asset-url.mjs"');
await writeFile(join(temporaryDirectory, "publication-schema.mjs"), compiledSchema);

const { websitePayloadSchema } = await import(
  pathToFileURL(join(temporaryDirectory, "publication-schema.mjs")).href
);
await rm(temporaryDirectory, { recursive: true, force: true });

function payloadWithCover(cover) {
  return {
    project_id: "project-1",
    project_slug: "project-1",
    ip_slug: "baribudos",
    ip_name: "Baribudos",
    language: "pt-PT",
    title: "Uma história de teste",
    description: "Descrição de teste.",
    price: 2.5,
    currency: "EUR",
    channel: "website",
    assets: cover === undefined ? {} : { cover },
    seo: {
      title: "Uma história de teste",
      description: "Descrição de teste.",
    },
  };
}

test("normalizes the Studio empty-cover sentinel to an absent asset", () => {
  const result = websitePayloadSchema.safeParse(payloadWithCover(""));

  assert.equal(result.success, true, JSON.stringify(result.error?.issues ?? []));
  if (result.success) {
    assert.equal(result.data.assets.cover, undefined);
  }
});

test("allows a publication that has no cover field", () => {
  const result = websitePayloadSchema.safeParse(payloadWithCover(undefined));

  assert.equal(result.success, true, JSON.stringify(result.error?.issues ?? []));
  if (result.success) {
    assert.equal(result.data.assets.cover, undefined);
  }
});

test("continues to reject relative Studio storage paths as public URLs", () => {
  const result = websitePayloadSchema.safeParse(payloadWithCover("/storage/covers/cover.png"));

  assert.equal(result.success, false);
});

test("rejects local, private and non-HTTPS cover URLs", () => {
  for (const cover of [
    "https://localhost/cover.png",
    "https://studio.local/cover.png",
    "https://192.168.1.8/cover.png",
    "https://[::1]/cover.png",
    "http://assets.example.com/cover.png",
    "https://user:secret@assets.example.com/cover.png",
  ]) {
    const result = websitePayloadSchema.safeParse(payloadWithCover(cover));
    assert.equal(result.success, false, cover);
  }
});

test("preserves valid absolute cover URLs", () => {
  const result = websitePayloadSchema.safeParse(payloadWithCover("https://assets.example.com/cover.png"));

  assert.equal(result.success, true, JSON.stringify(result.error?.issues ?? []));
  if (result.success) {
    assert.equal(result.data.assets.cover, "https://assets.example.com/cover.png");
  }
});
