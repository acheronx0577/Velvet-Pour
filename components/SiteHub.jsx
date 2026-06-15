"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GITHUB_URL = "https://github.com/acheronx0577/Velvet-Pour";
const VIEW_SESSION_KEY = "vp_site_view_recorded";
const STATS_POLL_MS = 4_000;

function formatViewCount(value) {
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatUptime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  if (total < 60) {
    return `${total}s`;
  }
  const minutes = Math.floor(total / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
}

function metricToneClass(percent, warnAt, hotAt) {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return "";
  }
  if (percent >= hotAt) {
    return "is-hot";
  }
  if (percent >= warnAt) {
    return "is-warn";
  }
  return "";
}

function GitHubIcon() {
  return (
    <svg
      className="site-hub-github-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export default function SiteHub() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const viewRecordedRef = useRef(false);

  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch("/api/system-stats", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (data.ok === true) {
        setStats(data);
      }
    } catch {
      // Keep last known stats.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const seen =
          viewRecordedRef.current ||
          sessionStorage.getItem(VIEW_SESSION_KEY) === "1";
        if (!seen) {
          viewRecordedRef.current = true;
          await fetch("/api/site-views", { method: "POST" });
          sessionStorage.setItem(VIEW_SESSION_KEY, "1");
        }
      } catch {
        // Non-blocking analytics.
      }

      if (!cancelled) {
        await refreshStats();
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshStats]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const tick = () => {
      void refreshStats();
    };

    const immediateId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, STATS_POLL_MS);

    return () => {
      window.clearTimeout(immediateId);
      window.clearInterval(intervalId);
    };
  }, [open, refreshStats]);

  const cpu =
    typeof stats?.cpuPercent === "number" ? `${stats.cpuPercent}%` : "—";
  const memory =
    typeof stats?.memoryMb === "number" ? `${stats.memoryMb} MB` : "—";
  const convexLabel =
    stats === null ? "—" : stats.convexLive ? "Live" : "Idle";
  const convexClass =
    stats === null ? "" : stats.convexLive ? "is-ok" : "is-warn";
  const uptime =
    typeof stats?.uptimeSec === "number"
      ? formatUptime(stats.uptimeSec)
      : "—";

  const toggle = () => setOpen((value) => !value);

  return (
    <aside
      className={`site-hub${open ? " is-open" : ""}`}
      aria-label="Site metrics"
    >
      <div className="site-hub-shell">
        <button
          type="button"
          className="site-hub-toggle"
          aria-expanded={open}
          aria-controls="site-hub-panel"
          aria-label={open ? "Collapse site metrics" : "Expand site metrics"}
          data-lenis-prevent
          onClick={toggle}
        >
          <span className="site-hub-chevron" aria-hidden="true" />
        </button>

        <div
          id="site-hub-panel"
          className="site-hub-panel"
          aria-hidden={!open}
          data-lenis-prevent
        >
          <div className="site-hub-inner">
            <div className="site-hub-stack">
              <div
                className="site-hub-views-pill"
                aria-label="Website views"
                aria-live="polite"
              >
                <span className="site-hub-views-label">Website views</span>
                <span className="site-hub-views-value">
                  {formatViewCount(stats?.viewCount ?? null)}
                </span>
              </div>

              <section
                className="site-hub-metrics"
                aria-label="Server resource usage"
                aria-live="polite"
              >
                <p className="site-hub-metrics-label">Server</p>
                <dl className="site-hub-metrics-grid">
                  <div className="site-hub-metrics-row">
                    <dt>CPU</dt>
                    <dd
                      className={metricToneClass(stats?.cpuPercent, 70, 90)}
                    >
                      {cpu}
                    </dd>
                  </div>
                  <div className="site-hub-metrics-row">
                    <dt>RAM</dt>
                    <dd
                      className={metricToneClass(
                        stats?.memoryPercent,
                        75,
                        90,
                      )}
                    >
                      {memory}
                    </dd>
                  </div>
                  <div className="site-hub-metrics-row">
                    <dt>Convex</dt>
                    <dd className={convexClass}>{convexLabel}</dd>
                  </div>
                  <div className="site-hub-metrics-row">
                    <dt>Uptime</dt>
                    <dd>{uptime}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <a
              className="site-hub-github"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="View source on GitHub"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
