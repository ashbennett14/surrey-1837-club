(function () {
  const footer = document.querySelector(".site-footer");
  if (!footer || document.getElementById("tylersTrialModal")) {
    return;
  }

  const symbols = [
    { id: "column", label: "Column", mark: "I" },
    { id: "key", label: "Key", mark: "K" },
    { id: "acacia", label: "Acacia", mark: "A" },
    { id: "light", label: "Light", mark: "L" },
  ];

  let sequence = [];
  let userIndex = 0;
  let score = 0;
  let acceptingInput = false;
  let playTimer = null;

  const trigger = document.createElement("button");
  trigger.className = "acacia-easter-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Open a hidden 1837 Club easter egg");
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
  footer.appendChild(trigger);

  const modal = document.createElement("div");
  modal.className = "tylers-trial-modal";
  modal.id = "tylersTrialModal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="tylers-trial-backdrop" data-trial-close></div>
    <section
      class="tylers-trial-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tylersTrialTitle"
      aria-describedby="tylersTrialDescription"
    >
      <button class="tylers-trial-close" type="button" data-trial-close aria-label="Close Tyler's Trial">×</button>
      <p class="section-kicker">Hidden Trial</p>
      <h2 id="tylersTrialTitle">Tyler’s Trial</h2>
      <p id="tylersTrialDescription">
        Watch the order of the signs, then repeat the sequence. Each round adds one more step.
      </p>
      <div class="tylers-trial-scoreboard" aria-live="polite">
        <span>Round <strong id="tylersTrialRound">0</strong></span>
        <span>Score <strong id="tylersTrialScore">0</strong></span>
      </div>
      <div class="tylers-trial-grid" aria-label="Tyler's Trial memory symbols">
        ${symbols
          .map(
            (symbol) => `
              <button class="trial-symbol" type="button" data-symbol="${symbol.id}" aria-label="${symbol.label}">
                <span class="trial-symbol-mark" aria-hidden="true">${symbol.mark}</span>
                <span>${symbol.label}</span>
              </button>
            `,
          )
          .join("")}
      </div>
      <p class="tylers-trial-status" id="tylersTrialStatus" aria-live="polite">
        Press start when you are ready.
      </p>
      <button class="login-button tylers-trial-start" type="button" id="tylersTrialStart">
        Start Trial
      </button>
    </section>
  `;
  document.body.appendChild(modal);

  const panel = modal.querySelector(".tylers-trial-panel");
  const closeButtons = modal.querySelectorAll("[data-trial-close]");
  const startButton = modal.querySelector("#tylersTrialStart");
  const roundValue = modal.querySelector("#tylersTrialRound");
  const scoreValue = modal.querySelector("#tylersTrialScore");
  const statusText = modal.querySelector("#tylersTrialStatus");
  const symbolButtons = Array.from(modal.querySelectorAll(".trial-symbol"));

  function setStatus(message) {
    statusText.textContent = message;
  }

  function updateScore() {
    roundValue.textContent = String(sequence.length);
    scoreValue.textContent = String(score);
  }

  function getSymbolButton(symbolId) {
    return symbolButtons.find((button) => button.dataset.symbol === symbolId);
  }

  function flashSymbol(symbolId, duration = 520) {
    const button = getSymbolButton(symbolId);
    if (!button) return Promise.resolve();

    button.classList.add("is-lit");
    return new Promise((resolve) => {
      window.setTimeout(() => {
        button.classList.remove("is-lit");
        resolve();
      }, duration);
    });
  }

  function wait(duration) {
    return new Promise((resolve) => {
      playTimer = window.setTimeout(resolve, duration);
    });
  }

  async function playSequence() {
    acceptingInput = false;
    symbolButtons.forEach((button) => {
      button.disabled = true;
    });
    updateScore();
    setStatus("Watch carefully...");

    await wait(440);
    for (const symbolId of sequence) {
      await flashSymbol(symbolId);
      await wait(170);
    }

    userIndex = 0;
    acceptingInput = true;
    symbolButtons.forEach((button) => {
      button.disabled = false;
    });
    setStatus("Now repeat the sequence.");
  }

  function addRound() {
    const next = symbols[Math.floor(Math.random() * symbols.length)].id;
    sequence.push(next);
    playSequence();
  }

  function startGame() {
    window.clearTimeout(playTimer);
    sequence = [];
    userIndex = 0;
    score = 0;
    acceptingInput = false;
    startButton.textContent = "Restart Trial";
    setStatus("The trial begins...");
    addRound();
  }

  async function handleSymbolPress(event) {
    const symbolId = event.currentTarget.dataset.symbol;
    if (!acceptingInput || !symbolId) {
      return;
    }

    await flashSymbol(symbolId, 260);

    if (symbolId !== sequence[userIndex]) {
      acceptingInput = false;
      symbolButtons.forEach((button) => {
        button.disabled = true;
      });
      updateScore();
      setStatus("Not quite. The Tyler keeps the door. Try again?");
      startButton.focus();
      return;
    }

    userIndex += 1;
    if (userIndex === sequence.length) {
      acceptingInput = false;
      score = sequence.length;
      updateScore();
      setStatus("Well remembered. Another sign is added.");
      symbolButtons.forEach((button) => {
        button.disabled = true;
      });
      await wait(820);
      addRound();
    }
  }

  function openGame() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("trial-open");
    window.setTimeout(() => startButton.focus(), 40);
  }

  function closeGame() {
    window.clearTimeout(playTimer);
    acceptingInput = false;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("trial-open");
    trigger.focus();
  }

  trigger.addEventListener("click", openGame);
  startButton.addEventListener("click", startGame);
  closeButtons.forEach((button) => button.addEventListener("click", closeGame));
  symbolButtons.forEach((button) => {
    button.disabled = true;
    button.addEventListener("click", handleSymbolPress);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeGame();
    }
  });

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });
})();
