(function () {
  const symbolLabels = {
    column: "Column",
    key: "Key",
    acacia: "Acacia",
    light: "Light",
    book: "Book",
  };

  const memorySymbols = ["column", "key", "acacia", "light"];
  const lightSolution = ["column", "acacia", "key", "light"];
  const stageScore = {
    memory: 0,
    lodge: 0,
    light: 0,
  };

  let memorySequence = [];
  let memoryIndex = 0;
  let memoryRound = 0;
  let acceptingMemoryInput = false;
  let selectedItem = null;
  let lightAnswer = [];
  let timerId = null;
  let startTime = Date.now();
  let lastFocus = null;

  const progressItems = Array.from(document.querySelectorAll("[data-progress-step]"));
  const stageElements = Array.from(document.querySelectorAll(".trial-stage"));
  const stageValue = document.querySelector("#trialStageValue");
  const scoreValue = document.querySelector("#trialScoreValue");
  const timeValue = document.querySelector("#trialTimeValue");
  const finalScoreValue = document.querySelector("#finalScoreValue");
  const finalTimeValue = document.querySelector("#finalTimeValue");
  const memoryStatus = document.querySelector("#memoryStatus");
  const lodgeStatus = document.querySelector("#lodgeStatus");
  const lightStatus = document.querySelector("#lightStatus");
  const memoryStart = document.querySelector("#memoryStart");
  const memoryButtons = Array.from(document.querySelectorAll("[data-memory-symbol]"));
  const lodgeItems = Array.from(document.querySelectorAll("[data-item]"));
  const lodgeSlots = Array.from(document.querySelectorAll("[data-accepts]"));
  const lightButtons = Array.from(document.querySelectorAll("[data-light-symbol]"));
  const lightAnswerElement = document.querySelector("#lightAnswer");
  const lightSubmit = document.querySelector("#lightSubmit");
  const lightReset = document.querySelector("#lightReset");
  const playAgain = document.querySelector("#playAgain");

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function getTotalScore() {
    return stageScore.memory + stageScore.lodge + stageScore.light;
  }

  function updateScore() {
    scoreValue.textContent = String(getTotalScore());
  }

  function startTimer() {
    window.clearInterval(timerId);
    startTime = Date.now();
    timeValue.textContent = "0:00";
    timerId = window.setInterval(() => {
      timeValue.textContent = formatTime(Date.now() - startTime);
    }, 1000);
  }

  function showStage(stage) {
    stageElements.forEach((element) => {
      element.classList.toggle("is-current", element.dataset.stage === String(stage));
    });

    progressItems.forEach((item) => {
      const step = Number(item.dataset.progressStep);
      item.classList.toggle("is-active", step === Number(stage));
      item.classList.toggle("is-complete", step < Number(stage) || stage === "complete");
    });

    stageValue.textContent = stage === "complete" ? "3" : String(stage);
    const current = document.querySelector(".trial-stage.is-current");
    current?.querySelector("button, a")?.focus();
  }

  function setStatus(element, message) {
    element.textContent = message;
  }

  function wait(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  function getMemoryButton(symbol) {
    return memoryButtons.find((button) => button.dataset.memorySymbol === symbol);
  }

  async function flashMemorySymbol(symbol, duration = 520) {
    const button = getMemoryButton(symbol);
    if (!button) return;
    button.classList.add("is-lit");
    await wait(duration);
    button.classList.remove("is-lit");
  }

  async function playMemorySequence() {
    acceptingMemoryInput = false;
    memoryButtons.forEach((button) => {
      button.disabled = true;
    });
    setStatus(memoryStatus, `Round ${memoryRound}. Watch carefully...`);
    await wait(420);

    for (const symbol of memorySequence) {
      await flashMemorySymbol(symbol);
      await wait(170);
    }

    memoryIndex = 0;
    acceptingMemoryInput = true;
    memoryButtons.forEach((button) => {
      button.disabled = false;
    });
    setStatus(memoryStatus, "Now repeat the signs.");
  }

  function addMemoryRound() {
    memoryRound += 1;
    const nextSymbol = memorySymbols[Math.floor(Math.random() * memorySymbols.length)];
    memorySequence.push(nextSymbol);
    playMemorySequence();
  }

  function resetMemoryStage() {
    memorySequence = [];
    memoryIndex = 0;
    memoryRound = 0;
    acceptingMemoryInput = false;
    stageScore.memory = 0;
    memoryStart.textContent = "Start Stage One";
    memoryButtons.forEach((button) => {
      button.disabled = true;
      button.classList.remove("is-lit", "is-wrong");
    });
    setStatus(memoryStatus, "Press start to begin the first trial.");
  }

  function startMemoryStage() {
    resetMemoryStage();
    memoryStart.textContent = "Restart Stage One";
    setStatus(memoryStatus, "The signs are being prepared...");
    addMemoryRound();
  }

  function handleMemoryPress(event) {
    if (!acceptingMemoryInput) return;

    const button = event.currentTarget;
    const symbol = button.dataset.memorySymbol;
    acceptingMemoryInput = false;
    memoryButtons.forEach((button) => {
      button.disabled = true;
    });
    button.classList.add("is-lit");
    window.setTimeout(() => button.classList.remove("is-lit"), 220);

    if (symbol !== memorySequence[memoryIndex]) {
      stageScore.memory = Math.max(0, memoryRound - 1) * 10;
      updateScore();
      button.classList.add("is-wrong");
      setStatus(memoryStatus, "Not quite. Watch again, then try the round once more.");
      window.setTimeout(() => {
        button.classList.remove("is-wrong");
        playMemorySequence();
      }, 720);
      return;
    }

    memoryIndex += 1;
    if (memoryIndex === memorySequence.length) {
      acceptingMemoryInput = false;
      stageScore.memory = memoryRound * 10;
      updateScore();
      memoryButtons.forEach((button) => {
        button.disabled = true;
      });

      if (memoryRound >= 4) {
        setStatus(memoryStatus, "The signs are remembered. Stage two is open.");
        window.setTimeout(() => showStage(2), 900);
        return;
      }

      setStatus(memoryStatus, "Well remembered. Another sign is added.");
      window.setTimeout(addMemoryRound, 760);
      return;
    }

    window.setTimeout(() => {
      acceptingMemoryInput = true;
      memoryButtons.forEach((button) => {
        button.disabled = false;
      });
    }, 260);
  }

  function clearLodgeSelection() {
    selectedItem = null;
    lodgeItems.forEach((item) => item.classList.remove("is-selected"));
  }

  function placeLodgeItem(item, slot) {
    const itemName = item.dataset.item;
    if (!itemName || slot.classList.contains("is-filled")) return;

    if (slot.dataset.accepts !== itemName) {
      slot.classList.add("is-wrong");
      setStatus(lodgeStatus, `${symbolLabels[itemName]} does not belong there. Try another place.`);
      window.setTimeout(() => slot.classList.remove("is-wrong"), 520);
      return;
    }

    slot.classList.add("is-filled");
    slot.innerHTML = `<span>${slot.querySelector("span")?.textContent || ""}</span><strong>${symbolLabels[itemName]}</strong>`;
    item.disabled = true;
    item.classList.add("is-placed");
    clearLodgeSelection();
    stageScore.lodge += 12;
    updateScore();

    const remaining = lodgeSlots.filter((target) => !target.classList.contains("is-filled"));
    if (remaining.length === 0) {
      setStatus(lodgeStatus, "The lodge is set. The final light remains.");
      window.setTimeout(() => showStage(3), 760);
      return;
    }

    setStatus(lodgeStatus, "Good. Place the next symbol.");
  }

  function resetLodgeStage() {
    selectedItem = null;
    stageScore.lodge = 0;
    lodgeItems.forEach((item) => {
      item.disabled = false;
      item.classList.remove("is-selected", "is-placed");
    });
    lodgeSlots.forEach((slot) => {
      slot.classList.remove("is-filled", "is-wrong", "is-drag-over");
      const label = symbolLabels[slot.dataset.accepts];
      const place = {
        light: "East",
        book: "Centre",
        key: "Door",
        acacia: "Border",
      }[slot.dataset.accepts];
      slot.innerHTML = `<span>${place}</span><strong>${label}</strong>`;
    });
    setStatus(lodgeStatus, "Select an item, then choose its correct position.");
  }

  function renderLightAnswer() {
    lightAnswerElement.innerHTML = lightAnswer
      .map((symbol) => `<span>${symbolLabels[symbol]}</span>`)
      .join("");
  }

  function resetLightStage() {
    lightAnswer = [];
    stageScore.light = 0;
    renderLightAnswer();
    lightButtons.forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-selected", "is-wrong");
    });
    setStatus(lightStatus, "Choose four signs to complete the trial.");
  }

  function completeQuest() {
    stageScore.light = 42;
    updateScore();
    window.clearInterval(timerId);
    finalScoreValue.textContent = String(getTotalScore());
    finalTimeValue.textContent = formatTime(Date.now() - startTime);
    showStage("complete");
  }

  function submitLightAnswer() {
    if (lightAnswer.length !== lightSolution.length) {
      setStatus(lightStatus, "Choose four signs before submitting.");
      return;
    }

    const isCorrect = lightSolution.every((symbol, index) => lightAnswer[index] === symbol);
    if (!isCorrect) {
      setStatus(lightStatus, "The clue is close, but the order is not yet right.");
      lightButtons.forEach((button) => button.classList.add("is-wrong"));
      window.setTimeout(() => {
        lightButtons.forEach((button) => button.classList.remove("is-wrong"));
        resetLightStage();
      }, 820);
      return;
    }

    setStatus(lightStatus, "The light is found.");
    completeQuest();
  }

  function resetQuest() {
    startTimer();
    resetMemoryStage();
    resetLodgeStage();
    resetLightStage();
    stageScore.memory = 0;
    stageScore.lodge = 0;
    stageScore.light = 0;
    updateScore();
    showStage(1);
  }

  memoryStart.addEventListener("click", startMemoryStage);
  memoryButtons.forEach((button) => button.addEventListener("click", handleMemoryPress));

  lodgeItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.disabled) return;
      clearLodgeSelection();
      selectedItem = item;
      item.classList.add("is-selected");
      setStatus(lodgeStatus, `${symbolLabels[item.dataset.item]} selected. Choose its place.`);
    });

    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.item);
      selectedItem = item;
    });
  });

  lodgeSlots.forEach((slot) => {
    slot.addEventListener("click", () => {
      if (selectedItem) {
        placeLodgeItem(selectedItem, slot);
      }
    });

    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("is-drag-over");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("is-drag-over");
    });

    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("is-drag-over");
      const itemName = event.dataTransfer.getData("text/plain");
      const item = lodgeItems.find((candidate) => candidate.dataset.item === itemName);
      if (item) {
        placeLodgeItem(item, slot);
      }
    });
  });

  lightButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (lightAnswer.length >= lightSolution.length) return;
      const symbol = button.dataset.lightSymbol;
      lightAnswer.push(symbol);
      button.classList.add("is-selected");
      renderLightAnswer();
      setStatus(lightStatus, `${symbolLabels[symbol]} added.`);
    });
  });

  lightSubmit.addEventListener("click", submitLightAnswer);
  lightReset.addEventListener("click", resetLightStage);
  playAgain.addEventListener("click", resetQuest);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      window.location.href = "index.html";
    }
  });

  document.addEventListener("focusin", (event) => {
    lastFocus = event.target;
  });

  resetQuest();
  if (lastFocus) {
    lastFocus.focus();
  }
})();
