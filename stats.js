const fallbackStatsKey = "surrey1837SiteStatsFallback";
const pageStats = document.querySelector("#pageStats");
const recentVisits = document.querySelector("#recentVisits");
const statsSummary = document.querySelector("#statsSummary");
const refreshStats = document.querySelector("#refreshStats");
const deviceStats = document.querySelector("#deviceStats");
const referrerStats = document.querySelector("#referrerStats");
const locationStats = document.querySelector("#locationStats");
const timezoneStats = document.querySelector("#timezoneStats");
const ga4LocationStats = document.querySelector("#ga4LocationStats");
const ga4LocationStatus = document.querySelector("#ga4LocationStatus");
const trendStats = document.querySelector("#trendStats");
const statsStatus = document.querySelector("#statsStatus");
const rangeControls = document.querySelectorAll("[data-range]");
let allStatsRows = [];
let activeRange = "7";
let activeStatsSource = "online";

function getConfig() {
  const config = window.SURREY1837_STATS_SUPABASE;
  if (!config?.url || !config?.anonKey) return null;
  return {
    url: config.url.replace(/\/$/, ""),
    anonKey: config.anonKey,
    ga4LocationFunction: config.ga4LocationFunction || "ga4-locations",
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDay(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function titleCase(value) {
  return String(value || "unknown").replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatLocation(value) {
  if (!value || value === "unknown") return "Unknown";
  return String(value).toUpperCase();
}

function formatTimezone(value) {
  if (!value || value === "unknown") return "Unknown";
  return String(value).replaceAll("_", " ");
}

function readFallbackRows() {
  try {
    const stats = JSON.parse(localStorage.getItem(fallbackStatsKey)) || { visits: [] };
    return (stats.visits || []).map((visit) => ({
      page_path: visit.path,
      page_title: visit.title,
      device_type: visit.deviceType || "desktop",
      referrer_type: visit.referrerType || "direct",
      session_key: visit.sessionKey || `local-${visit.viewedAt}`,
      visitor_key: visit.visitorKey || visit.sessionKey || `local-${visit.viewedAt}`,
      country_hint: visit.country_hint || "unknown",
      timezone: visit.timezone || "unknown",
      browser_locale: visit.browser_locale || "unknown",
      viewed_at: visit.viewedAt,
    }));
  } catch {
    return [];
  }
}

async function fetchRows() {
  const config = getConfig();
  if (!config) throw new Error("Supabase stats config is missing.");

  const response = await fetch(
    `${config.url}/rest/v1/site_page_views?select=page_path,page_title,device_type,referrer_type,session_key,visitor_key,country_hint,timezone,browser_locale,viewed_at&order=viewed_at.desc&limit=5000`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    },
  );

  if (!response.ok) throw new Error("Supabase stats could not be loaded.");
  return response.json();
}

async function fetchGa4Locations() {
  const config = getConfig();
  if (!config) throw new Error("Supabase stats config is missing.");

  const response = await fetch(`${config.url}/functions/v1/${config.ga4LocationFunction}`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!response.ok) throw new Error("GA4 location data could not be loaded.");
  return response.json();
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function renderBreakdown(container, counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);
  container.innerHTML = entries.length
    ? entries
        .map(
          ([label, count]) => `
            <div class="stats-breakdown-row">
              <span>${escapeHtml(titleCase(label))}</span>
              <div aria-hidden="true"><i style="width: ${(count / max) * 100}%"></i></div>
              <b>${count}</b>
            </div>
          `,
        )
        .join("")
    : `<p class="stats-empty">No data yet.</p>`;
}

function renderNamedBreakdown(container, counts, formatter = titleCase) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);
  container.innerHTML = entries.length
    ? entries
        .map(
          ([label, count]) => `
            <div class="stats-breakdown-row">
              <span>${escapeHtml(formatter(label))}</span>
              <div aria-hidden="true"><i style="width: ${(count / max) * 100}%"></i></div>
              <b>${count}</b>
            </div>
          `,
        )
        .join("")
    : `<p class="stats-empty">No data yet.</p>`;
}

function getRangeLabel() {
  if (activeRange === "all") return "all time";
  return `the last ${activeRange} days`;
}

function filterRowsByRange(rows) {
  if (activeRange === "all") return rows;
  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (Number(activeRange) - 1));
  return rows.filter((row) => new Date(row.viewed_at) >= rangeStart);
}

function renderActiveStats() {
  renderStats(filterRowsByRange(allStatsRows), activeStatsSource);
}

function renderTrend(rows) {
  const trendLength = activeRange === "7" ? 7 : 14;
  const days = Array.from({ length: trendLength }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (trendLength - 1 - index));
    return date;
  });

  const counts = days.map((day) => {
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return rows.filter((row) => {
      const viewedAt = new Date(row.viewed_at);
      return viewedAt >= day && viewedAt < next;
    }).length;
  });
  const max = Math.max(...counts, 1);

  trendStats.innerHTML = `
    <div class="stats-trend" aria-label="Views over ${getRangeLabel()}">
      ${days
        .map(
          (day, index) => `
            <div class="stats-trend-bar">
              <span style="height: ${Math.max(8, (counts[index] / max) * 100)}%" title="${counts[index]} views on ${formatDay(day)}"></span>
              <small>${formatDay(day)}</small>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderGa4Locations(data) {
  const locations = data.locations || [];
  ga4LocationStatus.textContent = locations.length
    ? `${escapeHtml(data.dateRange || "Recent activity")} from Google Analytics 4. Small volumes may be hidden or shown as “not set” by Google.`
    : "Google Analytics returned no town or city data yet.";

  ga4LocationStats.innerHTML = locations.length
    ? `
      <div class="ga4-location-head" aria-hidden="true">
        <span>Town / City</span>
        <span>Region</span>
        <span>Country</span>
        <span>Users</span>
        <span>Views</span>
      </div>
      ${locations
        .map(
          (location) => `
            <div class="ga4-location-row">
              <strong>${escapeHtml(location.city)}</strong>
              <span>${escapeHtml(location.region)}</span>
              <span>${escapeHtml(location.country)}</span>
              <b>${Number(location.activeUsers || 0).toLocaleString()}</b>
              <b>${Number(location.views || 0).toLocaleString()}</b>
            </div>
          `,
        )
        .join("")}
    `
    : "";
}

function renderGa4LocationError() {
  ga4LocationStatus.textContent = "GA4 town and city data is not available yet. Check the Supabase Edge Function secrets and deployment.";
  ga4LocationStats.innerHTML = "";
}

function renderStats(rows, source = "online") {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const pageCounts = rows.reduce((pages, row) => {
    const path = row.page_path || "index.html";
    pages[path] = pages[path] || {
      title: row.page_title || path,
      path,
      views: 0,
      lastViewed: null,
    };
    pages[path].views += 1;
    if (!pages[path].lastViewed || new Date(row.viewed_at) > new Date(pages[path].lastViewed)) {
      pages[path].lastViewed = row.viewed_at;
      pages[path].title = row.page_title || path;
    }
    return pages;
  }, {});

  const pages = Object.values(pageCounts).sort((a, b) => b.views - a.views);
  const sessions = new Set(rows.map((row) => row.session_key).filter(Boolean)).size;
  const visitors = new Set(rows.map((row) => row.visitor_key).filter(Boolean)).size;
  const todayViews = rows.filter((row) => new Date(row.viewed_at) >= startOfToday).length;
  const mostViewed = pages[0]?.title || "No views yet";
  const latestActivity = rows[0]?.viewed_at ? formatDate(rows[0].viewed_at) : "No visits yet";

  statsSummary.innerHTML = `
    <article>
      <span>${rows.length}</span>
      <p>Views in ${escapeHtml(getRangeLabel())}</p>
    </article>
    <article>
      <span>${visitors}</span>
      <p>Estimated visitors, browser-based</p>
    </article>
    <article>
      <span>${sessions}</span>
      <p>Estimated sessions, browser-based</p>
    </article>
    <article>
      <span>${todayViews}</span>
      <p>Views today</p>
    </article>
    <article>
      <span class="stats-small-metric">${escapeHtml(mostViewed)}</span>
      <p>Most viewed page</p>
    </article>
    <article>
      <span class="stats-small-metric">${escapeHtml(latestActivity)}</span>
      <p>Latest activity</p>
    </article>
  `;

  pageStats.innerHTML = pages.length
    ? pages
        .map(
          (page) => `
            <div class="stats-row">
              <strong>${escapeHtml(page.title)}</strong>
              <span>${escapeHtml(page.path)}</span>
              <b>${page.views} views</b>
              <small>Last viewed ${formatDate(page.lastViewed)}</small>
            </div>
          `,
        )
        .join("")
    : `<p class="stats-empty">No page views have been recorded yet.</p>`;

  recentVisits.innerHTML = rows.length
    ? rows
        .slice(0, 20)
        .map(
          (visit) => `
            <div class="visit-row">
              <strong>${escapeHtml(visit.page_title)}</strong>
              <span>${escapeHtml(visit.page_path)} · ${escapeHtml(titleCase(visit.device_type))} · ${escapeHtml(titleCase(visit.referrer_type))} · ${escapeHtml(formatLocation(visit.country_hint))}</span>
              <small>${formatDate(visit.viewed_at)}</small>
            </div>
          `,
        )
        .join("")
    : `<p class="stats-empty">No recent visits yet.</p>`;

  renderBreakdown(deviceStats, countBy(rows, "device_type"));
  renderBreakdown(referrerStats, countBy(rows, "referrer_type"));
  renderNamedBreakdown(locationStats, countBy(rows, "country_hint"), formatLocation);
  renderNamedBreakdown(timezoneStats, countBy(rows, "timezone"), formatTimezone);
  renderTrend(rows);

  statsStatus.textContent = source === "online"
    ? `Live Supabase anonymous page-view stats loaded for ${getRangeLabel()}.`
    : `Supabase stats are unavailable, so this page is showing local fallback stats from this device for ${getRangeLabel()}.`;
  statsStatus.dataset.state = source === "online" ? "ok" : "error";
}

async function loadStats() {
  statsStatus.textContent = "Loading stats...";
  statsStatus.dataset.state = "";
  try {
    const rows = await fetchRows();
    allStatsRows = rows;
    activeStatsSource = "online";
    renderActiveStats();
  } catch {
    allStatsRows = readFallbackRows();
    activeStatsSource = "fallback";
    renderActiveStats();
  }

  try {
    const ga4Locations = await fetchGa4Locations();
    renderGa4Locations(ga4Locations);
  } catch {
    renderGa4LocationError();
  }
}

refreshStats.addEventListener("click", loadStats);

rangeControls.forEach((button) => {
  button.addEventListener("click", () => {
    activeRange = button.dataset.range || "7";
    rangeControls.forEach((control) => {
      control.classList.toggle("is-active", control === button);
    });
    renderActiveStats();
  });
});

loadStats();
