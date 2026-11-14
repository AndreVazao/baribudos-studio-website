export type StudioPublicationVersion = {
  project_version?: unknown;
  checksum?: unknown;
};

export class PublicationVersionConflictError extends Error {
  readonly status = 409;
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PublicationVersionConflictError";
    this.code = code;
  }
}

function parseIsoInstantNanoseconds(value: unknown): bigint | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const normalized = value.trim();
  const milliseconds = Date.parse(normalized);
  if (!Number.isFinite(milliseconds)) return null;

  const fractional = normalized.match(/\.(\d+)(?=Z|[+-]\d{2}:\d{2}$)/i)?.[1] ?? "";
  const nanosecondFraction = fractional.padEnd(9, "0").slice(0, 9);
  const subMillisecondNanoseconds = BigInt(nanosecondFraction.slice(3).padEnd(6, "0") || "0");

  return BigInt(milliseconds) * 1_000_000n + subMillisecondNanoseconds;
}

function normalizeChecksum(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value) ?? "undefined";
}

export function assertPublicationVersionCanReplace(
  current: StudioPublicationVersion | null | undefined,
  incoming: StudioPublicationVersion,
  currentPayload?: unknown,
  incomingPayload?: unknown,
): void {
  const incomingVersion = parseIsoInstantNanoseconds(incoming.project_version);
  const incomingChecksum = normalizeChecksum(incoming.checksum);

  if (incomingVersion === null) {
    throw new PublicationVersionConflictError("invalid_project_version");
  }
  if (!/^[a-f0-9]{64}$/.test(incomingChecksum)) {
    throw new PublicationVersionConflictError("invalid_publication_checksum");
  }

  const currentVersionValue = current?.project_version;
  if (currentVersionValue === undefined || currentVersionValue === null || currentVersionValue === "") {
    return;
  }

  const currentVersion = parseIsoInstantNanoseconds(currentVersionValue);
  if (currentVersion === null) {
    throw new PublicationVersionConflictError("stored_project_version_invalid");
  }

  if (incomingVersion < currentVersion) {
    throw new PublicationVersionConflictError("stale_publication_version");
  }

  if (incomingVersion === currentVersion) {
    // published_at is generated for each delivery and is included in the
    // envelope checksum. Compare the frozen editorial payload, not that
    // delivery timestamp, so a legitimate republish/retry remains idempotent.
    if (currentPayload === undefined || incomingPayload === undefined ||
        stableJson(currentPayload) !== stableJson(incomingPayload)) {
      throw new PublicationVersionConflictError("publication_version_payload_conflict");
    }
  }
}
