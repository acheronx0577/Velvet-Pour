import { createHmac } from "node:crypto";

export type ContactIngressPayload = {
  name: string;
  email: string;
  message: string;
  ipHint: string;
};

type IngressMissingConfig = {
  ok: false;
  reason: "missing_config";
};

type IngressResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

const CONVEX_SITE_HOST = /\.convex\.(site|cloud)$/i;
const LOCAL_CONVEX_API_PORT = "3210";
const LOCAL_CONVEX_SITE_PORT = "3211";
const INGRESS_TIMEOUT_MS = 10_000;

export function signIpHint(ipHint: string, secret: string) {
  return createHmac("sha256", secret).update(ipHint).digest("hex");
}

function normalizeLocalConvexSiteUrl(origin: string) {
  try {
    const url = new URL(origin);
    const isLocal =
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost");
    if (isLocal && url.port === LOCAL_CONVEX_API_PORT) {
      url.port = LOCAL_CONVEX_SITE_PORT;
      return url.origin;
    }
    return origin;
  } catch {
    return origin;
  }
}

// fallow-ignore-next-line complexity
function parseConvexSiteUrl(raw: string | undefined) {
  const value = raw?.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    const isLocal =
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost");
    if (isLocal) return normalizeLocalConvexSiteUrl(url.origin);
    if (url.protocol !== "https:") return "";
    if (!CONVEX_SITE_HOST.test(url.hostname)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function getConvexSiteUrl() {
  return (
    parseConvexSiteUrl(process.env.CONVEX_SITE_URL) ||
    parseConvexSiteUrl(process.env.NEXT_PUBLIC_CONVEX_SITE_URL)
  );
}

// HTTPS Convex host validation, signed ipHint, and fetch timeout
// fallow-ignore-next-line complexity
export async function forwardContactToConvex(
  payload: ContactIngressPayload,
): Promise<IngressMissingConfig | IngressResult> {
  const base = getConvexSiteUrl();
  const secret = process.env.CONTACT_INGRESS_SECRET?.trim();
  if (!base || !secret) {
    return { ok: false, reason: "missing_config" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INGRESS_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        message: payload.message,
        ipHint: payload.ipHint,
        ipHintSignature: signIpHint(payload.ipHint, secret),
      }),
      signal: controller.signal,
    });

    const data = (await response.json()) as Record<string, unknown>;
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 504 : 500,
      data: {
        ok: false,
        error: aborted
          ? "Contact service timed out. Try again later."
          : "Could not send your message.",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
