import { createHash, timingSafeEqual } from "node:crypto";

const NUMBER_TOKEN = Symbol("python-json-number-token");

type NumberToken = { [NUMBER_TOKEN]: string };
type JsonValue = null | boolean | string | NumberToken | JsonValue[] | { [key: string]: JsonValue };

function parsePythonJson(raw: string): JsonValue {
  let index = 0;

  const skipWhitespace = () => {
    while (index < raw.length && /\s/.test(raw[index])) index += 1;
  };

  const parseString = (): string => {
    const start = index;
    if (raw[index] !== '"') throw new Error("invalid_json_string");
    index += 1;

    while (index < raw.length) {
      const character = raw[index];
      if (character === '"') {
        index += 1;
        return JSON.parse(raw.slice(start, index)) as string;
      }
      if (character === "\\") {
        index += 2;
      } else {
        index += 1;
      }
    }

    throw new Error("unterminated_json_string");
  };

  const parseNumber = (): NumberToken => {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(raw.slice(index));
    if (!match) throw new Error("invalid_json_number");
    index += match[0].length;
    return { [NUMBER_TOKEN]: match[0] };
  };

  const parseValue = (): JsonValue => {
    skipWhitespace();
    const character = raw[index];

    if (character === '"') return parseString();

    if (character === "{") {
      index += 1;
      const object: { [key: string]: JsonValue } = Object.create(null);
      skipWhitespace();
      if (raw[index] === "}") {
        index += 1;
        return object;
      }

      while (index < raw.length) {
        skipWhitespace();
        const key = parseString();
        skipWhitespace();
        if (raw[index] !== ":") throw new Error("invalid_json_object_separator");
        index += 1;
        object[key] = parseValue();
        skipWhitespace();
        if (raw[index] === "}") {
          index += 1;
          return object;
        }
        if (raw[index] !== ",") throw new Error("invalid_json_object_delimiter");
        index += 1;
      }

      throw new Error("unterminated_json_object");
    }

    if (character === "[") {
      index += 1;
      const array: JsonValue[] = [];
      skipWhitespace();
      if (raw[index] === "]") {
        index += 1;
        return array;
      }

      while (index < raw.length) {
        array.push(parseValue());
        skipWhitespace();
        if (raw[index] === "]") {
          index += 1;
          return array;
        }
        if (raw[index] !== ",") throw new Error("invalid_json_array_delimiter");
        index += 1;
      }

      throw new Error("unterminated_json_array");
    }

    if (raw.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (raw.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (raw.startsWith("null", index)) {
      index += 4;
      return null;
    }
    if (character === "-" || (character >= "0" && character <= "9")) {
      return parseNumber();
    }

    throw new Error("invalid_json_value");
  };

  const value = parseValue();
  skipWhitespace();
  if (index !== raw.length) throw new Error("trailing_json_content");
  return value;
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0)!);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0)!);
  const length = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }

  return leftPoints.length - rightPoints.length;
}

function serializePythonJson(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return `[${value.map(serializePythonJson).join(", ")}]`;
  }

  if (typeof value === "object" && NUMBER_TOKEN in value) {
    return value[NUMBER_TOKEN];
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) =>
      compareUnicodeCodePoints(left, right)
    );
    return `{${entries.map(([key, item]) =>
      `${JSON.stringify(key)}: ${serializePythonJson(item)}`
    ).join(", ")}}`;
  }

  throw new Error("unsupported_json_value");
}

/**
 * Verifies the Studio checksum contract:
 * SHA-256(json.dumps(envelope_without_checksum, ensure_ascii=False, sort_keys=True)).
 * Number tokens are retained from the raw request so Python values such as 1.0
 * are not silently changed to 1 by JavaScript's JSON.parse.
 */
export function verifyPublicationChecksum(rawBody: string): boolean {
  try {
    const parsed = parsePythonJson(rawBody);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object" || NUMBER_TOKEN in parsed) return false;
    const envelope = parsed as { [key: string]: JsonValue };

    const checksum = envelope.checksum;
    if (typeof checksum !== "string" || !/^[a-fA-F0-9]{64}$/.test(checksum)) return false;

    const envelopeWithoutChecksum: { [key: string]: JsonValue } = Object.create(null);
    for (const [key, value] of Object.entries(envelope)) {
      if (key !== "checksum") envelopeWithoutChecksum[key] = value;
    }

    const canonical = serializePythonJson(envelopeWithoutChecksum);
    const expected = createHash("sha256").update(canonical, "utf8").digest();
    const received = Buffer.from(checksum, "hex");

    return received.length === expected.length && timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}
