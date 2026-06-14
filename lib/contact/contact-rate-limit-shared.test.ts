import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTACT_RATE_LIMIT_MAX,
  saturateContactRateTimestamps,
} from "./contact-rate-limit-shared.ts";

describe("saturateContactRateTimestamps", () => {
  it("pads sparse timestamps to the window maximum", () => {
    const now = Date.now();
    const saturated = saturateContactRateTimestamps([now - 1000], now);

    assert.equal(saturated.length, CONTACT_RATE_LIMIT_MAX);
  });

  it("leaves a full window unchanged", () => {
    const now = Date.now();
    const full = [now - 3000, now - 2000, now - 1000];
    assert.deepEqual(saturateContactRateTimestamps(full, now), full);
  });
});
