window.surrey1837CalendarDataReady?.finally(renderHomeEvents);

if (!window.surrey1837CalendarDataReady) {
  renderHomeEvents();
}

function renderHomeEvents() {
  renderFeatured1837Event();
  renderHomeNextEvents();
}

function renderFeatured1837Event() {
  const featuredEvent = document.querySelector("#homeFeaturedEvent");
  const title = document.querySelector("#homeFeaturedTitle");
  const meta = document.querySelector("#homeFeaturedMeta");
  const card = document.querySelector("#homeFeaturedCard");
  const socialEvents = getUpcomingSocialEvents();

  if (!featuredEvent || !title || !meta || !card) {
    return;
  }

  const officialEvent = socialEvents.find((event) => event.category === "1837 Club Event");

  if (!officialEvent) {
    title.textContent = "Next Official Club Event";
    meta.textContent = "Official 1837 Club social events will appear here when they are added.";
    card.innerHTML = `
      <a class="home-featured-link" href="social-events.html">
        <span class="home-featured-date">Soon</span>
        <span>
          <b>No official Club event listed yet</b>
          <span>View the Social Events Calendar for the full programme.</span>
        </span>
      </a>
    `;
    return;
  }

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  title.textContent = officialEvent.title;
  meta.textContent = `${dateFormatter.format(officialEvent.eventDate)} · ${officialEvent.location}`;
  card.innerHTML = `
    <a class="home-featured-link" href="social-events.html#${officialEvent.id}">
      <span class="home-featured-date">${dateFormatter.format(officialEvent.eventDate)}</span>
      <span>
        <b>${officialEvent.category}</b>
        <span>${officialEvent.description || "Open the calendar for full details."}</span>
      </span>
    </a>
  `;
}

function renderHomeNextEvents() {
  const nextEvent = document.querySelector("#homeNextEvent");
  const title = document.querySelector("#homeNextTitle");
  const meta = document.querySelector("#homeNextMeta");
  const link = document.querySelector("#homeNextLink");
  const list = document.querySelector("#homeNextList");
  const socialEvents = getUpcomingSocialEvents();

  if (!nextEvent || !title || !meta || !link || !list || socialEvents.length === 0) {
    return;
  }

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  });

  const upcoming = socialEvents.slice(0, 3);

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
}

function getUpcomingSocialEvents() {
  const socialEvents = window.surrey1837CalendarData?.socialEvents || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return socialEvents
    .map((event) => ({
      ...event,
      eventDate: parseDate(event.date),
    }))
    .filter((event) => event.eventDate >= today)
    .sort((a, b) => a.eventDate - b.eventDate || a.title.localeCompare(b.title));
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
