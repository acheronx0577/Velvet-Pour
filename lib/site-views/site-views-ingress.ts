const LOCAL_CONVEX_API_PORT = "3210";
const LOCAL_CONVEX_SITE_PORT = "3211";
const INGRESS_TIMEOUT_MS = 10_000;

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
    if (/\.convex\.cloud$/i.test(url.hostname)) {
      url.hostname = url.hostname.replace(/\.convex\.cloud$/i, ".convex.site");
    } else if (!/\.convex\.site$/i.test(url.hostname)) {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

function getConvexSiteUrl() {
  return (
    parseConvexSiteUrl(process.env.CONVEX_SITE_URL) ||
    parseConvexSiteUrl(process.env.NEXT_PUBLIC_CONVEX_SITE_URL) ||
    parseConvexSiteUrl(process.env.NEXT_PUBLIC_CONVEX_URL)
  );
}

type SiteViewsResult =
  | { ok: true; count: number }
  | { ok: false; reason: "missing_config" | "upstream"; error?: string };

async function fetchSiteViews(
  path: "get" | "increment",
  method: "GET" | "POST",
): Promise<SiteViewsResult> {
  const base = getConvexSiteUrl();
  if (!base) {
    return { ok: false, reason: "missing_config" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INGRESS_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}/api/site-views/${path}`, {
      method,
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok || data.ok !== true || typeof data.count !== "number") {
      return {
        ok: false,
        reason: "upstream",
        error:
          typeof data.error === "string" ? data.error : `HTTP ${response.status}`,
      };
    }

    return { ok: true, count: data.count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "upstream", error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function readSiteViewCount() {
  return fetchSiteViews("get", "GET");
}

export async function bumpSiteViewCount() {
  return fetchSiteViews("increment", "POST");
}
