// Lightweight Sentry bootstrap via CDN (no npm install)
// Controlled by VITE_SENTRY_DSN; no-ops when not set

const SENTRY_CDN = "https://browser.sentry-cdn.com/7.114.0/bundle.min.js";

function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function initSentry() {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return; // disabled by default unless DSN provided

  loadScript(SENTRY_CDN, { crossorigin: "anonymous" })
    .then(() => {
      const w = window as any;
      if (!w.Sentry) return;
      try {
        w.Sentry.init({
          dsn,
          environment: (import.meta as any).env?.MODE || "development",
          // Keep it simple; tracing can be added later if desired
          tracesSampleRate: Number((import.meta as any).env?.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
        });

        // Capture unhandled errors by default
        window.addEventListener("error", (e) => {
          try { w.Sentry?.captureException?.(e.error || e.message || e); } catch {}
        });
        window.addEventListener("unhandledrejection", (e) => {
          try { w.Sentry?.captureException?.(e.reason || e); } catch {}
        });
        // Optional: breadcrumb on route changes (emits custom event in analytics.ts)
        window.addEventListener("locationchange", () => {
          try { w.Sentry?.addBreadcrumb?.({ category: "navigation", message: location.pathname }); } catch {}
        });
      } catch (err) {
        console.warn("Sentry init error", err);
      }
    })
    .catch((err) => console.warn("Sentry CDN load failed", err));
}

initSentry();

