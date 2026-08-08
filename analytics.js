(function () {
  const statsKey = "surrey1837SiteStats";
  const now = new Date();
  const pageName = document.title || window.location.pathname.split("/").pop() || "Page";
  const path = window.location.pathname.split("/").pop() || "index.html";

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

  const stats = readStats();
  stats.totalViews += 1;
  stats.pages[path] = stats.pages[path] || {
    title: pageName,
    views: 0,
    lastViewed: null,
  };
  stats.pages[path].title = pageName;
  stats.pages[path].views += 1;
  stats.pages[path].lastViewed = now.toISOString();
  stats.visits.unshift({
    path,
    title: pageName,
    viewedAt: now.toISOString(),
  });
  stats.visits = stats.visits.slice(0, 50);

  localStorage.setItem(statsKey, JSON.stringify(stats));
})();
