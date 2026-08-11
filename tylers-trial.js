(function () {
  const boardSize = 7;
  const startCell = { row: 3, col: 0 };
  const lightCell = { row: 3, col: 6 };
  const directions = {
    n: { row: -1, col: 0, opposite: "s" },
    e: { row: 0, col: 1, opposite: "w" },
    s: { row: 1, col: 0, opposite: "n" },
    w: { row: 0, col: -1, opposite: "e" },
  };

  const tileLibrary = [
    { type: "straight", label: "Pavement", symbol: "Path", openings: ["e", "w"], count: 7, score: 5 },
    { type: "corner", label: "Corner", symbol: "Turn", openings: ["n", "e"], count: 8, score: 6 },
    { type: "tee", label: "Junction", symbol: "Column", openings: ["n", "e", "w"], count: 5, score: 9 },
    { type: "cross", label: "Centre", symbol: "Book", openings: ["n", "e", "s", "w"], count: 3, score: 12 },
    { type: "acacia", label: "Acacia Walk", symbol: "Acacia", openings: ["e", "s"], count: 4, score: 14 },
    { type: "key", label: "Tyler's Key", symbol: "Key", openings: ["n", "w"], count: 4, score: 14 },
    { type: "column", label: "Twin Columns", symbol: "Column", openings: ["n", "s"], count: 4, score: 12 },
  ];

  let board = [];
  let deck = [];
  let hand = [];
  let selectedTile = null;
  let placedTiles = 0;
  let score = 0;
  let startTime = Date.now();
  let timerId = null;
  let gameComplete = false;

  const boardElement = document.querySelector("#tracingBoard");
  const handElement = document.querySelector("#tileHand");
  const selectedTileCard = document.querySelector("#selectedTileCard");
  const scoreValue = document.querySelector("#trialScoreValue");
  const timeValue = document.querySelector("#trialTimeValue");
  const tilesValue = document.querySelector("#trialTilesValue");
  const planValue = document.querySelector("#trialPlanValue");
  const message = document.querySelector("#trialMessage");
  const rotateButton = document.querySelector("#rotateTile");
  const drawButton = document.querySelector("#drawTiles");
  const resetButton = document.querySelector("#resetGame");
  const completionPanel = document.querySelector("#completionPanel");
  const finalScoreValue = document.querySelector("#finalScoreValue");
  const finalTimeValue = document.querySelector("#finalTimeValue");
  const playAgain = document.querySelector("#playAgain");
  const objectiveItems = Array.from(document.querySelectorAll("[data-objective]"));

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function setMessage(text) {
    message.textContent = text;
  }

  function cloneOpenings(openings) {
    return openings.slice().sort().join("");
  }

  function makeDeck() {
    const tiles = [];
    tileLibrary.forEach((template) => {
      for (let index = 0; index < template.count; index += 1) {
        tiles.push({
          id: `${template.type}-${index}`,
          type: template.type,
          label: template.label,
          symbol: template.symbol,
          openings: template.openings.slice(),
          rotation: 0,
          score: template.score,
        });
      }
    });

    for (let index = tiles.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [tiles[index], tiles[target]] = [tiles[target], tiles[index]];
    }

    return tiles;
  }

  function rotateOpenings(openings) {
    const order = ["n", "e", "s", "w"];
    return openings.map((opening) => order[(order.indexOf(opening) + 1) % order.length]);
  }

  function rotateTile(tile) {
    return {
      ...tile,
      rotation: (tile.rotation + 90) % 360,
      openings: rotateOpenings(tile.openings),
    };
  }

  function createFixedTile(id, label, symbol, openings) {
    return {
      id,
      label,
      symbol,
      openings,
      rotation: 0,
      score: 0,
      fixed: true,
    };
  }

  function resetBoard() {
    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    board[startCell.row][startCell.col] = createFixedTile("west-door", "West Door", "Door", ["e"]);
    board[lightCell.row][lightCell.col] = createFixedTile("eastern-light", "Eastern Light", "Light", ["w"]);
  }

  function drawHand() {
    while (hand.length < 3 && deck.length) {
      hand.push(deck.shift());
    }
  }

  function getNeighbour(row, col, direction) {
    const next = directions[direction];
    const nextRow = row + next.row;
    const nextCol = col + next.col;
    if (nextRow < 0 || nextRow >= boardSize || nextCol < 0 || nextCol >= boardSize) {
      return null;
    }
    return {
      row: nextRow,
      col: nextCol,
      tile: board[nextRow][nextCol],
      direction,
      opposite: next.opposite,
    };
  }

  function isLegalPlacement(row, col, tile) {
    if (!tile || gameComplete || board[row][col]) return false;

    let connectsToPlan = false;
    for (const direction of Object.keys(directions)) {
      const neighbour = getNeighbour(row, col, direction);
      if (!neighbour) {
        if (tile.openings.includes(direction)) return false;
        continue;
      }

      if (!neighbour.tile) continue;

      const tileHasOpening = tile.openings.includes(direction);
      const neighbourHasOpening = neighbour.tile.openings.includes(neighbour.opposite);
      if (tileHasOpening !== neighbourHasOpening) return false;
      if (tileHasOpening && neighbourHasOpening) connectsToPlan = true;
    }

    return connectsToPlan;
  }

  function connectedFromStart() {
    const visited = new Set();
    const stack = [`${startCell.row},${startCell.col}`];

    while (stack.length) {
      const key = stack.pop();
      if (visited.has(key)) continue;
      visited.add(key);
      const [row, col] = key.split(",").map(Number);
      const tile = board[row][col];
      if (!tile) continue;

      tile.openings.forEach((direction) => {
        const neighbour = getNeighbour(row, col, direction);
        if (!neighbour?.tile) return;
        if (!neighbour.tile.openings.includes(neighbour.opposite)) return;
        stack.push(`${neighbour.row},${neighbour.col}`);
      });
    }

    return visited;
  }

  function hasReachedLight() {
    return connectedFromStart().has(`${lightCell.row},${lightCell.col}`);
  }

  function countSymbolTiles() {
    return board
      .flat()
      .filter((tile) => tile && !tile.fixed && ["Acacia", "Book", "Key", "Column"].includes(tile.symbol))
      .length;
  }

  function hasAnyLegalMove() {
    return hand.some((tile) => {
      let candidate = tile;
      for (let rotation = 0; rotation < 4; rotation += 1) {
        for (let row = 0; row < boardSize; row += 1) {
          for (let col = 0; col < boardSize; col += 1) {
            if (isLegalPlacement(row, col, candidate)) return true;
          }
        }
        candidate = rotateTile(candidate);
      }
      return false;
    });
  }

  function updateStats() {
    scoreValue.textContent = String(score);
    tilesValue.textContent = String(placedTiles);
    planValue.textContent = hasReachedLight() ? "Complete" : "Open";

    objectiveItems.forEach((item) => {
      const objective = item.dataset.objective;
      const complete =
        objective === "door" ||
        (objective === "light" && hasReachedLight()) ||
        (objective === "symbols" && countSymbolTiles() >= 3);
      item.classList.toggle("is-complete", complete);
      item.classList.toggle("is-active", !complete);
    });
  }

  function tileSvg(tile) {
    const lines = tile.openings
      .map((opening) => {
        if (opening === "n") return '<line x1="50" y1="50" x2="50" y2="7"></line>';
        if (opening === "e") return '<line x1="50" y1="50" x2="93" y2="50"></line>';
        if (opening === "s") return '<line x1="50" y1="50" x2="50" y2="93"></line>';
        return '<line x1="50" y1="50" x2="7" y2="50"></line>';
      })
      .join("");

    const mark = {
      Door: "D",
      Light: "L",
      Acacia: "A",
      Book: "B",
      Key: "K",
      Column: "C",
      Path: "",
      Turn: "",
    }[tile.symbol] || "";

    return `
      <svg class="tile-map" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        ${lines}
        <circle cx="50" cy="50" r="12"></circle>
        ${mark ? `<text x="50" y="56">${mark}</text>` : ""}
      </svg>
    `;
  }

  function renderTileContent(tile) {
    return `
      ${tileSvg(tile)}
      <span class="tile-label">${tile.label}</span>
    `;
  }

  function renderBoard() {
    boardElement.innerHTML = "";
    const connected = connectedFromStart();

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const cell = document.createElement("button");
        const tile = board[row][col];
        cell.type = "button";
        cell.className = "tracing-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute("aria-label", `Board square row ${row + 1}, column ${col + 1}`);

        if (tile) {
          cell.classList.add("has-tile");
          cell.classList.toggle("is-fixed", Boolean(tile.fixed));
          cell.classList.toggle("is-connected", connected.has(`${row},${col}`));
          cell.innerHTML = renderTileContent(tile);
          cell.disabled = true;
        } else if (selectedTile && isLegalPlacement(row, col, selectedTile)) {
          cell.classList.add("is-legal");
          cell.setAttribute("aria-label", `Place ${selectedTile.label} on row ${row + 1}, column ${col + 1}`);
        }

        cell.addEventListener("click", () => placeSelectedTile(row, col));
        boardElement.appendChild(cell);
      }
    }
  }

  function renderHand() {
    handElement.innerHTML = "";
    hand.forEach((tile, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hand-tile";
      button.classList.toggle("is-selected", selectedTile?.id === tile.id);
      button.dataset.tileId = tile.id;
      button.innerHTML = `
        ${renderTileContent(tile)}
        <small>${cloneOpenings(tile.openings).toUpperCase()}</small>
      `;
      button.setAttribute("aria-label", `Select ${tile.label}`);
      button.addEventListener("click", () => selectTile(index));
      handElement.appendChild(button);
    });

    if (!hand.length) {
      handElement.innerHTML = '<p class="hand-empty">No plans remain.</p>';
    }

    if (selectedTile) {
      selectedTileCard.innerHTML = `
        <span>Selected Tile</span>
        <strong>${selectedTile.label}</strong>
        <small>${selectedTile.symbol} / ${cloneOpenings(selectedTile.openings).toUpperCase()}</small>
      `;
    } else {
      selectedTileCard.innerHTML = "<span>No tile selected</span><strong>Choose a plan tile</strong>";
    }
  }

  function renderGame() {
    renderBoard();
    renderHand();
    updateStats();
  }

  function selectTile(index) {
    if (gameComplete) return;
    selectedTile = hand[index];
    setMessage(`${selectedTile.label} selected. Rotate it, or place it on a highlighted square.`);
    renderGame();
  }

  function rotateSelectedTile() {
    if (!selectedTile || gameComplete) {
      setMessage("Choose a tile before rotating.");
      return;
    }

    selectedTile = rotateTile(selectedTile);
    hand = hand.map((tile) => (tile.id === selectedTile.id ? selectedTile : tile));
    setMessage(`${selectedTile.label} rotated.`);
    renderGame();
  }

  function completeGame() {
    gameComplete = true;
    score += 50;
    window.clearInterval(timerId);
    finalScoreValue.textContent = String(score);
    finalTimeValue.textContent = formatTime(Date.now() - startTime);
    completionPanel.hidden = false;
    completionPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    playAgain.focus();
    updateStats();
  }

  function placeSelectedTile(row, col) {
    if (!selectedTile) {
      setMessage("Choose a tile from your hand first.");
      return;
    }

    if (!isLegalPlacement(row, col, selectedTile)) {
      setMessage("That tile does not meet the plan cleanly. Try rotating it or choosing another square.");
      boardElement.classList.add("is-warning");
      window.setTimeout(() => boardElement.classList.remove("is-warning"), 360);
      return;
    }

    board[row][col] = selectedTile;
    hand = hand.filter((tile) => tile.id !== selectedTile.id);
    score += selectedTile.score;
    if (["Acacia", "Book", "Key", "Column"].includes(selectedTile.symbol)) {
      score += 6;
    }
    placedTiles += 1;
    selectedTile = null;
    drawHand();

    if (hasReachedLight()) {
      setMessage("The path has reached the Eastern Light.");
      renderGame();
      window.setTimeout(completeGame, 420);
      return;
    }

    if (!deck.length && !hand.length) {
      setMessage("The plans have run out before the Light was reached. Reset to try again.");
    } else if (!hasAnyLegalMove()) {
      setMessage("No current tile fits the plan. Draw new plans to continue.");
    } else {
      setMessage("Good placement. Choose the next tile.");
    }

    renderGame();
  }

  function drawNewPlans() {
    if (gameComplete) return;
    if (!deck.length) {
      setMessage("No spare plans remain.");
      return;
    }

    hand = [];
    selectedTile = null;
    drawHand();
    score = Math.max(0, score - 8);
    setMessage("New tracing-board plans drawn. A small score penalty was applied.");
    renderGame();
  }

  function startTimer() {
    window.clearInterval(timerId);
    startTime = Date.now();
    timeValue.textContent = "0:00";
    timerId = window.setInterval(() => {
      timeValue.textContent = formatTime(Date.now() - startTime);
    }, 1000);
  }

  function resetGame() {
    deck = makeDeck();
    hand = [];
    selectedTile = null;
    placedTiles = 0;
    score = 0;
    gameComplete = false;
    completionPanel.hidden = true;
    resetBoard();
    drawHand();
    startTimer();
    setMessage("Select a tile from your hand to begin.");
    renderGame();
  }

  rotateButton.addEventListener("click", rotateSelectedTile);
  drawButton.addEventListener("click", drawNewPlans);
  resetButton.addEventListener("click", resetGame);
  playAgain.addEventListener("click", resetGame);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      window.location.href = "index.html";
      return;
    }
    if (event.key.toLowerCase() === "r") {
      rotateSelectedTile();
    }
    if (["1", "2", "3"].includes(event.key)) {
      const index = Number(event.key) - 1;
      if (hand[index]) selectTile(index);
    }
  });

  resetGame();
})();
