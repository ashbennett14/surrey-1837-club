window.surrey1837CalendarDataReady?.finally(renderHomeNextEvents);

if (!window.surrey1837CalendarDataReady) {
  renderHomeNextEvents();
}

function renderHomeNextEvents() {
  const nextEvent = document.querySelector("#homeNextEvent");
  const title = document.querySelector("#homeNextTitle");
  const meta = document.querySelector("#homeNextMeta");
  const link = document.querySelector("#homeNextLink");
  const list = document.querySelector("#homeNextList");
  const socialEvents = window.surrey1837CalendarData?.socialEvents || [];

  if (!nextEvent || !title || !meta || !link || !list || socialEvents.length === 0) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  });

  const upcoming = socialEvents
    .map((event) => ({
      ...event,
      eventDate: parseDate(event.date),
    }))
    .filter((event) => event.eventDate >= today)
    .sort((a, b) => a.eventDate - b.eventDate || a.title.localeCompare(b.title))
    .slice(0, 3);

  if (upcoming.length === 0) {
    title.textContent = "Upcoming Social Events";
    meta.textContent = "New social events and community activities will appear in the calendar.";
    list.innerHTML = `
      <a class="home-next-card" href="social-events.html">
        <span class="home-next-date"><strong>--</strong>Now</span>
        <span>
          <b>No upcoming social events listed</b>
          <span>Check the Social Events Calendar for updates</span>
        </span>
      </a>
    `;
    return;
  }

  title.textContent = "Next 3 Events";
  meta.textContent = "A quick look at the next social events and community activities.";
  link.textContent = "View Social Events";
  link.href = "social-events.html";
  list.innerHTML = upcoming.map(renderEvent).join("");

  function renderEvent(event) {
    const [day, month] = dateFormatter.format(event.eventDate).split(" ");

    return `
      <a class="home-next-card" href="social-events.html#${event.id}">
        <span class="home-next-date">
          <strong>${day}</strong>
          ${month}
        </span>
        <span>
          <b>${event.title}</b>
          <span>${event.category} · ${event.location}</span>
        </span>
      </a>
    `;
  }

  function parseDate(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
}
