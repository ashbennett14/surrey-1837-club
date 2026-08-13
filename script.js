const fallbackCalendarData = {
  socialEvents: [],
  lodgeEvents: [],
  chapterEvents: [],
};

window.surrey1837CalendarData = window.surrey1837ManagedCalendarData || fallbackCalendarData;

function normalizeManagedEvent(event, calendarType) {
  const managedEvent = { ...event };
  const isMeeting = calendarType === "lodge" || calendarType === "chapter";

  managedEvent.id = managedEvent.id || createManagedEventId(managedEvent);
  managedEvent.type = calendarType;
  managedEvent.time = managedEvent.time || (isMeeting ? "TBC" : "");
  managedEvent.location = managedEvent.location || "TBC";
  managedEvent.host =
    managedEvent.host ||
    (isMeeting
      ? `${managedEvent.lodgeName || managedEvent.title || "Meeting"}${
          managedEvent.lodgeNumber ? ` No. ${managedEvent.lodgeNumber}` : ""
        }`
      : "Surrey 1837 Club");
  managedEvent.tags = Array.isArray(managedEvent.tags)
    ? managedEvent.tags
    : String(managedEvent.tags || "")
        .split("|")
        .map((tag) => tag.trim())
        .filter(Boolean);
  managedEvent.description =
    managedEvent.description ||
    (isMeeting
      ? `${managedEvent.host} meeting in ${managedEvent.location}${
          managedEvent.degree ? ` for ${managedEvent.degree}.` : "."
        }`
      : "");

  if (isMeeting) {
    managedEvent.lodgeName = managedEvent.lodgeName || managedEvent.title || managedEvent.host;
    managedEvent.lodgeNumber = managedEvent.lodgeNumber || "";
    managedEvent.degree = managedEvent.degree || "Other";
    managedEvent.title = managedEvent.title || managedEvent.lodgeName;
    managedEvent.posterAlt =
      managedEvent.posterAlt ||
      `${managedEvent.lodgeName}${managedEvent.lodgeNumber ? ` No. ${managedEvent.lodgeNumber}` : ""} crest`;
    if (managedEvent.tags.length === 0) {
      managedEvent.tags = [
        managedEvent.degree,
        managedEvent.lodgeNumber ? `No. ${managedEvent.lodgeNumber}` : "",
        managedEvent.location,
      ].filter(Boolean);
    }
  } else {
    managedEvent.category = managedEvent.category || "Community Event";
    managedEvent.posterAlt = managedEvent.posterAlt || `${managedEvent.title} poster`;
    if (managedEvent.tags.length === 0) {
      managedEvent.tags = [managedEvent.category, managedEvent.location].filter(Boolean);
    }
  }

  return managedEvent;
}

function createManagedEventId(event) {
  return [event.date, event.title || event.lodgeName || event.host || "event"]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mergeManagedCalendarEvents(managedData) {
  const nextData = {
    socialEvents: [...fallbackCalendarData.socialEvents],
    lodgeEvents: [...fallbackCalendarData.lodgeEvents],
    chapterEvents: [...fallbackCalendarData.chapterEvents],
  };

  ["socialEvents", "lodgeEvents", "chapterEvents"].forEach((key) => {
    const managedEvents = Array.isArray(managedData?.[key]) ? managedData[key] : [];
    const calendarType = key.replace("Events", "");
    const merged = new Map(nextData[key].map((event) => [event.id, event]));

    managedEvents
      .map((event) => normalizeManagedEvent(event, calendarType))
      .forEach((event) => merged.set(event.id, event));

    nextData[key] = [...merged.values()];
  });

  window.surrey1837CalendarData = nextData;
  return nextData;
}

async function loadManagedCalendarEvents() {
  if (window.surrey1837ManagedCalendarData) {
    mergeManagedCalendarEvents(window.surrey1837ManagedCalendarData);
  }

  try {
    if (window.location.protocol === "file:") {
      return window.surrey1837CalendarData;
    }

    const response = await fetch("calendar-events.json", { cache: "no-cache" });
    if (!response.ok) {
      return window.surrey1837CalendarData;
    }

    const managedData = await response.json();
    return mergeManagedCalendarEvents(managedData);
  } catch (error) {
    console.warn("Managed calendar events could not be loaded.", error);
    return window.surrey1837CalendarData;
  }
}

window.surrey1837CalendarDataReady = loadManagedCalendarEvents();

function initializeCalendarPage() {
const today = new Date();
const todayKey = toKey(today);
const calendarType = document.body.dataset.calendar || "social";
const calendarData = window.surrey1837CalendarData || fallbackCalendarData;
const calendarConfig = {
  social: {
    events: calendarData.socialEvents,
    initialDate: new Date(today.getFullYear(), today.getMonth(), 1),
  },
  lodge: {
    events: calendarData.lodgeEvents,
    initialDate: new Date(today.getFullYear(), today.getMonth(), 1),
  },
  chapter: {
    events: calendarData.chapterEvents,
    initialDate: new Date(today.getFullYear(), today.getMonth(), 1),
  },
};

const selectedCalendar = calendarConfig[calendarType] || calendarConfig.social;
const events = selectedCalendar.events;

const calendarGrid = document.querySelector("#calendarGrid");
const monthLabel = document.querySelector("#monthLabel");
const eventCount = document.querySelector("#eventCount");
const meetingTypeFilter = document.querySelector("#meetingTypeFilter");
const meetingLocationFilter = document.querySelector("#meetingLocationFilter");
const socialCategoryFilter = document.querySelector("#socialCategoryFilter");
const calendarSearch = document.querySelector("#calendarSearch");
const calendarEmptyMessage = document.querySelector("#calendarEmptyMessage");
const emptyState = document.querySelector("#emptyState");
const eventDetails = document.querySelector("#eventDetails");
const detailsPanel = document.querySelector("#detailsPanel");

const detailDate = document.querySelector("#detailDate");
const detailTitle = document.querySelector("#detailTitle");
const detailTime = document.querySelector("#detailTime");
const detailLocation = document.querySelector("#detailLocation");
const detailHost = document.querySelector("#detailHost");
const detailDescription = document.querySelector("#detailDescription");
const detailTags = document.querySelector("#detailTags");
const detailPoster = document.querySelector("#detailPoster");
const posterLightbox = createPosterLightbox();

let activeDate = selectedCalendar.initialDate;
let selectedEventId = null;
let activeMeetingType = "";
let activeMeetingLocation = "";
let activeSocialCategory = "";
let activeSearchTerm = "";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

function toKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseLocalDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function matchesActiveFilters(event) {
  const matchesSearch = matchesCalendarSearch(event);
  const matchesCategory =
    calendarType !== "social" ||
    !activeSocialCategory ||
    event.category === activeSocialCategory;
  const matchesType =
    (calendarType !== "lodge" && calendarType !== "chapter") ||
    !activeMeetingType ||
    (event.degree || "")
      .split(" & ")
      .map((degree) => degree.trim())
      .includes(activeMeetingType);
  const matchesLocation =
    (calendarType !== "lodge" && calendarType !== "chapter") ||
    !activeMeetingLocation || event.location === activeMeetingLocation;

  return matchesSearch && matchesCategory && matchesType && matchesLocation;
}

function matchesCalendarSearch(event) {
  if (!activeSearchTerm) {
    return true;
  }

  const sharedFields = [
    event.title,
    event.location,
    event.host,
    ...(Array.isArray(event.tags) ? event.tags : []),
  ];
  const searchableFields =
    calendarType === "social"
      ? [...sharedFields, event.category]
      : [...sharedFields, event.lodgeName, event.lodgeNumber, event.degree];

  return searchableFields
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(activeSearchTerm));
}

function resetDetails() {
  selectedEventId = null;
  eventDetails.classList.add("hidden");
  emptyState.classList.remove("hidden");
}

function getEmptyMessage() {
  if (calendarType === "social") {
    if (activeSearchTerm) {
      return "No social events match that search this month. Try a different search or move to another month.";
    }
    return activeSocialCategory
      ? "No events match this category this month. Try another category or move to a different month."
      : "No social events are listed for this month. Try moving to the next month.";
  }

  if (calendarType === "chapter") {
    if (activeSearchTerm) {
      return "No chapter meetings match that search this month. Try a different search or move to another month.";
    }
    return activeMeetingType || activeMeetingLocation
      ? "No chapter meetings match these filters this month. Try changing the type or location."
      : "No chapter meetings are listed for this month. Try moving to the next month.";
  }

  if (activeSearchTerm) {
    return "No lodge meetings match that search this month. Try a different search or move to another month.";
  }

  if (activeMeetingType || activeMeetingLocation) {
    return "No lodge meetings match these filters this month. Try changing the type or location.";
  }

  return "No lodge meetings are listed for this month. Try moving to the next month.";
}

function renderCalendar() {
  const visibleDays = getMonthDays(activeDate);
  const activeMonth = activeDate.getMonth();
  const activeYear = activeDate.getFullYear();
  const monthlyEvents = events.filter((event) => {
    const eventDate = parseLocalDate(event.date);
    return (
      eventDate.getMonth() === activeMonth &&
      eventDate.getFullYear() === activeYear &&
      matchesActiveFilters(event)
    );
  });

  monthLabel.textContent = monthFormatter.format(activeDate);
  const countLabel = calendarType === "social" ? "event" : "meeting";
  eventCount.textContent =
    `${monthlyEvents.length} ${countLabel}${monthlyEvents.length === 1 ? "" : "s"}`;
  if (calendarEmptyMessage) {
    calendarEmptyMessage.textContent = getEmptyMessage();
    calendarEmptyMessage.hidden = monthlyEvents.length > 0;
  }
  calendarGrid.innerHTML = "";

  visibleDays.forEach((day) => {
    const dateKey = toKey(day);
    const dayEvents =
      day.getMonth() === activeMonth
        ? events.filter((event) => event.date === dateKey && matchesActiveFilters(event))
        : [];
    const cell = document.createElement("section");
    cell.className = "day-cell";
    cell.setAttribute("aria-label", dateFormatter.format(day));

    if (day.getMonth() !== activeMonth) {
      cell.classList.add("outside");
    }

    if (dateKey < todayKey) {
      cell.classList.add("past");
    }

    if (dateKey === todayKey) {
      cell.classList.add("today");
    }

    cell.innerHTML = `
      <div class="day-number">
        <span>${day.getDate()}</span>
      </div>
      <div class="event-list"></div>
    `;

    const list = cell.querySelector(".event-list");

    dayEvents.forEach((event) => {
      const isMeetingEvent = event.type === "lodge" || event.type === "chapter";
      const button = document.createElement("button");
      button.className = isMeetingEvent ? "event-pill lodge-event" : "event-pill";
      button.type = "button";
      button.dataset.eventId = event.id;
      button.dataset.type = event.type;
      button.dataset.degree = event.degree || "";
      button.dataset.category = event.category || "";
      if (event.date < todayKey) {
        button.classList.add("past-event");
      }
      button.setAttribute("aria-pressed", event.id === selectedEventId ? "true" : "false");

      if (isMeetingEvent) {
        button.innerHTML = `
          <span class="lodge-event-name">${event.lodgeName}</span>
          <span class="lodge-event-number">No. ${event.lodgeNumber}</span>
          <span class="lodge-event-location">${event.location}</span>
          <span class="degree-badge" data-degree="${event.degree}">${event.degree}</span>
        `;
      } else {
        button.classList.add("social-event");
        button.innerHTML = `
          <span class="social-event-title">${event.title}</span>
          <span class="category-badge" data-category="${event.category}">${event.category}</span>
        `;
      }

      button.addEventListener("click", () => selectEvent(event.id));
      list.append(button);
    });

    calendarGrid.append(cell);
  });

  if (window.prepareMotion) {
    window.prepareMotion(calendarGrid);
  }

}

function selectEvent(eventId) {
  const event = events.find((item) => item.id === eventId);

  if (!event) {
    return;
  }

  selectedEventId = eventId;
  const eventDate = parseLocalDate(event.date);

  emptyState.classList.add("hidden");
  eventDetails.classList.remove("hidden");
  eventDetails.dataset.eventType = event.type || "";
  detailDate.textContent = dateFormatter.format(eventDate);
  detailTitle.textContent = event.title;
  detailTime.textContent = event.time;
  detailLocation.textContent = event.location;
  detailHost.textContent = event.host;
  detailDescription.textContent = event.description;
  detailTags.innerHTML = "";
  detailPoster.classList.toggle("hidden", !event.poster);

  if (event.poster) {
    detailPoster.src = event.poster;
    detailPoster.alt = event.posterAlt || `${event.title} poster`;
    detailPoster.tabIndex = 0;
    detailPoster.setAttribute("role", "button");
    detailPoster.setAttribute("aria-label", `Open larger image for ${event.title}`);
  }

  event.tags.forEach((tag) => {
    const tagElement = document.createElement("span");
    tagElement.textContent = tag;
    detailTags.append(tagElement);
  });

  renderCalendar();

  if (window.matchMedia("(max-width: 980px)").matches) {
    detailsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.querySelector("#prevMonth").addEventListener("click", () => {
  activeDate = new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  activeDate = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelector("#todayButton").addEventListener("click", () => {
  activeDate = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
});

if (meetingTypeFilter) {
  meetingTypeFilter.addEventListener("change", () => {
    activeMeetingType = meetingTypeFilter.value;
    resetDetails();
    renderCalendar();
  });
}

if (meetingLocationFilter) {
  const locations = [...new Set(events.map((event) => event.location))].sort((a, b) =>
    a.localeCompare(b),
  );

  locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    meetingLocationFilter.append(option);
  });

  meetingLocationFilter.addEventListener("change", () => {
    activeMeetingLocation = meetingLocationFilter.value;
    resetDetails();
    renderCalendar();
  });
}

if (socialCategoryFilter) {
  socialCategoryFilter.addEventListener("change", () => {
    activeSocialCategory = socialCategoryFilter.value;
    resetDetails();
    renderCalendar();
  });
}

if (calendarSearch) {
  calendarSearch.addEventListener("input", () => {
    activeSearchTerm = calendarSearch.value.trim().toLowerCase();
    resetDetails();
    renderCalendar();
  });
}

if (detailPoster) {
  detailPoster.addEventListener("click", () => {
    if (!detailPoster.classList.contains("hidden") && detailPoster.src) {
      posterLightbox.open(detailPoster.src, detailPoster.alt);
    }
  });

  detailPoster.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !detailPoster.classList.contains("hidden")) {
      event.preventDefault();
      posterLightbox.open(detailPoster.src, detailPoster.alt);
    }
  });
}

renderCalendar();

const initialEventId = decodeURIComponent(window.location.hash.slice(1));
const initialEvent = events.find((event) => event.id === initialEventId);
if (initialEvent) {
  const initialDate = parseLocalDate(initialEvent.date);
  activeDate = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  renderCalendar();
  selectEvent(initialEvent.id);
}
}

if (document.querySelector("#calendarGrid")) {
  window.surrey1837CalendarDataReady.finally(initializeCalendarPage);
}

function createPosterLightbox() {
  const lightbox = document.createElement("div");
  lightbox.className = "poster-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Event image preview");
  lightbox.innerHTML = `
    <div class="poster-lightbox-frame">
      <button class="poster-lightbox-close" type="button" aria-label="Close image preview">×</button>
      <img alt="" />
    </div>
  `;
  document.body.append(lightbox);

  const image = lightbox.querySelector("img");
  const closeButton = lightbox.querySelector("button");
  let previousFocus = null;

  function close() {
    lightbox.classList.remove("is-open");
    image.removeAttribute("src");
    document.removeEventListener("keydown", handleKeydown);
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      close();
    }
  });

  closeButton.addEventListener("click", close);

  return {
    open(src, alt) {
      previousFocus = document.activeElement;
      image.src = src;
      image.alt = alt || "Event image";
      lightbox.classList.add("is-open");
      closeButton.focus();
      document.addEventListener("keydown", handleKeydown);
    },
  };
}
