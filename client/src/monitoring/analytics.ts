// Minimal analytics bootstrap (no npm install)
// Supports GA4 (VITE_GTAG_ID) and/or Plausible (VITE_PLAUSIBLE_DOMAIN)
// Auto-tracks page views in SPA by patching history pushState/replaceState

type Gtag = (...args: any[]) => void;

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: Gtag;
    plausible?: (eventName: string, options?: Record<string, any>) => void;
  }
}

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

function initGA(gtagId: string) {
  // Load GA4
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { (window.dataLayer as any[]).push(arguments as any); } as any;
  (window as any).gtag('js', new Date());

  loadScript(`https://www.googletagmanager.com/gtag/js?id=${gtagId}`)
    .then(() => {
      (window as any).gtag('config', gtagId, { send_page_view: false });
      trackPageview();
    })
    .catch((e) => console.warn('GA load failed', e));
}

function initPlausible(domain: string) {
  const attrs: Record<string, string> = {
    defer: '',
    'data-domain': domain,
    // SPA manual tracking; we call plausible('pageview') on route changes
    'data-api': '/e/plausible', // customizable if you proxy
  };
  loadScript('https://plausible.io/js/plausible.js', attrs)
    .then(() => trackPageview())
    .catch((e) => console.warn('Plausible load failed', e));
}

export function trackPageview() {
  const path = location.pathname + location.search;
  try { window.gtag?.('event', 'page_view', { page_path: path }); } catch {}
  try { window.plausible?.('pageview', { u: location.href }); } catch {}
}

function patchHistoryForSpa() {
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  function fire() {
    window.dispatchEvent(new Event('locationchange'));
  }
  history.pushState = function (...args: any[]) {
    const ret = pushState.apply(this, args as any);
    fire();
    return ret as any;
  } as any;
  history.replaceState = function (...args: any[]) {
    const ret = replaceState.apply(this, args as any);
    fire();
    return ret as any;
  } as any;
  window.addEventListener('popstate', fire);

  // Track automatically on route changes
  window.addEventListener('locationchange', () => trackPageview());
}

(function init() {
  const gtagId = (import.meta as any).env?.VITE_GTAG_ID as string | undefined;
  const plausibleDomain = (import.meta as any).env?.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!gtagId && !plausibleDomain) return; // disabled unless configured
  patchHistoryForSpa();
  if (gtagId) initGA(gtagId);
  if (plausibleDomain) initPlausible(plausibleDomain);
})();

