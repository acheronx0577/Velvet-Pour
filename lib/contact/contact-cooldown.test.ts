import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTACT_COOLDOWN_STORAGE_KEY,
  clearStoredLockedUntil,
  formatContactCooldown,
  getLockedUntilFromRateLimitPayload,
  persistLockedUntil,
  readStoredLockedUntil,
} from "./contact-cooldown.ts";

class MemoryStorage {
  #values = new Map<string, string>();

  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.#values.set(key, value);
  }

  removeItem(key: string) {
    this.#values.delete(key);
  }
}

describe("formatContactCooldown", () => {
  it("formats minutes and zero-padded seconds", () => {
    assert.equal(formatContactCooldown(15 * 60 * 1000), "15:00");
    assert.equal(formatContactCooldown(90_500), "1:31");
    assert.equal(formatContactCooldown(0), "0:00");
  });
});

describe("getLockedUntilFromRateLimitPayload", () => {
  it("returns null when not rate limited", () => {
    assert.equal(getLockedUntilFromRateLimitPayload({ ok: true }), null);
  });

  it("prefers lockedUntil from the API", () => {
    assert.equal(
      getLockedUntilFromRateLimitPayload({
        rateLimited: true,
        lockedUntil: 1_700_000_000_000,
      }),
      1_700_000_000_000,
    );
  });

  it("derives lockedUntil from retryAfterSeconds", () => {
    const until = getLockedUntilFromRateLimitPayload({
      rateLimited: true,
      retryAfterSeconds: 120,
    });

    assert.ok(until);
    assert.ok(until >= Date.now() + 119_000);
    assert.ok(until <= Date.now() + 121_000);
  });
});

describe("contact cooldown storage", () => {
  it("restores a future lock timestamp from session storage", () => {
    const storage = new MemoryStorage();
    const until = Date.now() + 120_000;
    persistLockedUntil(until, storage);

    assert.equal(readStoredLockedUntil(storage), until);
  });

  it("drops expired lock timestamps from session storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(CONTACT_COOLDOWN_STORAGE_KEY, String(Date.now() - 1_000));

    assert.equal(readStoredLockedUntil(storage), null);
    assert.equal(storage.getItem(CONTACT_COOLDOWN_STORAGE_KEY), null);
  });

  it("clears stored lock timestamps", () => {
    const storage = new MemoryStorage();
    persistLockedUntil(Date.now() + 60_000, storage);
    clearStoredLockedUntil(storage);

    assert.equal(storage.getItem(CONTACT_COOLDOWN_STORAGE_KEY), null);
  });
});
