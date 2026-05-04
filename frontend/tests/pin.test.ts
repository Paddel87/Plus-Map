import { describe, expect, test } from "vitest";

import {
  base64ToBytes,
  bytesToBase64,
  constantTimeEqual,
  hashPin,
  PIN_ALGORITHM,
  PIN_HASH_BYTES,
  PIN_ITERATIONS,
  PIN_SALT_BYTES,
  PIN_VERSION,
  verifyPin,
  type PinRecord,
} from "@/lib/pin";

describe("PIN crypto", () => {
  test("hashPin produces a record with the documented parameters", async () => {
    const record = await hashPin("1234");
    expect(record.version).toBe(PIN_VERSION);
    expect(record.algorithm).toBe(PIN_ALGORITHM);
    expect(record.iterations).toBe(PIN_ITERATIONS);
    expect(record.fail_count).toBe(0);
    expect(typeof record.set_at).toBe("string");
    expect(base64ToBytes(record.salt_b64)).toHaveLength(PIN_SALT_BYTES);
    expect(base64ToBytes(record.hash_b64)).toHaveLength(PIN_HASH_BYTES);
  }, 20_000);

  test("verifyPin returns true for the correct PIN", async () => {
    const record = await hashPin("0815");
    expect(await verifyPin("0815", record)).toBe(true);
  }, 20_000);

  test("verifyPin returns false for a wrong PIN", async () => {
    const record = await hashPin("0815");
    expect(await verifyPin("0816", record)).toBe(false);
  }, 20_000);

  test("two hashPin calls for the same PIN produce different salts and hashes", async () => {
    const a = await hashPin("4711");
    const b = await hashPin("4711");
    expect(a.salt_b64).not.toBe(b.salt_b64);
    expect(a.hash_b64).not.toBe(b.hash_b64);
  }, 30_000);

  test("verifyPin rejects records with an unknown algorithm", async () => {
    const record = await hashPin("0000");
    const tampered: PinRecord = { ...record, algorithm: "argon2id" as never };
    await expect(verifyPin("0000", tampered)).rejects.toThrow(/Algorithmus/i);
  }, 20_000);

  test("hashPin rejects PINs that are too short or too long", async () => {
    await expect(hashPin("1")).rejects.toThrow();
    await expect(hashPin("1234567")).rejects.toThrow();
  });
});

describe("base64 helpers", () => {
  test("round-trip preserves bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe("constantTimeEqual", () => {
  test("returns true for equal arrays", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  test("returns false for arrays with different content", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  test("returns false for arrays of different length", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });
});
