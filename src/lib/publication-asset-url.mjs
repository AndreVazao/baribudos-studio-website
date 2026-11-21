import { isIP } from "node:net";

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home",
  ".home.arpa",
  ".lan",
  ".test",
  ".invalid",
  ".example",
  ".arpa",
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
]);

/**
 * Accept only HTTPS URLs with a DNS hostname suitable for a public catalogue.
 *
 * This is an intake-format guard, not an SSRF boundary: it does not resolve DNS
 * or follow redirects. Any future server-side asset fetch must independently
 * validate every resolved address and redirect target.
 */
export function isPublicHttpsAssetUrl(value) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    return false;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");

  if (!hostname || !hostname.includes(".")) {
    return false;
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return false;
  }

  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return false;
  }

  // Public assets should use a stable DNS name, not a literal IP address.
  // This rejects loopback, RFC1918, link-local and IPv6 literals uniformly.
  if (isIP(hostname) !== 0) {
    return false;
  }

  return true;
}
