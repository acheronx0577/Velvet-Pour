import { createHash } from "node:crypto";

/** Trust platform forwarding headers (Vercel auto; override with TRUST_PROXY_HEADERS). */
function trustsProxyHeaders() {
  const override = process.env.TRUST_PROXY_HEADERS?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  // Vercel strips spoofed client-supplied forwarding headers at the edge.
  return process.env.VERCEL === "1";
}

function firstForwardedIp(raw: string | null) {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

function readTrustedProxyIp(request: Request) {
  const vercelIp = firstForwardedIp(
    request.headers.get("x-vercel-forwarded-for"),
  );
  if (vercelIp) return vercelIp;

  const forwardedIp = firstForwardedIp(request.headers.get("x-forwarded-for"));
  if (forwardedIp) return forwardedIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

function clientFingerprint(request: Request) {
  const material = [
    request.headers.get("user-agent") ?? "",
    request.headers.get("accept-language") ?? "",
    request.headers.get("sec-ch-ua") ?? "",
  ].join("|");
  const digest = createHash("sha256").update(material).digest("hex").slice(0, 16);
  return `fp:${digest}`;
}

export function getClientIp(request: Request) {
  if (trustsProxyHeaders()) {
    const proxyIp = readTrustedProxyIp(request);
    if (proxyIp) return proxyIp;
  }

  return clientFingerprint(request);
}
