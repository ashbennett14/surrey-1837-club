(() => {
  const siteUrl = "https://1837-club.com/";

  function absoluteUrl(path) {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(path.replace(/^\//, ""), siteUrl).toString();
  }

  function buildDescription(event) {
    return (
      event.description ||
      `${event.title} at ${event.location}. For further details, join the 1837 Club WhatsApp community, or email 1837t5@surreymason.org.uk.`
    );
  }

  function addStructuredData() {
    const socialEvents = window.surrey1837CalendarData?.socialEvents || [];
    if (socialEvents.length === 0) return;

    const graph = socialEvents.map((event) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      startDate: event.date,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      image: absoluteUrl(event.poster),
      description: buildDescription(event),
      location: {
        "@type": "Place",
        name: event.location,
        address: event.location,
      },
      organizer: {
        "@type": "Organization",
        name: event.host || "The Surrey 1837 Club",
        url: siteUrl,
      },
    }));

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(graph);
    document.head.append(script);
  }

  if (window.surrey1837CalendarDataReady) {
    window.surrey1837CalendarDataReady.finally(addStructuredData);
  } else {
    addStructuredData();
  }
})();
