/**
 * IndexedDB persistence for the App-PIN (ADR-023 §Storage-Layout).
 *
 * Database: ``plusmap-pin``, store: ``pin``, key: ``pin_v1``. Schema is
 * versioned via {@link PinRecord.version} so a later migration to
 * Argon2id (ADR-023 §Späterer Algorithmus-Wechsel) can keep the old
 * record verifiable while writing the new one.
 */

import type { PinRecord } from "@/lib/pin";

const DB_NAME = "plusmap-pin";
const DB_VERSION = 1;
const STORE = "pin";
const KEY = "pin_v1";

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB ist im aktuellen Browser nicht verfügbar."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB konnte nicht geöffnet werden."));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed."));
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("IndexedDB transaction failed."));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("IndexedDB transaction aborted."));
        };
      }),
  );
}

export async function loadPinRecord(): Promise<PinRecord | null> {
  if (!isIndexedDBAvailable()) return null;
  const result = await withStore<PinRecord | undefined>(
    "readonly",
    (store) => store.get(KEY) as IDBRequest<PinRecord | undefined>,
  );
  return result ?? null;
}

export async function savePinRecord(record: PinRecord): Promise<void> {
  await withStore<IDBValidKey>("readwrite", (store) => store.put(record, KEY));
}

export async function clearPinRecord(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  await withStore<undefined>("readwrite", (store) => store.delete(KEY) as IDBRequest<undefined>);
}

export async function updateFailCount(record: PinRecord, failCount: number): Promise<PinRecord> {
  const next: PinRecord = { ...record, fail_count: failCount };
  await savePinRecord(next);
  return next;
}
