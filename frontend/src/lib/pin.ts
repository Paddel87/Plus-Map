/**
 * Client-side PIN hashing per ADR-023.
 *
 * Algorithm: PBKDF2-SHA-256, 600.000 Iterationen, 16-Byte-Salt, 32-Byte-Output.
 * Storage layout in {@link PinRecord}.
 *
 * Schutzziel: UI-Sperre gegen Schulterblick. Nicht gegen forensischen Zugriff
 * auf das entsperrte Gerät — siehe ADR-023 §Schutzziel.
 */

export const PIN_VERSION = 1;
export const PIN_ALGORITHM = "PBKDF2-SHA256";
export const PIN_ITERATIONS = 600_000;
export const PIN_SALT_BYTES = 16;
export const PIN_HASH_BYTES = 32;
export const PIN_FAIL_LIMIT = 5;

export interface PinRecord {
  version: number;
  algorithm: typeof PIN_ALGORITHM;
  iterations: number;
  salt_b64: string;
  hash_b64: string;
  fail_count: number;
  set_at: string;
}

function getSubtle(): SubtleCrypto {
  if (typeof globalThis === "undefined" || !globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API ist im aktuellen Kontext nicht verfügbar.");
  }
  return globalThis.crypto.subtle;
}

function getRandomValues(target: Uint8Array): Uint8Array {
  if (typeof globalThis === "undefined" || !globalThis.crypto?.getRandomValues) {
    throw new Error("crypto.getRandomValues ist nicht verfügbar.");
  }
  globalThis.crypto.getRandomValues(target);
  return target;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof btoa === "function") return btoa(binary);
  // Node-Fallback (für Tests).
  return Buffer.from(binary, "binary").toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary =
    typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function deriveBits(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = getSubtle();
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    key,
    PIN_HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** Build a fresh {@link PinRecord} from a plain PIN. */
export async function hashPin(pin: string): Promise<PinRecord> {
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error("PIN muss zwischen 4 und 6 Zeichen lang sein.");
  }
  const salt = getRandomValues(new Uint8Array(PIN_SALT_BYTES));
  const hash = await deriveBits(pin, salt, PIN_ITERATIONS);
  return {
    version: PIN_VERSION,
    algorithm: PIN_ALGORITHM,
    iterations: PIN_ITERATIONS,
    salt_b64: bytesToBase64(salt),
    hash_b64: bytesToBase64(hash),
    fail_count: 0,
    set_at: new Date().toISOString(),
  };
}

/** Constant-time comparison of the candidate PIN against a stored record. */
export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  if (record.algorithm !== PIN_ALGORITHM) {
    throw new Error(`Unbekannter PIN-Algorithmus: ${record.algorithm}`);
  }
  const salt = base64ToBytes(record.salt_b64);
  const expected = base64ToBytes(record.hash_b64);
  const candidate = await deriveBits(pin, salt, record.iterations);
  return constantTimeEqual(expected, candidate);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
