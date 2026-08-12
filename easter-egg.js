(function () {
  const footer = document.querySelector(".site-footer");
  if (!footer || footer.querySelector(".acacia-easter-trigger")) {
    return;
  }

  const trigger = document.createElement("button");
  trigger.className = "acacia-easter-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Hidden 1837 Club easter egg");
  trigger.innerHTML = `
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 27c.5-4.3.3-8.5-.6-12.6" />
      <path d="M16.4 17.4c-3.5-.4-6.2-2-8.1-4.8 3.8-.4 6.6.8 8.4 3.7" />
      <path d="M16.2 14.2c2.9-2.2 5.9-2.8 9-1.9-1.5 3-4.1 4.7-7.8 5" />
      <path d="M14.4 11.4c-2.9-.6-5.1-2-6.5-4.3 3-.1 5.4 1 7.2 3.3" />
      <path d="M17 10.6c2.4-2 4.9-2.7 7.6-2-1.1 2.5-3.2 4-6.3 4.5" />
      <path d="M16.2 8.5c-.1-2.6.8-4.7 2.7-6.3 1.2 2.4.7 4.8-1.5 7.1" />
    </svg>
  `;
  let clickCount = 0;
  let clickTimer;
  trigger.addEventListener("click", () => {
    clickCount += 1;
    window.clearTimeout(clickTimer);
    if (clickCount >= 3) {
      window.location.href = "tylers-trial.html";
      return;
    }
    clickTimer = window.setTimeout(() => {
      clickCount = 0;
    }, 1200);
  });

  footer.appendChild(trigger);
})();
