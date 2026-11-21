import assert from "node:assert/strict";
import test from "node:test";
import { isPublicHttpsAssetUrl } from "../src/lib/publication-asset-url.mjs";

test("accepts a public HTTPS hostname", () => {
  assert.equal(isPublicHttpsAssetUrl("https://cdn.example.com/covers/book.png"), true);
  assert.equal(isPublicHttpsAssetUrl("https://assets.example.com/media/cover.webp?version=3"), true);
});

test("rejects non-HTTPS and non-HTTP URL schemes", () => {
  for (const value of [
    "http://cdn.example.com/cover.png",
    "file:///tmp/cover.png",
    "ftp://cdn.example.com/cover.png",
    "javascript:alert(1)",
    "/storage/exports/cover.png",
    "storage/exports/cover.png",
  ]) {
    assert.equal(isPublicHttpsAssetUrl(value), false, value);
  }
});

test("rejects loopback, private, link-local and IP-literal hosts", () => {
  for (const value of [
    "https://localhost/cover.png",
    "https://localhost.localdomain/cover.png",
    "https://studio.local/cover.png",
    "https://studio.internal/cover.png",
    "https://10.0.0.8/cover.png",
    "https://172.16.0.8/cover.png",
    "https://192.168.1.8/cover.png",
    "https://127.0.0.1/cover.png",
    "https://169.254.10.20/cover.png",
    "https://[::1]/cover.png",
    "https://[fc00::1]/cover.png",
    "https://[2001:db8::1]/cover.png",
  ]) {
    assert.equal(isPublicHttpsAssetUrl(value), false, value);
  }
});

test("rejects reserved local and test-only DNS suffixes", () => {
  for (const value of [
    "https://assets.local/cover.png",
    "https://assets.home.arpa/cover.png",
    "https://assets.test/cover.png",
    "https://assets.invalid/cover.png",
    "https://assets.example/cover.png",
  ]) {
    assert.equal(isPublicHttpsAssetUrl(value), false, value);
  }
});

test("rejects credentials embedded in the asset URL", () => {
  assert.equal(isPublicHttpsAssetUrl("https://user:secret@cdn.example.com/cover.png"), false);
});
