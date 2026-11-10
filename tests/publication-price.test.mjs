import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/publication-price.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { hasAtMostTwoDecimalPlaces, toPriceCents } = await import(moduleUrl);

test("converts valid EUR prices to integer cents", () => {
  assert.equal(toPriceCents(0), 0);
  assert.equal(toPriceCents(1.23), 123);
  assert.equal(toPriceCents(19.9), 1990);
  assert.equal(toPriceCents(21474836.47), 2147483647);
});

test("accepts harmless IEEE-754 representation noise", () => {
  assert.equal(hasAtMostTwoDecimalPlaces(1.23), true);
  assert.equal(hasAtMostTwoDecimalPlaces(19.9), true);
  assert.equal(toPriceCents(19.9), 1990);
});

test("rejects fractional cents instead of silently rounding them", () => {
  assert.equal(hasAtMostTwoDecimalPlaces(1.005), false);
  assert.throws(() => toPriceCents(1.005), /price_must_have_at_most_two_decimal_places/);
});

test("rejects negative and non-finite prices", () => {
  assert.throws(() => toPriceCents(-0.01), /price_must_be_finite_and_non_negative/);
  assert.throws(() => toPriceCents(Number.NaN), /price_must_be_finite_and_non_negative/);
  assert.throws(() => toPriceCents(Number.POSITIVE_INFINITY), /price_must_be_finite_and_non_negative/);
});

test("rejects values outside PostgreSQL Int minor-unit capacity", () => {
  assert.throws(() => toPriceCents(21474836.48), /price_exceeds_postgresql_int_limit/);
});
