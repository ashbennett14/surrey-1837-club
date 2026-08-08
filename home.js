(() => {
  const nextEvent = document.querySelector("#homeNextEvent");
  const title = document.querySelector("#homeNextTitle");
  const meta = document.querySelector("#homeNextMeta");
  const link = document.querySelector("#homeNextLink");
  const socialEvents = window.surrey1837CalendarData?.socialEvents || [];

  if (!nextEvent || !title || !meta || !link || socialEvents.length === 0) {
    return;
  }

  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const upcoming = socialEvents
    .filter((event) => event.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))[0];

  if (!upcoming) {
    title.textContent = "Upcoming Social Events";
    meta.textContent = "New social events and community activities will appear in the calendar.";
    return;
  }

  const eventDate = new Date(`${upcoming.date}T00:00:00`);
  title.textContent = upcoming.title;
  meta.textContent = `${dateFormatter.format(eventDate)} · ${upcoming.category} · ${upcoming.location}`;
  link.textContent = "View Event Details";
  link.href = `social-events.html#${upcoming.id}`;
})();
