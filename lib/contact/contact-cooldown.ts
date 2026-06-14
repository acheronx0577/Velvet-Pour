"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import {
  CONTACT_RATE_LIMIT_WINDOW_MS,
} from "./contact-rate-limit-shared.ts";

export const CONTACT_COOLDOWN_STORAGE_KEY = "ax_contact_locked_until";

export function formatContactCooldown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getLockedUntilFromRateLimitPayload(
  data: Record<string, unknown> | null | undefined,
) {
  if (!data || data.rateLimited !== true) return null;

  const lockedUntil = data.lockedUntil;
  if (typeof lockedUntil === "number" && Number.isFinite(lockedUntil)) {
    return lockedUntil;
  }

  const retryAfterSeconds = data.retryAfterSeconds;
  if (typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds)) {
    return Date.now() + retryAfterSeconds * 1000;
  }

  return Date.now() + CONTACT_RATE_LIMIT_WINDOW_MS;
}

type CooldownStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readStoredLockedUntil(
  storage: CooldownStorage | null | undefined = getSessionStorage(),
  now = Date.now(),
) {
  if (!storage) return null;

  try {
    const raw = storage.getItem(CONTACT_COOLDOWN_STORAGE_KEY);
    if (!raw) return null;

    const until = Number(raw);
    if (Number.isFinite(until) && until > now) return until;

    storage.removeItem(CONTACT_COOLDOWN_STORAGE_KEY);
  } catch {
    return null;
  }

  return null;
}

export function persistLockedUntil(
  until: number,
  storage: CooldownStorage | null | undefined = getSessionStorage(),
) {
  if (!storage) return;

  try {
    storage.setItem(CONTACT_COOLDOWN_STORAGE_KEY, String(until));
  } catch {
    // Ignore private browsing / blocked storage.
  }
}

export function clearStoredLockedUntil(
  storage: CooldownStorage | null | undefined = getSessionStorage(),
) {
  if (!storage) return;

  try {
    storage.removeItem(CONTACT_COOLDOWN_STORAGE_KEY);
  } catch {
    // Ignore private browsing / blocked storage.
  }
}

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function useContactRateLimitCooldown() {
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const commitLockedUntil = useCallback((until: number | null, now = Date.now()) => {
    if (until && until > now) {
      setLockedUntil(until);
      setRemainingMs(until - now);
      persistLockedUntil(until);
      return;
    }

    setLockedUntil(null);
    setRemainingMs(0);
    clearStoredLockedUntil();
  }, []);

  const applyRateLimit = useCallback(
    (data: Record<string, unknown>) => {
      const until = getLockedUntilFromRateLimitPayload(data);
      if (until && until > Date.now()) {
        commitLockedUntil(until);
      }
    },
    [commitLockedUntil],
  );

  const clearRateLimit = useCallback(() => {
    commitLockedUntil(null);
  }, [commitLockedUntil]);

  useLayoutEffect(() => {
    const storedUntil = readStoredLockedUntil();
    if (storedUntil) {
      commitLockedUntil(storedUntil);
    }

    let cancelled = false;

    fetch("/api/contact", { credentials: "include" })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;

        const serverUntil = getLockedUntilFromRateLimitPayload(data);
        if (serverUntil) {
          commitLockedUntil(serverUntil);
          return;
        }

        if (data.ok === true && data.rateLimited === false) {
          commitLockedUntil(null);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [commitLockedUntil]);

  useEffect(() => {
    if (!lockedUntil) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const ms = lockedUntil - Date.now();
      if (ms <= 0) {
        commitLockedUntil(null);
        return;
      }
      setRemainingMs(ms);
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [lockedUntil, commitLockedUntil]);

  const isRateLimited = lockedUntil !== null && lockedUntil > Date.now();

  return {
    isRateLimited,
    remainingMs,
    cooldownLabel: formatContactCooldown(remainingMs),
    applyRateLimit,
    clearRateLimit,
  };
}
