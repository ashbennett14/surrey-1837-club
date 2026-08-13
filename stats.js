const fallbackStatsKey = "surrey1837SiteStatsFallback";
const pageStats = document.querySelector("#pageStats");
const recentVisits = document.querySelector("#recentVisits");
const statsSummary = document.querySelector("#statsSummary");
const refreshStats = document.querySelector("#refreshStats");
const deviceStats = document.querySelector("#deviceStats");
const referrerStats = document.querySelector("#referrerStats");
const trendStats = document.querySelector("#trendStats");
const statsStatus = document.querySelector("#statsStatus");

function getConfig() {
  const config = window.SURREY1837_STATS_SUPABASE;
  if (!config?.url || !config?.anonKey) return null;
  return {
    url: config.url.replace(/\/$/, ""),
    anonKey: config.anonKey,
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

function readFallbackRows() {
  try {
    const stats = JSON.parse(localStorage.getItem(fallbackStatsKey)) || { visits: [] };
    return (stats.visits || []).map((visit) => ({
      page_path: visit.path,
      page_title: visit.title,
      device_type: visit.deviceType || "desktop",
      referrer_type: visit.referrerType || "direct",
      session_key: visit.sessionKey || `local-${visit.viewedAt}`,
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
    `${config.url}/rest/v1/site_page_views?select=page_path,page_title,device_type,referrer_type,session_key,viewed_at&order=viewed_at.desc&limit=5000`,
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

function renderTrend(rows) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
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
    <div class="stats-trend" aria-label="Views over the last 14 days">
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
  const todayViews = rows.filter((row) => new Date(row.viewed_at) >= startOfToday).length;
  const mostViewed = pages[0]?.title || "No views yet";

  statsSummary.innerHTML = `
    <article>
      <span>${rows.length}</span>
      <p>Total views</p>
    </article>
    <article>
      <span>${sessions}</span>
      <p>Estimated sessions</p>
    </article>
    <article>
      <span>${todayViews}</span>
      <p>Views today</p>
    </article>
    <article>
      <span class="stats-small-metric">${escapeHtml(mostViewed)}</span>
      <p>Most viewed page</p>
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
              <span>${escapeHtml(visit.page_path)} · ${escapeHtml(titleCase(visit.device_type))} · ${escapeHtml(titleCase(visit.referrer_type))}</span>
              <small>${formatDate(visit.viewed_at)}</small>
            </div>
          `,
        )
        .join("")
    : `<p class="stats-empty">No recent visits yet.</p>`;

  renderBreakdown(deviceStats, countBy(rows, "device_type"));
  renderBreakdown(referrerStats, countBy(rows, "referrer_type"));
  renderTrend(rows);

  statsStatus.textContent = source === "online"
    ? "Live Supabase stats loaded."
    : "Supabase stats are unavailable, so this page is showing fallback stats from this device.";
  statsStatus.dataset.state = source === "online" ? "ok" : "error";
}

async function loadStats() {
  statsStatus.textContent = "Loading stats...";
  statsStatus.dataset.state = "";
  try {
    const rows = await fetchRows();
    renderStats(rows, "online");
  } catch {
    renderStats(readFallbackRows(), "fallback");
  }
}

refreshStats.addEventListener("click", loadStats);

loadStats();
