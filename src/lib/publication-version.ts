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

export function assertPublicationVersionCanReplace(
  current: StudioPublicationVersion | null | undefined,
  incoming: StudioPublicationVersion,
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
    const currentChecksum = normalizeChecksum(current?.checksum);
    if (!currentChecksum || currentChecksum !== incomingChecksum) {
      throw new PublicationVersionConflictError("publication_version_checksum_conflict");
    }
  }
}
