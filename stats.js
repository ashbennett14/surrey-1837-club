const statsKey = "surrey1837SiteStats";
const pageStats = document.querySelector("#pageStats");
const recentVisits = document.querySelector("#recentVisits");
const statsSummary = document.querySelector("#statsSummary");
const resetStats = document.querySelector("#resetStats");

function readStats() {
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

function formatDate(value) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderStats() {
  const stats = readStats();
  const pages = Object.entries(stats.pages).sort((a, b) => b[1].views - a[1].views);

  statsSummary.innerHTML = `
    <article>
      <span>${stats.totalViews}</span>
      <p>Total views</p>
    </article>
    <article>
      <span>${pages.length}</span>
      <p>Tracked pages</p>
    </article>
  `;

  pageStats.innerHTML = pages.length
    ? pages
        .map(
          ([path, page]) => `
            <div class="stats-row">
              <strong>${page.title}</strong>
              <span>${path}</span>
              <b>${page.views} views</b>
              <small>Last viewed ${formatDate(page.lastViewed)}</small>
            </div>
          `,
        )
        .join("")
    : `<p class="stats-empty">No page views have been recorded yet.</p>`;

  recentVisits.innerHTML = stats.visits.length
    ? stats.visits
        .map(
          (visit) => `
            <div class="visit-row">
              <strong>${visit.title}</strong>
              <span>${visit.path}</span>
              <small>${formatDate(visit.viewedAt)}</small>
            </div>
          `,
        )
        .join("")
    : `<p class="stats-empty">No recent visits yet.</p>`;
}

resetStats.addEventListener("click", () => {
  localStorage.removeItem(statsKey);
  renderStats();
});

renderStats();
