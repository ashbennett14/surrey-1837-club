(function () {
  const canvas = document.querySelector("#lodgeGameCanvas");
  const loading = document.querySelector("#lodgeGameLoading");
  const help = document.querySelector("#lodgeGameHelp");
  const rotateButton = document.querySelector("#gameRotate");
  const redrawButton = document.querySelector("#gameRedraw");
  const restartButton = document.querySelector("#gameRestart");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const W = 1280;
  const H = 720;
  const boardSize = 7;
  const board = { x: 386, y: 106, size: 510 };
  board.cell = board.size / boardSize;

  const palette = {
    navy: "#071f3f",
    blue: "#0d376d",
    lightBlue: "#9ed0ff",
    gold: "#c59a36",
    cream: "#fff7e6",
    red: "#9e1d2f",
    green: "#497f50",
    ink: "#f8fbff",
    dark: "rgba(3, 12, 24, 0.88)",
  };

  const edgeColors = {
    navy: "#0b2b55",
    gold: "#d4a83e",
    cream: "#f8eed8",
    blue: "#68aee9",
    red: "#a52b36",
    green: "#4e8b58",
  };

  const assets = {
    bg: "assets/tylers-lodge-floor-bg.webp",
    character: "assets/tylers-lodge-character.webp",
    tiles: "assets/tylers-lodge-tiles.webp",
    items: "assets/tylers-lodge-items.webp",
    ui: "assets/tylers-lodge-ui.webp",
  };

  const assetImages = {};
  const tileSheets = {
    pavement: 0,
    carpet: 1,
    corner: 2,
    column: 3,
    chair: 4,
    door: 5,
    acacia: 6,
    book: 7,
    light: 8,
    border: 9,
    corridor: 10,
    ornament: 11,
  };

  const itemDefs = [
    {
      id: "summons",
      name: "Summons",
      short: "Hint",
      desc: "Shows a recommended placement.",
      sheet: 0,
      apply: (state) => {
        state.hints += 1;
        say("The summons points to a tidy placement.");
      },
    },
    {
      id: "apron",
      name: "Apron",
      short: "Guard",
      desc: "Protects against one invalid move.",
      sheet: 1,
      apply: (state) => {
        state.shields += 1;
        say("The apron will forgive one poor fit.");
      },
    },
    {
      id: "gavel",
      name: "Gavel",
      short: "Replace",
      desc: "Replaces your selected tile.",
      sheet: 2,
      apply: (state) => {
        state.gavels += 1;
        say("The gavel can call for a better tile.");
      },
    },
    {
      id: "book",
      name: "Book of Constitutions",
      short: "Redraw",
      desc: "Adds a free redraw of all choices.",
      sheet: 3,
      apply: (state) => {
        state.redraws += 1;
        say("The book grants one extra redraw.");
      },
    },
    {
      id: "acacia",
      name: "Acacia Sprig",
      short: "Double",
      desc: "Doubles the next closed area score.",
      sheet: 4,
      apply: (state) => {
        state.acaciaDoubles += 1;
        say("The next closed area will score double.");
      },
    },
    {
      id: "charity",
      name: "Charity Jewel",
      short: "Bonus",
      desc: "Adds bonus points to each closed area.",
      sheet: 5,
      apply: (state) => {
        state.charityBonus += 10;
        say("Charity adds a bonus to each completed area.");
      },
    },
    {
      id: "key",
      name: "Tyler's Key",
      short: "Unlock",
      desc: "Unlocks one blocked square.",
      sheet: 6,
      apply: (state) => {
        state.keys += 1;
        say("The key is ready for the next lock.");
      },
    },
    {
      id: "column",
      name: "Column Token",
      short: "Wild Fit",
      desc: "Allows one tile to ignore a single mismatch.",
      sheet: 7,
      apply: (state) => {
        state.columnWilds += 1;
        say("A column token can steady one awkward edge.");
      },
    },
  ];

  const tileLibrary = [
    { name: "Pavement", art: "pavement", edges: ["cream", "navy", "cream", "navy"], value: 8 },
    { name: "Blue Carpet", art: "carpet", edges: ["gold", "gold", "gold", "gold"], value: 10 },
    { name: "Corner Border", art: "corner", edges: ["navy", "gold", "gold", "navy"], value: 12 },
    { name: "Column Base", art: "column", edges: ["cream", "cream", "gold", "gold"], value: 13 },
    { name: "Chair Line", art: "chair", edges: ["blue", "gold", "blue", "cream"], value: 11 },
    { name: "West Door", art: "door", edges: ["cream", "gold", "cream", "gold"], value: 12 },
    { name: "Acacia Tile", art: "acacia", edges: ["green", "gold", "green", "gold"], value: 16 },
    { name: "Book Table", art: "book", edges: ["blue", "cream", "gold", "cream"], value: 15 },
    { name: "Light Tile", art: "light", edges: ["gold", "blue", "gold", "blue"], value: 18 },
    { name: "Outer Border", art: "border", edges: ["navy", "cream", "gold", "cream"], value: 11 },
    { name: "Floor Walk", art: "corridor", edges: ["blue", "blue", "gold", "gold"], value: 12 },
    { name: "Ornament", art: "ornament", edges: ["red", "gold", "red", "gold"], value: 16 },
  ];

  let state;
  let pointer = { x: -1, y: -1, down: false };
  let animationFrame = 0;
  let lastFrame = performance.now();
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function createState() {
    return {
      board: Array.from({ length: boardSize }, () => Array(boardSize).fill(null)),
      locked: new Set(),
      claimedPockets: new Set(),
      choices: [],
      selected: 0,
      score: 0,
      round: 1,
      placed: 0,
      closedAreas: 0,
      redraws: 2,
      hints: 1,
      shields: 0,
      gavels: 0,
      keys: 0,
      acaciaDoubles: 0,
      charityBonus: 0,
      columnWilds: 0,
      wildcardArmed: false,
      message: "Choose a tile, rotate it, then place it on the lodge floor.",
      mode: "playing",
      itemChoices: [],
      startTime: performance.now(),
      elapsed: 0,
      flash: null,
      recommended: null,
      floating: [],
    };
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function resizeCanvas() {
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.aspectRatio = `${W} / ${H}`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function makeTile(template) {
    return {
      id: `${template.art}-${Math.random().toString(36).slice(2)}`,
      name: template.name,
      art: template.art,
      edges: template.edges.slice(),
      rotation: 0,
      value: template.value,
    };
  }

  function refillChoices() {
    while (state.choices.length < 3) {
      state.choices.push(makeTile(randomChoice(tileLibrary)));
    }
    state.selected = Math.min(state.selected, state.choices.length - 1);
    state.recommended = findRecommendedMove();
  }

  function rotateEdges(edges) {
    return [edges[3], edges[0], edges[1], edges[2]];
  }

  function rotateSelectedTile() {
    if (state.mode !== "playing") return;
    const tile = state.choices[state.selected];
    if (!tile) return;
    tile.edges = rotateEdges(tile.edges);
    tile.rotation = (tile.rotation + 90) % 360;
    state.message = `${tile.name} rotated.`;
    state.recommended = findRecommendedMove();
  }

  function redrawChoices(forceFree) {
    if (state.mode !== "playing") return;
    if (!forceFree && state.redraws <= 0) {
      say("No redraws remain. Try placing, using the gavel, or playing again.");
      pulse("redraw");
      return;
    }

    if (!forceFree) state.redraws -= 1;
    state.choices = [makeTile(randomChoice(tileLibrary)), makeTile(randomChoice(tileLibrary)), makeTile(randomChoice(tileLibrary))];
    state.selected = 0;
    state.recommended = findRecommendedMove();
    say(forceFree ? "The book redraws the whole hand." : "New tile choices drawn.");
  }

  function replaceSelectedTile() {
    if (state.gavels <= 0) {
      redrawChoices(false);
      return;
    }
    state.gavels -= 1;
    state.choices[state.selected] = makeTile(randomChoice(tileLibrary));
    state.recommended = findRecommendedMove();
    say("The gavel replaces the selected tile.");
  }

  function startRound() {
    state.board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    state.claimedPockets = new Set();
    state.choices = [];
    state.selected = 0;
    state.placed = 0;
    state.locked = createLockedSquares();

    while (state.keys > 0 && state.locked.size) {
      state.keys -= 1;
      unlockRandomSquare(state);
    }

    state.mode = "playing";
    refillChoices();
    say(`Round ${state.round}. Set the lodge floor carefully.`);
  }

  function createLockedSquares() {
    const locked = new Set();
    const count = Math.min(8, Math.max(0, state.round - 1));
    const cells = [];

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        if (row >= 2 && row <= 4 && col >= 2 && col <= 4) continue;
        cells.push(`${row},${col}`);
      }
    }

    shuffle(cells).slice(0, count).forEach((cell) => locked.add(cell));
    return locked;
  }

  function unlockRandomSquare(targetState) {
    const keys = Array.from(targetState.locked);
    if (!keys.length) return false;
    targetState.locked.delete(randomChoice(keys));
    return true;
  }

  function cellKey(row, col) {
    return `${row},${col}`;
  }

  function inBounds(row, col) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
  }

  function occupiedCount() {
    return state.board.flat().filter(Boolean).length;
  }

  function isLegalPlacement(row, col, tile, useWildcard) {
    if (!tile || !inBounds(row, col) || state.board[row][col] || state.locked.has(cellKey(row, col))) {
      return { ok: false, reason: "That square is not available." };
    }

    const dirs = [
      [-1, 0, 0, 2],
      [0, 1, 1, 3],
      [1, 0, 2, 0],
      [0, -1, 3, 1],
    ];
    let neighbours = 0;
    let matches = 0;
    let mismatches = 0;

    for (const [dr, dc, edgeIndex, oppositeIndex] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc)) continue;
      const neighbour = state.board[nr][nc];
      if (!neighbour) continue;
      neighbours += 1;
      if (tile.edges[edgeIndex] === neighbour.edges[oppositeIndex]) {
        matches += 1;
      } else {
        mismatches += 1;
      }
    }

    if (occupiedCount() > 0 && neighbours === 0) {
      return { ok: false, reason: "Tiles must touch the existing floor." };
    }

    if (mismatches > 0 && !(useWildcard && mismatches === 1)) {
      return { ok: false, reason: "The tile edges do not line up cleanly." };
    }

    if (occupiedCount() > 0 && matches === 0 && !useWildcard) {
      return { ok: false, reason: "At least one edge should match a neighbour." };
    }

    return { ok: true, matches, wildcardUsed: useWildcard && mismatches === 1 };
  }

  function hasAnyLegalMove() {
    return state.choices.some((choice) => {
      const probe = { ...choice, edges: choice.edges.slice() };
      for (let turn = 0; turn < 4; turn += 1) {
        for (let row = 0; row < boardSize; row += 1) {
          for (let col = 0; col < boardSize; col += 1) {
            if (isLegalPlacement(row, col, probe, state.columnWilds > 0).ok) return true;
          }
        }
        probe.edges = rotateEdges(probe.edges);
      }
      return false;
    });
  }

  function findRecommendedMove() {
    if (state.hints <= 0 || state.mode !== "playing") return null;
    const tile = state.choices[state.selected];
    if (!tile) return null;
    let best = null;

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const legal = isLegalPlacement(row, col, tile, state.columnWilds > 0);
        if (!legal.ok) continue;
        const centreBias = 8 - Math.abs(3 - row) - Math.abs(3 - col);
        const value = legal.matches * 20 + centreBias;
        if (!best || value > best.value) best = { row, col, value };
      }
    }

    return best;
  }

  function placeTile(row, col) {
    if (state.mode !== "playing") return;
    const tile = state.choices[state.selected];
    if (!tile) {
      say("Choose one of the three tile cards first.");
      return;
    }

    const useWildcard = state.columnWilds > 0;
    const legal = isLegalPlacement(row, col, tile, useWildcard);
    if (!legal.ok) {
      if (state.shields > 0) {
        state.shields -= 1;
        say(`The apron protects that attempt. ${legal.reason}`);
        pulse("shield");
        return;
      }
      say(legal.reason);
      pulse("board");
      return;
    }

    if (legal.wildcardUsed) {
      state.columnWilds -= 1;
      addFloatingText("Column steadied the edge", board.x + col * board.cell, board.y + row * board.cell, palette.lightBlue);
    }

    state.board[row][col] = { ...tile, edges: tile.edges.slice() };
    state.choices.splice(state.selected, 1);
    state.selected = Math.max(0, Math.min(state.selected, state.choices.length - 1));
    state.placed += 1;
    const placementScore = tile.value + legal.matches * 6;
    state.score += placementScore;
    addFloatingText(`+${placementScore}`, board.x + col * board.cell + 12, board.y + row * board.cell + 20, palette.gold);
    scoreClosedPockets();
    refillChoices();

    if (isBoardFull()) {
      finishRound();
      return;
    }

    if (!hasAnyLegalMove()) {
      if (state.gavels > 0) {
        say("No tile fits cleanly. Use the gavel or redraw if you can.");
      } else if (state.redraws > 0) {
        say("No tile fits cleanly. Redraw choices to continue.");
      } else {
        endGame("No legal moves remain.");
      }
      return;
    }

    say("Good placement. Keep closing the floor.");
  }

  function isBoardFull() {
    return occupiedCount() + state.locked.size >= boardSize * boardSize;
  }

  function scoreClosedPockets() {
    const visited = new Set();
    const dirs = [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ];

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const key = cellKey(row, col);
        if (visited.has(key) || state.board[row][col] || state.locked.has(key)) continue;
        const region = [];
        const queue = [[row, col]];
        let touchesEdge = false;
        visited.add(key);

        while (queue.length) {
          const [r, c] = queue.shift();
          region.push(cellKey(r, c));
          if (r === 0 || c === 0 || r === boardSize - 1 || c === boardSize - 1) {
            touchesEdge = true;
          }

          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const nextKey = cellKey(nr, nc);
            if (visited.has(nextKey) || state.board[nr][nc] || state.locked.has(nextKey)) continue;
            visited.add(nextKey);
            queue.push([nr, nc]);
          }
        }

        const signature = region.sort().join("|");
        if (!touchesEdge && !state.claimedPockets.has(signature)) {
          state.claimedPockets.add(signature);
          state.closedAreas += 1;
          let points = region.length * 24 + 30 + state.charityBonus;
          if (state.acaciaDoubles > 0) {
            points *= 2;
            state.acaciaDoubles -= 1;
          }
          state.score += points;
          const [firstRow, firstCol] = region[0].split(",").map(Number);
          addFloatingText(`Closed area +${points}`, board.x + firstCol * board.cell, board.y + firstRow * board.cell, palette.green);
          say(`Closed area scored ${points} points.`);
        }
      }
    }
  }

  function finishRound() {
    state.score += 80 + state.round * 20;
    state.itemChoices = shuffle(itemDefs).slice(0, 3);
    state.mode = "choose-item";
    say("Round complete. Choose an item for the next board.");
  }

  function chooseItem(index) {
    if (state.mode !== "choose-item") return;
    const item = state.itemChoices[index];
    if (!item) return;
    item.apply(state);
    state.round += 1;
    startRound();
  }

  function endGame(reason) {
    state.mode = "game-over";
    state.message = `${reason} Final score ${state.score}.`;
  }

  function restartGame() {
    state = createState();
    startRound();
  }

  function say(text) {
    state.message = text;
    if (help) help.textContent = text;
  }

  function pulse(target) {
    state.flash = { target, until: performance.now() + 360 };
  }

  function addFloatingText(text, x, y, color) {
    state.floating.push({ text, x, y, color, life: 1 });
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * W,
      y: ((source.clientY - rect.top) / rect.height) * H,
    };
  }

  function hitBoard(point) {
    if (point.x < board.x || point.y < board.y || point.x > board.x + board.size || point.y > board.y + board.size) {
      return null;
    }
    return {
      row: Math.floor((point.y - board.y) / board.cell),
      col: Math.floor((point.x - board.x) / board.cell),
    };
  }

  function tileChoiceRects() {
    return [0, 1, 2].map((index) => ({
      index,
      x: 972,
      y: 122 + index * 154,
      w: 250,
      h: 132,
    }));
  }

  function itemChoiceRects() {
    return [0, 1, 2].map((index) => ({
      index,
      x: 298 + index * 230,
      y: 320,
      w: 204,
      h: 250,
    }));
  }

  function onPointerMove(event) {
    pointer = { ...canvasPoint(event), down: pointer.down };
  }

  function onPointerLeave() {
    pointer.x = -1;
    pointer.y = -1;
  }

  function onPointerDown(event) {
    pointer.down = true;
    const point = canvasPoint(event);
    pointer.x = point.x;
    pointer.y = point.y;

    if (state.mode === "choose-item") {
      const itemHit = itemChoiceRects().find((rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h);
      if (itemHit) chooseItem(itemHit.index);
      return;
    }

    if (state.mode === "game-over") {
      if (point.x >= 460 && point.x <= 620 && point.y >= 520 && point.y <= 576) restartGame();
      if (point.x >= 650 && point.x <= 840 && point.y >= 520 && point.y <= 576) window.location.href = "index.html";
      return;
    }

    const tileHit = tileChoiceRects().find((rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h);
    if (tileHit) {
      state.selected = tileHit.index;
      state.recommended = findRecommendedMove();
      say(`${state.choices[state.selected].name} selected.`);
      return;
    }

    const cell = hitBoard(point);
    if (cell) placeTile(cell.row, cell.col);
  }

  function onPointerUp() {
    pointer.down = false;
  }

  function drawImageCover(img, x, y, w, h, alpha) {
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = alpha ?? 1;
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panel(x, y, w, h, options) {
    const opts = options || {};
    ctx.save();
    roundRect(x, y, w, h, opts.r || 18);
    ctx.fillStyle = opts.fill || "rgba(7, 31, 63, 0.78)";
    ctx.fill();
    ctx.lineWidth = opts.lineWidth || 2;
    ctx.strokeStyle = opts.stroke || "rgba(197, 154, 54, 0.7)";
    ctx.stroke();
    ctx.restore();
  }

  function drawText(text, x, y, size, color, weight, align, maxWidth) {
    ctx.save();
    ctx.font = `${weight || 800} ${size}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight, size, color, weight) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    ctx.save();
    ctx.font = `${weight || 700} ${size}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    for (const word of words) {
      const test = `${line}${word} `;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, currentY);
        line = `${word} `;
        currentY += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    ctx.restore();
    return currentY + lineHeight;
  }

  function drawTileArt(tile, x, y, size) {
    const img = assetImages.tiles;
    ctx.save();
    roundRect(x, y, size, size, 12);
    ctx.clip();
    if (img) {
      const index = tileSheets[tile.art] || 0;
      const columns = 4;
      const rows = 3;
      const sw = img.width / columns;
      const sh = img.height / rows;
      const sx = (index % columns) * sw;
      const sy = Math.floor(index / columns) * sh;
      ctx.save();
      ctx.translate(x + size / 2, y + size / 2);
      ctx.rotate((tile.rotation * Math.PI) / 180);
      ctx.drawImage(img, sx, sy, sw, sh, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = palette.blue;
      ctx.fillRect(x, y, size, size);
    }

    const edge = size * 0.09;
    const edges = tile.edges;
    ctx.fillStyle = edgeColors[edges[0]];
    ctx.fillRect(x, y, size, edge);
    ctx.fillStyle = edgeColors[edges[1]];
    ctx.fillRect(x + size - edge, y, edge, size);
    ctx.fillStyle = edgeColors[edges[2]];
    ctx.fillRect(x, y + size - edge, size, edge);
    ctx.fillStyle = edgeColors[edges[3]];
    ctx.fillRect(x, y, edge, size);

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    ctx.restore();
  }

  function drawItemIcon(item, x, y, w, h) {
    const img = assetImages.items;
    if (!img) return;
    const columns = 4;
    const rows = 2;
    const sw = img.width / columns;
    const sh = img.height / rows;
    const sx = (item.sheet % columns) * sw;
    const sy = Math.floor(item.sheet / columns) * sh;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawHeader() {
    panel(26, 22, 1228, 58, { r: 18, fill: "rgba(4, 17, 34, 0.86)", stroke: "rgba(197, 154, 54, 0.65)" });
    drawText("Tyler's Trial: The Lodge Floor", 52, 37, 24, palette.ink, 900);
    drawText(`Score ${state.score}`, 640, 40, 18, palette.gold, 900, "center");
    drawText(`Round ${state.round}`, 780, 40, 18, palette.lightBlue, 900, "center");
    drawText(`Time ${formatTime(state.elapsed)}`, 920, 40, 18, palette.cream, 900, "center");
    drawText(`Closed ${state.closedAreas}`, 1080, 40, 18, palette.green, 900, "center");
  }

  function drawGuide() {
    panel(28, 102, 318, 548, { r: 20, fill: "rgba(7, 31, 63, 0.82)" });
    drawText("Light Blue Guide", 54, 126, 18, palette.lightBlue, 900);
    const bubbleY = 156;
    panel(52, bubbleY, 250, 116, { r: 20, fill: "rgba(255, 247, 230, 0.96)", stroke: "rgba(197, 154, 54, 0.8)" });
    wrapText(state.message, 74, bubbleY + 22, 205, 20, 15, palette.navy, 800);

    if (assetImages.character) {
      ctx.save();
      roundRect(66, 286, 226, 334, 18);
      ctx.clip();
      ctx.fillStyle = "rgba(216, 235, 255, 0.25)";
      ctx.fillRect(66, 286, 226, 334);
      ctx.drawImage(assetImages.character, 34, 278, 276, 360);
      ctx.restore();
    }

    drawInventory();
  }

  function drawInventory() {
    const stats = [
      ["Hints", state.hints],
      ["Apron", state.shields],
      ["Gavel", state.gavels],
      ["Wild", state.columnWilds],
      ["Redraw", state.redraws],
    ];
    stats.forEach((entry, index) => {
      const x = 54 + (index % 2) * 122;
      const y = 658 + Math.floor(index / 2) * 30;
      if (y > 700) return;
      drawText(`${entry[0]} ${entry[1]}`, x, y, 13, "rgba(255,255,255,0.84)", 900);
    });
  }

  function drawBoard() {
    const hoveringCell = hitBoard(pointer);
    const flashing = state.flash && state.flash.target === "board" && state.flash.until > performance.now();
    panel(board.x - 18, board.y - 18, board.size + 36, board.size + 36, {
      r: 20,
      fill: flashing ? "rgba(158, 29, 47, 0.42)" : "rgba(255, 247, 230, 0.86)",
      stroke: "rgba(197, 154, 54, 0.9)",
      lineWidth: 3,
    });

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const x = board.x + col * board.cell;
        const y = board.y + row * board.cell;
        const key = cellKey(row, col);
        const tile = state.board[row][col];
        const isLocked = state.locked.has(key);
        const isHover = hoveringCell && hoveringCell.row === row && hoveringCell.col === col;
        const recommended = state.recommended && state.recommended.row === row && state.recommended.col === col;

        ctx.save();
        roundRect(x + 3, y + 3, board.cell - 6, board.cell - 6, 10);
        ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255, 255, 255, 0.58)" : "rgba(13, 55, 109, 0.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(7, 31, 63, 0.12)";
        ctx.stroke();

        if (isLocked) {
          ctx.fillStyle = "rgba(7, 31, 63, 0.74)";
          ctx.fill();
          drawText("LOCK", x + board.cell / 2, y + board.cell / 2 - 8, 12, palette.gold, 900, "center");
        }

        if (!tile && recommended) {
          ctx.strokeStyle = palette.gold;
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        if (!tile && isHover && state.mode === "playing") {
          const selected = state.choices[state.selected];
          const legal = selected ? isLegalPlacement(row, col, selected, state.columnWilds > 0).ok : false;
          ctx.fillStyle = legal ? "rgba(158, 208, 255, 0.34)" : "rgba(158, 29, 47, 0.24)";
          ctx.fill();
        }
        ctx.restore();

        if (tile) {
          drawTileArt(tile, x + 6, y + 6, board.cell - 12);
        }
      }
    }
  }

  function drawChoices() {
    panel(944, 102, 310, 548, { r: 20, fill: "rgba(7, 31, 63, 0.82)" });
    drawText("Tile Choices", 972, 126, 20, palette.lightBlue, 900);
    drawText("Click 1, 2, 3 or tap a card", 972, 152, 13, "rgba(255,255,255,0.72)", 800);

    tileChoiceRects().forEach((rect) => {
      const tile = state.choices[rect.index];
      if (!tile) return;
      const isSelected = rect.index === state.selected;
      panel(rect.x, rect.y, rect.w, rect.h, {
        r: 16,
        fill: isSelected ? "rgba(216, 235, 255, 0.95)" : "rgba(255, 247, 230, 0.9)",
        stroke: isSelected ? palette.gold : "rgba(197, 154, 54, 0.56)",
        lineWidth: isSelected ? 4 : 2,
      });
      drawTileArt(tile, rect.x + 16, rect.y + 16, 92);
      drawText(tile.name, rect.x + 126, rect.y + 22, 17, palette.navy, 900);
      drawText(`Value ${tile.value}`, rect.x + 126, rect.y + 48, 13, palette.blue, 900);
      drawText(tile.edges.map((edge) => edge[0].toUpperCase()).join("  "), rect.x + 126, rect.y + 74, 15, palette.gold, 900);
      drawText(`Key ${rect.index + 1}`, rect.x + rect.w - 28, rect.y + rect.h - 30, 12, palette.navy, 900, "center");
    });

    drawButtonHint(984, 582, 90, "R", "Rotate");
    drawButtonHint(1088, 582, 118, "Space", "Place hint");
  }

  function drawButtonHint(x, y, w, key, label) {
    panel(x, y, w, 42, { r: 14, fill: "rgba(255, 255, 255, 0.14)", stroke: "rgba(158, 208, 255, 0.35)" });
    drawText(key, x + 16, y + 12, 12, palette.gold, 900);
    drawText(label, x + 42, y + 12, 12, "rgba(255,255,255,0.82)", 800);
  }

  function drawFloatingTexts(dt) {
    state.floating = state.floating
      .map((floating) => ({ ...floating, y: floating.y - dt * 34, life: floating.life - dt * 0.7 }))
      .filter((floating) => floating.life > 0);

    state.floating.forEach((floating) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, floating.life);
      drawText(floating.text, floating.x, floating.y, 18, floating.color, 900);
      ctx.restore();
    });
  }

  function drawOverlay() {
    if (state.mode === "choose-item") {
      ctx.save();
      ctx.fillStyle = "rgba(3, 12, 24, 0.72)";
      ctx.fillRect(0, 0, W, H);
      panel(246, 166, 788, 438, { r: 24, fill: "rgba(7, 31, 63, 0.94)", stroke: "rgba(197, 154, 54, 0.92)", lineWidth: 4 });
      drawText("Choose an Item", 640, 198, 34, palette.cream, 900, "center");
      drawText("One useful piece for the next lodge floor", 640, 240, 16, palette.lightBlue, 800, "center");

      itemChoiceRects().forEach((rect) => {
        const item = state.itemChoices[rect.index];
        const isHover = pointer.x >= rect.x && pointer.x <= rect.x + rect.w && pointer.y >= rect.y && pointer.y <= rect.y + rect.h;
        panel(rect.x, rect.y, rect.w, rect.h, {
          r: 18,
          fill: isHover ? "rgba(255, 247, 230, 0.98)" : "rgba(255, 247, 230, 0.9)",
          stroke: isHover ? palette.lightBlue : "rgba(197, 154, 54, 0.76)",
          lineWidth: isHover ? 4 : 2,
        });
        drawItemIcon(item, rect.x + 42, rect.y + 20, 120, 88);
        drawText(item.name, rect.x + rect.w / 2, rect.y + 130, 17, palette.navy, 900, "center", rect.w - 20);
        wrapText(item.desc, rect.x + 26, rect.y + 164, rect.w - 52, 18, 13, palette.blue, 800);
      });
      ctx.restore();
    }

    if (state.mode === "game-over") {
      ctx.save();
      ctx.fillStyle = "rgba(3, 12, 24, 0.78)";
      ctx.fillRect(0, 0, W, H);
      panel(330, 190, 620, 410, { r: 24, fill: "rgba(7, 31, 63, 0.96)", stroke: "rgba(197, 154, 54, 0.94)", lineWidth: 4 });
      drawText("Trial Complete", 640, 230, 42, palette.cream, 900, "center");
      drawText(`Final Score ${state.score}`, 640, 294, 24, palette.gold, 900, "center");
      drawText(`Round ${state.round}  |  Time ${formatTime(state.elapsed)}`, 640, 330, 18, palette.lightBlue, 900, "center");
      wrapText(state.message, 448, 378, 384, 23, 16, "rgba(255,255,255,0.82)", 800);
      drawGameButton(460, 520, 160, 56, "Play Again");
      drawGameButton(650, 520, 190, 56, "Return");
      ctx.restore();
    }
  }

  function drawGameButton(x, y, w, h, label) {
    panel(x, y, w, h, { r: 16, fill: "rgba(255, 247, 230, 0.96)", stroke: "rgba(197, 154, 54, 0.86)" });
    drawText(label, x + w / 2, y + 18, 15, palette.navy, 900, "center");
  }

  function render(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    animationFrame = reducedMotion ? 0 : animationFrame + dt;
    if (state.mode !== "game-over") state.elapsed = now - state.startTime;

    drawImageCover(assetImages.bg, 0, 0, W, H, 1);
    ctx.fillStyle = "rgba(3, 12, 24, 0.2)";
    ctx.fillRect(0, 0, W, H);

    drawHeader();
    drawGuide();
    drawBoard();
    drawChoices();
    drawFloatingTexts(dt);
    drawOverlay();

    requestAnimationFrame(render);
  }

  function installEvents() {
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mouseleave", onPointerLeave);
    canvas.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mouseup", onPointerUp);
    canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      onPointerDown(event);
    }, { passive: false });
    canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      onPointerMove(event);
    }, { passive: false });
    canvas.addEventListener("touchend", onPointerUp);

    rotateButton?.addEventListener("click", rotateSelectedTile);
    redrawButton?.addEventListener("click", () => {
      if (state.gavels > 0 && state.redraws <= 0) {
        replaceSelectedTile();
      } else if (state.redraws > 0) {
        redrawChoices(false);
      } else {
        replaceSelectedTile();
      }
    });
    restartButton?.addEventListener("click", restartGame);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        window.location.href = "index.html";
        return;
      }
      if (event.key.toLowerCase() === "r") rotateSelectedTile();
      if (event.key.toLowerCase() === "g") replaceSelectedTile();
      if (event.key.toLowerCase() === "b") redrawChoices(false);
      if (["1", "2", "3"].includes(event.key) && state.mode === "playing") {
        const index = Number(event.key) - 1;
        if (state.choices[index]) {
          state.selected = index;
          state.recommended = findRecommendedMove();
          say(`${state.choices[index].name} selected.`);
        }
      }
      if (event.key === " " && state.mode === "playing") {
        event.preventDefault();
        const move = findRecommendedMove();
        if (move) placeTile(move.row, move.col);
      }
    });
  }

  function exposeDebugApi() {
    window.tylersTrialDebug = {
      getState: () => ({
        score: state.score,
        round: state.round,
        placed: state.placed,
        mode: state.mode,
        choices: state.choices.map((tile) => tile.name),
        closedAreas: state.closedAreas,
      }),
      placeRecommended: () => {
        const move = findRecommendedMove();
        if (move) placeTile(move.row, move.col);
        return Boolean(move);
      },
      forceRoundComplete: () => finishRound(),
    };
  }

  async function init() {
    resizeCanvas();
    const entries = await Promise.all(Object.entries(assets).map(async ([key, src]) => [key, await loadImage(src)]));
    entries.forEach(([key, img]) => {
      assetImages[key] = img;
    });
    loading?.setAttribute("hidden", "");
    restartGame();
    installEvents();
    exposeDebugApi();
    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resizeCanvas);
  init();
})();
