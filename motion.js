(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    document.documentElement.classList.add("reduced-motion");
    return;
  }

  document.documentElement.classList.add("motion-ready");

  const revealSelector = [
    ".brand-strip",
    ".page-nav",
    ".home-intro",
    ".calendar-links",
    ".club-links-box",
    ".calendar-header",
    ".month-bar",
    ".details-panel",
    ".page-hero",
    ".join-intro",
    ".community-chats",
    ".form-card",
    ".next-steps",
    ".stats-summary",
    ".stats-card",
    ".login-panel",
    ".site-footer",
  ].join(", ");

  let observer;

  function prepareReveal(root) {
    const container = root || document;
    const elements = Array.from(container.querySelectorAll(revealSelector));

    elements.forEach((element) => {
      if (element.dataset.revealReady === "true") {
        return;
      }

      element.dataset.revealReady = "true";
      element.classList.add("reveal-target");

      if (observer) {
        observer.observe(element);
      } else {
        element.classList.add("is-visible");
      }
    });
  }

  window.prepareMotion = prepareReveal;

  document.addEventListener("DOMContentLoaded", () => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      },
    );

    prepareReveal(document);
  });
})();
