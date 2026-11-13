import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const {
  asHttpErrorStatus,
  buildPublicationErrorResponse,
  isRetryablePrismaTransactionConflict,
} = await import(moduleUrl);

test("recognizes Prisma serializable transaction conflicts as retryable", () => {
  const error = Object.assign(new Error("transaction conflict"), { code: "P2034" });

  assert.equal(isRetryablePrismaTransactionConflict(error), true);
  assert.equal(asHttpErrorStatus(error, 500), 409);
});

test("builds the exact retry contract consumed by the Studio publisher", () => {
  const error = Object.assign(new Error("transaction conflict"), { code: "P2034" });
  const response = buildPublicationErrorResponse(error, 500);

  assert.equal(response.status, 409);
  assert.deepEqual(response.body, {
    ok: false,
    error: "retryable_transaction_conflict",
    retryable: true,
  });
  assert.equal(response.retryAfter, "1");
});

test("does not classify unrelated Prisma errors as retryable conflicts", () => {
  const error = Object.assign(new Error("unique constraint"), { code: "P2002" });
  const response = buildPublicationErrorResponse(error, 500);

  assert.equal(isRetryablePrismaTransactionConflict(error), false);
  assert.equal(asHttpErrorStatus(error, 500), 500);
  assert.deepEqual(response.body, { ok: false, error: "internal_error" });
  assert.equal(response.retryAfter, null);
});

test("preserves explicit HTTP status errors", () => {
  const error = Object.assign(new Error("unauthorized"), { status: 401 });
  const response = buildPublicationErrorResponse(error, 500);

  assert.equal(isRetryablePrismaTransactionConflict(error), false);
  assert.equal(asHttpErrorStatus(error, 500), 401);
  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { ok: false, error: "unauthorized" });
});

test("uses the supplied fallback for unknown errors", () => {
  assert.equal(asHttpErrorStatus(new Error("unexpected"), 500), 500);
});
