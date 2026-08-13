(function () {
  const statsKey = "surrey1837SiteStatsFallback";
  const sessionKey = "surrey1837StatsSession";
  const visitorKey = "surrey1837StatsVisitor";
  const publicPages = new Set([
    "index.html",
    "social-events.html",
    "lodge-meetings.html",
    "chapter-meetings.html",
    "join-the-community.html",
    "tylers-trial.html",
  ]);

  const pagePath = window.location.pathname.split("/").pop() || "index.html";
  if (!publicPages.has(pagePath)) return;

  const now = new Date();
  const pageTitle = document.title || pagePath;

  function getConfig() {
    const config = window.SURREY1837_STATS_SUPABASE;
    if (!config?.url || !config?.anonKey) return null;
    return {
      url: config.url.replace(/\/$/, ""),
      anonKey: config.anonKey,
    };
  }

  function getSessionKey() {
    let value = sessionStorage.getItem(sessionKey);
    if (!value) {
      const random = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      value = `session-${random}`;
      sessionStorage.setItem(sessionKey, value);
    }
    return value;
  }

  function getVisitorKey() {
    let value = localStorage.getItem(visitorKey);
    if (!value) {
      const random = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      value = `visitor-${random}`;
      localStorage.setItem(visitorKey, value);
    }
    return value;
  }

  function getDeviceType() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1024;
    if (width < 720) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  }

  function getReferrerType() {
    if (!document.referrer) return "direct";

    try {
      const referrer = new URL(document.referrer);
      const current = new URL(window.location.href);
      if (referrer.hostname === current.hostname) return "internal";

      const host = referrer.hostname.replace(/^www\./, "");
      if (/(^|\.)google\.|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org/.test(host)) return "search";
      if (/facebook\.com|instagram\.com|x\.com|twitter\.com|whatsapp\.com|t\.co|linkedin\.com/.test(host)) return "social";
      return "external";
    } catch {
      return "external";
    }
  }

  function getLocationHints() {
    const locale = navigator.language || navigator.languages?.[0] || "unknown";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
    const localeParts = locale.split("-");
    const countryHint = localeParts.length > 1 ? localeParts.at(-1).toUpperCase() : "unknown";

    return {
      browser_locale: locale,
      timezone,
      country_hint: countryHint,
    };
  }

  function readFallbackStats() {
    try {
      return JSON.parse(localStorage.getItem(statsKey)) || {
        totalViews: 0,
        pages: {},
        visits: [],
      };
    } catch {
      return {
        totalViews: 0,
        pages: {},
        visits: [],
      };
    }
  }

  function saveFallbackStats() {
    const stats = readFallbackStats();
    stats.totalViews += 1;
    stats.pages[pagePath] = stats.pages[pagePath] || {
      title: pageTitle,
      views: 0,
      lastViewed: null,
    };
    stats.pages[pagePath].title = pageTitle;
    stats.pages[pagePath].views += 1;
    stats.pages[pagePath].lastViewed = now.toISOString();
    stats.visits.unshift({
      path: pagePath,
      title: pageTitle,
      deviceType: getDeviceType(),
      referrerType: getReferrerType(),
      sessionKey: getSessionKey(),
      visitorKey: getVisitorKey(),
      ...getLocationHints(),
      viewedAt: now.toISOString(),
    });
    stats.visits = stats.visits.slice(0, 100);
    localStorage.setItem(statsKey, JSON.stringify(stats));
  }

  async function trackPageView() {
    const config = getConfig();
    if (!config) {
      saveFallbackStats();
      return;
    }

    const payload = {
      page_path: pagePath,
      page_title: pageTitle,
      device_type: getDeviceType(),
      referrer_type: getReferrerType(),
      session_key: getSessionKey(),
      visitor_key: getVisitorKey(),
      ...getLocationHints(),
      viewed_at: now.toISOString(),
    };

    try {
      const response = await fetch(`${config.url}/rest/v1/site_page_views`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Stats insert failed");
    } catch {
      saveFallbackStats();
    }
  }

  trackPageView();
})();
