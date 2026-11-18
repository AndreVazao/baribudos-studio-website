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
  assertAdminKey,
  assertStudioApiKey,
} = await import(moduleUrl);

function requestWithHeader(name, value) {
  return new Request("http://localhost", {
    headers: { [name]: value },
  });
}

function restoreEnvironment(name, previous) {
  if (previous === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previous;
  }
}

test("Studio API key accepts the configured secret and rejects a mismatch", () => {
  const previous = process.env.STUDIO_PUBLISH_API_KEY;
  process.env.STUDIO_PUBLISH_API_KEY = "studio-secret-test-value";

  try {
    assert.doesNotThrow(() =>
      assertStudioApiKey(requestWithHeader("x-studio-api-key", "studio-secret-test-value"))
    );
    assert.throws(
      () => assertStudioApiKey(requestWithHeader("x-studio-api-key", "studio-secret-test-valuf")),
      (error) => error.status === 401
    );
  } finally {
    restoreEnvironment("STUDIO_PUBLISH_API_KEY", previous);
  }
});

test("admin API key uses the same protected comparison path", () => {
  const previous = process.env.ADMIN_PANEL_KEY;
  process.env.ADMIN_PANEL_KEY = "admin-secret-test-value";

  try {
    assert.doesNotThrow(() =>
      assertAdminKey(requestWithHeader("x-admin-key", "admin-secret-test-value"))
    );
    assert.throws(
      () => assertAdminKey(requestWithHeader("x-admin-key", "admin-secret-test-valuf")),
      (error) => error.status === 401
    );
  } finally {
    restoreEnvironment("ADMIN_PANEL_KEY", previous);
  }
});

test("missing configured secrets fail closed", () => {
  const previous = process.env.STUDIO_PUBLISH_API_KEY;
  delete process.env.STUDIO_PUBLISH_API_KEY;

  try {
    assert.throws(
      () => assertStudioApiKey(requestWithHeader("x-studio-api-key", "any-value")),
      (error) => error.status === 401
    );
  } finally {
    restoreEnvironment("STUDIO_PUBLISH_API_KEY", previous);
  }
});

test("missing admin secrets fail closed", () => {
  const previous = process.env.ADMIN_PANEL_KEY;
  const fallback = process.env.STUDIO_ADMIN_PANEL_KEY;
  delete process.env.ADMIN_PANEL_KEY;
  delete process.env.STUDIO_ADMIN_PANEL_KEY;

  try {
    assert.throws(
      () => assertAdminKey(requestWithHeader("x-admin-key", "any-value")),
      (error) => error.status === 401
    );
  } finally {
    restoreEnvironment("ADMIN_PANEL_KEY", previous);
    restoreEnvironment("STUDIO_ADMIN_PANEL_KEY", fallback);
  }
});
