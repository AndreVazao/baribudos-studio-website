import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/publication-version.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { assertPublicationVersionCanReplace, PublicationVersionConflictError } = await import(moduleUrl);

const checksumA = "a".repeat(64);
const checksumB = "b".repeat(64);

test("accepts the first version when no Website snapshot exists", () => {
  assert.doesNotThrow(() => assertPublicationVersionCanReplace(null, {
    project_version: "2026-11-10T10:00:00.000000+00:00",
    checksum: checksumA,
  }));
});

test("accepts a strictly newer Studio snapshot", () => {
  assert.doesNotThrow(() => assertPublicationVersionCanReplace({
    project_version: "2026-11-10T10:00:00.000000+00:00",
    checksum: checksumA,
  }, {
    project_version: "2026-11-10T10:00:00.000001+00:00",
    checksum: checksumB,
  }));
});

test("rejects an older snapshot instead of overwriting newer Website state", () => {
  assert.throws(() => assertPublicationVersionCanReplace({
    project_version: "2026-11-10T10:00:00.000001+00:00",
    checksum: checksumB,
  }, {
    project_version: "2026-11-10T10:00:00.000000+00:00",
    checksum: checksumA,
  }), (error) => error instanceof PublicationVersionConflictError && error.code === "stale_publication_version");
});

test("allows an exact replay but rejects a different payload at the same version", () => {
  const current = {
    project_version: "2026-11-10T10:00:00.000000+00:00",
    checksum: checksumA,
  };

  assert.doesNotThrow(() => assertPublicationVersionCanReplace(current, current));
  assert.throws(() => assertPublicationVersionCanReplace(current, {
    ...current,
    checksum: checksumB,
  }), (error) => error instanceof PublicationVersionConflictError && error.code === "publication_version_checksum_conflict");
});

test("compares timezone offsets as the same instant", () => {
  assert.throws(() => assertPublicationVersionCanReplace({
    project_version: "2026-11-10T11:00:00.000000+01:00",
    checksum: checksumA,
  }, {
    project_version: "2026-11-10T10:00:00.000000+00:00",
    checksum: checksumB,
  }), (error) => error instanceof PublicationVersionConflictError && error.code === "publication_version_checksum_conflict");
});

test("rejects malformed timestamps and non-SHA256 checksums", () => {
  assert.throws(() => assertPublicationVersionCanReplace(null, {
    project_version: "not-a-timestamp",
    checksum: checksumA,
  }), /invalid_project_version/);

  assert.throws(() => assertPublicationVersionCanReplace(null, {
    project_version: "2026-11-10T10:00:00.000000+00:00",
    checksum: "not-a-checksum",
  }), /invalid_publication_checksum/);
});
