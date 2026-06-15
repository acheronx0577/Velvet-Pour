import { readSiteViewCount } from "@/lib/site-views/site-views-ingress";

type CpuSample = {
  user: number;
  system: number;
  time: number;
};

let prevCpu: CpuSample | null = null;

function getMemoryLimitMb() {
  const raw =
    process.env.RENDER_INSTANCE_MEMORY_MB ||
    process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE ||
    process.env.VERCEL_FUNCTION_MEMORY_SIZE ||
    "512";
  const parsed = Number.parseFloat(String(raw));
  return Number.isFinite(parsed) && parsed >= 64 ? parsed : 512;
}

function getCpuPercent() {
  const usage = process.cpuUsage();
  const now = performance.now();

  if (!prevCpu) {
    prevCpu = { user: usage.user, system: usage.system, time: now };
    return 0;
  }

  const elapsedUs = (now - prevCpu.time) * 1000;
  const totalDelta =
    usage.user - prevCpu.user + (usage.system - prevCpu.system);
  prevCpu = { user: usage.user, system: usage.system, time: now };

  if (elapsedUs <= 0) {
    return 0;
  }

  const pct = (totalDelta / elapsedUs) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 10) / 10;
}

export async function buildSystemStatsPayload() {
  const rssMb =
    Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
  const limitMb = getMemoryLimitMb();
  const memoryPercent =
    limitMb > 0
      ? Math.round(Math.min(100, (rssMb / limitMb) * 100) * 10) / 10
      : 0;

  const convexResult = await readSiteViewCount();

  return {
    viewCount: convexResult.ok ? convexResult.count : null,
    cpuPercent: getCpuPercent(),
    memoryMb: rssMb,
    memoryLimitMb: limitMb,
    memoryPercent,
    convexLive: convexResult.ok,
    uptimeSec: Math.floor(process.uptime()),
  };
}
