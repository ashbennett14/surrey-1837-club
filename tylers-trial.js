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
  const size = 7;
  const board = { x: 360, y: 112, size: 514 };
  board.cell = board.size / size;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const palette = {
    navy: "#071f3f",
    blue: "#0d376d",
    lightBlue: "#9ed0ff",
    gold: "#c59a36",
    cream: "#fff7e6",
    red: "#9e1d2f",
    green: "#4f8a5b",
    stone: "#c9ced6",
    ink: "#ffffff",
  };

  const zoneColors = {
    pavement: { label: "Pavement", color: "#f4ecdb", stroke: "#101825", bonus: 0, art: 0 },
    carpet: { label: "Blue Carpet", color: "#134f8f", stroke: "#d7ebff", bonus: 4, art: 1 },
    border: { label: "Gold Border", color: "#c59a36", stroke: "#5c3e09", bonus: 8, art: 2 },
    acacia: { label: "Acacia Green", color: "#4f8a5b", stroke: "#e6f5df", bonus: 10, art: 6 },
    column: { label: "Column Stone", color: "#c9ced6", stroke: "#26384d", bonus: 6, art: 3 },
    light: { label: "Warm Light", color: "#f5d36a", stroke: "#5a3f08", bonus: 12, art: 8 },
  };

  const assets = {
    bg: "assets/tylers-lodge-floor-bg.webp",
    character: "assets/tylers-lodge-character.webp",
    tiles: "assets/tylers-lodge-tiles.webp",
    items: "assets/tylers-lodge-items.webp",
    ui: "assets/tylers-lodge-ui.webp",
  };

  const assetImages = {};

  const tileTemplates = [
    { name: "Pavement Walk", center: "pavement", edges: ["pavement", "carpet", "pavement", "carpet"], score: 7 },
    { name: "Carpet Run", center: "carpet", edges: ["carpet", "carpet", "carpet", "carpet"], score: 8 },
    { name: "Gold Corner", center: "border", edges: ["pavement", "border", "border", "pavement"], score: 10 },
    { name: "Column Base", center: "column", edges: ["column", "pavement", "border", "pavement"], score: 11 },
    { name: "Acacia Walk", center: "acacia", edges: ["acacia", "border", "acacia", "border"], score: 13 },
    { name: "Book Table", center: "carpet", edges: ["carpet", "pavement", "border", "pavement"], score: 11 },
    { name: "Light Point", center: "light", edges: ["light", "border", "light", "border"], score: 14 },
    { name: "Stone Crossing", center: "column", edges: ["column", "column", "pavement", "pavement"], score: 10 },
    { name: "Outer Border", center: "border", edges: ["border", "pavement", "border", "pavement"], score: 9 },
    { name: "Green Corner", center: "acacia", edges: ["border", "acacia", "pavement", "acacia"], score: 12 },
    { name: "Bright Carpet", center: "light", edges: ["carpet", "light", "carpet", "light"], score: 13 },
    { name: "Chequer Tile", center: "pavement", edges: ["pavement", "pavement", "column", "column"], score: 9 },
  ];

  const upgrades = [
    {
      id: "summons",
      name: "Summons",
      desc: "Highlights one strong placement each turn.",
      sheet: 0,
      apply: (state) => {
        state.hints += 1;
      },
    },
    {
      id: "apron",
      name: "Apron",
      desc: "Forgives one illegal placement attempt.",
      sheet: 1,
      apply: (state) => {
        state.apron += 1;
      },
    },
    {
      id: "gavel",
      name: "Gavel",
      desc: "Allows one placed tile to be removed.",
      sheet: 2,
      apply: (state) => {
        state.gavels += 1;
      },
    },
    {
      id: "book",
      name: "Book of Constitutions",
      desc: "Adds one free redraw of all choices.",
      sheet: 3,
      apply: (state) => {
        state.redraws += 1;
      },
    },
    {
      id: "acacia",
      name: "Acacia Sprig",
      desc: "Doubles the next closed area score.",
      sheet: 4,
      apply: (state) => {
        state.acaciaDouble += 1;
      },
    },
    {
      id: "charity",
      name: "Charity Jewel",
      desc: "Adds bonus points to each closed area.",
      sheet: 5,
      apply: (state) => {
        state.charityBonus += 12;
      },
    },
    {
      id: "key",
      name: "Tyler's Key",
      desc: "Unlocks one blocked square next round.",
      sheet: 6,
      apply: (state) => {
        state.keys += 1;
      },
    },
    {
      id: "column",
      name: "Column Token",
      desc: "Allows one placement with a single mismatch.",
      sheet: 7,
      apply: (state) => {
        state.columnTokens += 1;
      },
    },
  ];

  let state;
  let pointer = { x: -1, y: -1 };
  let lastFrame = performance.now();
  let clock = 0;

  function createState() {
    return {
      grid: Array.from({ length: size }, () => Array(size).fill(null)),
      blocked: new Set(),
      scoredRegions: new Set(),
      choices: [],
      selected: 0,
      score: 0,
      round: 1,
      target: 260,
      redraws: 2,
      hints: 1,
      apron: 0,
      gavels: 0,
      keys: 0,
      acaciaDouble: 0,
      charityBonus: 0,
      columnTokens: 0,
      mode: "playing",
      message: "Place a tile beside matching colours. Close areas for the big points.",
      guideMood: "idle",
      guideUntil: 0,
      upgradeChoices: [],
      hover: null,
      hint: null,
      floating: [],
      lastPlaced: null,
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

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function choice(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function key(row, col) {
    return `${row},${col}`;
  }

  function inBounds(row, col) {
    return row >= 0 && row < size && col >= 0 && col < size;
  }

  function cloneTile(template) {
    return {
      id: Math.random().toString(36).slice(2),
      name: template.name,
      center: template.center,
      edges: template.edges.slice(),
      rotation: 0,
      score: template.score,
    };
  }

  function refillChoices() {
    while (state.choices.length < 3) {
      state.choices.push(cloneTile(choice(tileTemplates)));
    }
    state.selected = Math.min(state.selected, state.choices.length - 1);
    updateHint();
  }

  function startRound() {
    state.grid = Array.from({ length: size }, () => Array(size).fill(null));
    state.scoredRegions = new Set();
    state.choices = [];
    state.selected = 0;
    state.lastPlaced = null;
    state.blocked = makeBlockedSquares();
    while (state.keys > 0 && state.blocked.size) {
      state.keys -= 1;
      state.blocked.delete(choice(Array.from(state.blocked)));
    }
    state.mode = "playing";
    state.message = `Round ${state.round}: reach ${state.target} points or fill the floor.`;
    state.guideMood = "idle";
    refillChoices();
  }

  function makeBlockedSquares() {
    const blocked = new Set();
    if (state.round <= 1) return blocked;
    const candidates = [];
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (row >= 2 && row <= 4 && col >= 2 && col <= 4) continue;
        candidates.push(key(row, col));
      }
    }
    shuffle(candidates).slice(0, Math.min(9, state.round + 1)).forEach((cell) => blocked.add(cell));
    return blocked;
  }

  function restartGame() {
    state = createState();
    startRound();
  }

  function rotateSelected() {
    if (state.mode !== "playing") return;
    const tile = state.choices[state.selected];
    if (!tile) return;
    tile.edges = [tile.edges[3], tile.edges[0], tile.edges[1], tile.edges[2]];
    tile.rotation = (tile.rotation + 90) % 360;
    say(`${tile.name} rotated.`);
    updateHint();
  }

  function redrawChoices(force) {
    if (state.mode !== "playing") return;
    if (!force && state.redraws <= 0) {
      warn("No redraws remain.");
      return;
    }
    if (!force) state.redraws -= 1;
    state.choices = [cloneTile(choice(tileTemplates)), cloneTile(choice(tileTemplates)), cloneTile(choice(tileTemplates))];
    state.selected = 0;
    say("New tile choices drawn.");
    updateHint();
  }

  function removeWithGavel(row, col) {
    if (state.gavels <= 0 || !state.grid[row][col]) return false;
    state.grid[row][col] = null;
    state.gavels -= 1;
    state.scoredRegions = new Set();
    warn("Gavel used. That square is open again.");
    updateHint();
    return true;
  }

  function placementCheck(row, col, tile, useColumn) {
    if (!tile || !inBounds(row, col)) return { ok: false, reason: "Outside the board." };
    if (state.blocked.has(key(row, col))) return { ok: false, reason: "That square is locked." };
    if (state.grid[row][col]) return { ok: false, reason: state.gavels ? "That square is occupied. Click it again to use the gavel." : "That square is occupied." };

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
      const neighbour = state.grid[nr][nc];
      if (!neighbour) continue;
      neighbours += 1;
      if (tile.edges[edgeIndex] === neighbour.edges[oppositeIndex]) {
        matches += 1;
      } else {
        mismatches += 1;
      }
    }

    if (placedCount() > 0 && neighbours === 0) {
      return { ok: false, reason: "Tiles must touch the existing floor." };
    }
    if (mismatches > 0 && !(useColumn && mismatches === 1)) {
      return { ok: false, reason: "Neighbouring colours must match." };
    }
    if (placedCount() > 0 && matches === 0 && !useColumn) {
      return { ok: false, reason: "At least one edge must match." };
    }
    return { ok: true, matches, usedColumn: useColumn && mismatches === 1 };
  }

  function placeTile(row, col) {
    if (state.mode !== "playing") return;
    if (state.grid[row]?.[col]) {
      removeWithGavel(row, col);
      return;
    }
    const tile = state.choices[state.selected];
    const legal = placementCheck(row, col, tile, state.columnTokens > 0);
    if (!legal.ok) {
      if (state.apron > 0) {
        state.apron -= 1;
        warn(`Apron saved the move. ${legal.reason}`);
        return;
      }
      warn(legal.reason);
      return;
    }

    if (legal.usedColumn) {
      state.columnTokens -= 1;
      float("Column token", row, col, palette.lightBlue);
    }

    state.grid[row][col] = { ...tile, edges: tile.edges.slice() };
    state.lastPlaced = { row, col, t: performance.now() };
    state.choices.splice(state.selected, 1);
    state.selected = Math.max(0, Math.min(state.selected, state.choices.length - 1));
    const points = tile.score + legal.matches * 8;
    state.score += points;
    float(`+${points}`, row, col, palette.gold);
    const closures = scoreClosedAreas();
    if (closures >= 2) {
      state.score += 60;
      say("Perfect Working! Multiple areas closed.");
      state.guideMood = "celebrate";
    } else if (closures === 1) {
      state.guideMood = "pleased";
    } else {
      state.guideMood = "idle";
      say("Good fit. Now try to close a coloured area.");
    }
    state.guideUntil = performance.now() + 1200;
    refillChoices();
    checkProgress();
  }

  function placedCount() {
    return state.grid.flat().filter(Boolean).length;
  }

  function isBoardFull() {
    return placedCount() + state.blocked.size >= size * size;
  }

  function regionSignature(cells) {
    return cells.slice().sort().join("|");
  }

  function scoreClosedAreas() {
    const visited = new Set();
    let closures = 0;
    const dirs = [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ];

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const tile = state.grid[row][col];
        const startKey = key(row, col);
        if (!tile || visited.has(startKey)) continue;

        const zone = tile.center;
        const queue = [[row, col]];
        const cells = [];
        let closed = true;
        visited.add(startKey);

        while (queue.length) {
          const [r, c] = queue.shift();
          const current = state.grid[r][c];
          cells.push(key(r, c));

          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const neighbour = state.grid[nr][nc];
            const neighbourKey = key(nr, nc);
            if (!neighbour) {
              if (!state.blocked.has(neighbourKey)) closed = false;
              continue;
            }
            if (neighbour.center === zone && !visited.has(neighbourKey)) {
              visited.add(neighbourKey);
              queue.push([nr, nc]);
            }
          }
        }

        if (!closed || cells.length < 2) continue;
        const signature = regionSignature(cells);
        if (state.scoredRegions.has(signature)) continue;

        state.scoredRegions.add(signature);
        closures += 1;
        const zoneBonus = zoneColors[zone].bonus;
        let points = 40 + cells.length * (18 + zoneBonus) + state.charityBonus;
        if (state.acaciaDouble > 0) {
          points *= 2;
          state.acaciaDouble -= 1;
        }
        state.score += points;
        const [fr, fc] = cells[0].split(",").map(Number);
        float(`${zoneColors[zone].label} closed +${points}`, fr, fc, zoneColors[zone].color);
        state.message = `${zoneColors[zone].label} area closed for ${points} points.`;
      }
    }

    return closures;
  }

  function checkProgress() {
    if (state.score >= state.target || isBoardFull()) {
      finishRound();
      return;
    }
    if (!hasLegalMove() && state.redraws <= 0 && state.gavels <= 0 && state.columnTokens <= 0) {
      endGame("No legal moves remain.");
    } else if (!hasLegalMove()) {
      warn("No current tile fits. Redraw, use a token, or remove a tile with the gavel.");
    }
  }

  function hasLegalMove() {
    return state.choices.some((tile) => {
      const probe = { ...tile, edges: tile.edges.slice() };
      for (let turn = 0; turn < 4; turn += 1) {
        for (let row = 0; row < size; row += 1) {
          for (let col = 0; col < size; col += 1) {
            if (placementCheck(row, col, probe, state.columnTokens > 0).ok) return true;
          }
        }
        probe.edges = [probe.edges[3], probe.edges[0], probe.edges[1], probe.edges[2]];
      }
      return false;
    });
  }

  function findBestPlacement() {
    if (state.hints <= 0) return null;
    const tile = state.choices[state.selected];
    if (!tile) return null;
    let best = null;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const legal = placementCheck(row, col, tile, state.columnTokens > 0);
        if (!legal.ok) continue;
        const centre = 8 - Math.abs(row - 3) - Math.abs(col - 3);
        const value = legal.matches * 24 + centre;
        if (!best || value > best.value) best = { row, col, value };
      }
    }
    return best;
  }

  function updateHint() {
    state.hint = findBestPlacement();
  }

  function finishRound() {
    state.mode = "choose-upgrade";
    state.score += state.round * 70;
    state.upgradeChoices = shuffle(upgrades).slice(0, 3);
    state.guideMood = "celebrate";
    say("Round complete. Choose one item for the next working.");
  }

  function chooseUpgrade(index) {
    if (state.mode !== "choose-upgrade") return;
    const upgrade = state.upgradeChoices[index];
    if (!upgrade) return;
    upgrade.apply(state);
    state.round += 1;
    state.target += 160 + state.round * 45;
    state.redraws = Math.max(1, 3 - Math.floor(state.round / 2));
    startRound();
  }

  function endGame(reason) {
    state.mode = "game-over";
    state.guideMood = "warning";
    say(`${reason} Final score: ${state.score}.`);
  }

  function say(text) {
    state.message = text;
    if (help) help.textContent = text;
  }

  function warn(text) {
    state.guideMood = "warning";
    state.guideUntil = performance.now() + 1200;
    say(text);
  }

  function float(text, row, col, color) {
    state.floating.push({
      text,
      x: board.x + col * board.cell + board.cell / 2,
      y: board.y + row * board.cell + 12,
      color,
      life: 1,
    });
  }

  function updateFloating(dt) {
    state.floating = state.floating
      .map((item) => ({ ...item, y: item.y - dt * 40, life: item.life - dt * 0.68 }))
      .filter((item) => item.life > 0);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * W,
      y: ((source.clientY - rect.top) / rect.height) * H,
    };
  }

  function boardHit(point) {
    if (point.x < board.x || point.y < board.y || point.x > board.x + board.size || point.y > board.y + board.size) {
      return null;
    }
    return {
      row: Math.floor((point.y - board.y) / board.cell),
      col: Math.floor((point.x - board.x) / board.cell),
    };
  }

  function handRects() {
    return [0, 1, 2].map((index) => ({ index, x: 936, y: 132 + index * 148, w: 288, h: 126 }));
  }

  function upgradeRects() {
    return [0, 1, 2].map((index) => ({ index, x: 300 + index * 230, y: 318, w: 204, h: 246 }));
  }

  function onPointerMove(event) {
    pointer = canvasPoint(event);
    state.hover = boardHit(pointer);
  }

  function onPointerLeave() {
    pointer = { x: -1, y: -1 };
    state.hover = null;
  }

  function onPointerDown(event) {
    const point = canvasPoint(event);
    pointer = point;

    if (state.mode === "choose-upgrade") {
      const hit = upgradeRects().find((rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h);
      if (hit) chooseUpgrade(hit.index);
      return;
    }

    if (state.mode === "game-over") {
      if (point.x >= 462 && point.x <= 620 && point.y >= 520 && point.y <= 578) restartGame();
      if (point.x >= 650 && point.x <= 842 && point.y >= 520 && point.y <= 578) window.location.href = "index.html";
      return;
    }

    const handHit = handRects().find((rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h);
    if (handHit) {
      state.selected = handHit.index;
      say(`${state.choices[state.selected].name} selected.`);
      updateHint();
      return;
    }

    const cell = boardHit(point);
    if (cell) placeTile(cell.row, cell.col);
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

  function panel(x, y, w, h, fill, stroke, radius) {
    ctx.save();
    roundRect(x, y, w, h, radius || 18);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke || "rgba(197, 154, 54, 0.62)";
    ctx.stroke();
    ctx.restore();
  }

  function text(content, x, y, sizePx, color, weight, align, maxWidth) {
    ctx.save();
    ctx.font = `${weight || 800} ${sizePx}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(content, x, y, maxWidth);
    ctx.restore();
  }

  function wrapText(content, x, y, maxWidth, lineHeight, sizePx, color) {
    const words = content.split(" ");
    let line = "";
    let currentY = y;
    ctx.save();
    ctx.font = `800 ${sizePx}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    words.forEach((word) => {
      const test = `${line}${word} `;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, currentY);
        line = `${word} `;
        currentY += lineHeight;
      } else {
        line = test;
      }
    });
    ctx.fillText(line.trim(), x, currentY);
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

  function drawTileTexture(tile, x, y, tileSize) {
    const img = assetImages.tiles;
    if (!img) return;
    const zone = zoneColors[tile.center];
    const columns = 4;
    const rows = 3;
    const sw = img.width / columns;
    const sh = img.height / rows;
    const sx = (zone.art % columns) * sw;
    const sy = Math.floor(zone.art / columns) * sh;
    ctx.save();
    roundRect(x, y, tileSize, tileSize, 12);
    ctx.clip();
    ctx.translate(x + tileSize / 2, y + tileSize / 2);
    ctx.rotate((tile.rotation * Math.PI) / 180);
    ctx.drawImage(img, sx, sy, sw, sh, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
    ctx.restore();
  }

  function drawTile(tile, x, y, tileSize, options) {
    const opts = options || {};
    const zone = zoneColors[tile.center];
    ctx.save();
    if (opts.alpha) ctx.globalAlpha = opts.alpha;
    panel(x, y, tileSize, tileSize, "rgba(255, 247, 230, 0.95)", opts.selected ? palette.gold : "rgba(7, 31, 63, 0.2)", 12);
    drawTileTexture(tile, x + 4, y + 4, tileSize - 8);
    ctx.fillStyle = zone.color;
    roundRect(x + tileSize * 0.27, y + tileSize * 0.27, tileSize * 0.46, tileSize * 0.46, 8);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = zone.stroke;
    ctx.stroke();

    const edge = tileSize * 0.12;
    tile.edges.forEach((edgeName, index) => {
      ctx.fillStyle = zoneColors[edgeName].color;
      if (index === 0) ctx.fillRect(x + edge, y + 5, tileSize - edge * 2, edge);
      if (index === 1) ctx.fillRect(x + tileSize - edge - 5, y + edge, edge, tileSize - edge * 2);
      if (index === 2) ctx.fillRect(x + edge, y + tileSize - edge - 5, tileSize - edge * 2, edge);
      if (index === 3) ctx.fillRect(x + 5, y + edge, edge, tileSize - edge * 2);
    });

    if (opts.preview) {
      ctx.fillStyle = opts.legal ? "rgba(158, 208, 255, 0.36)" : "rgba(158, 29, 47, 0.28)";
      roundRect(x, y, tileSize, tileSize, 12);
      ctx.fill();
    }

    if (opts.pulse) {
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 5;
      roundRect(x + 2, y + 2, tileSize - 4, tileSize - 4, 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoard() {
    panel(board.x - 18, board.y - 18, board.size + 36, board.size + 36, "rgba(255, 247, 230, 0.92)", "rgba(197, 154, 54, 0.95)", 20);
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const x = board.x + col * board.cell;
        const y = board.y + row * board.cell;
        const cell = key(row, col);
        const tile = state.grid[row][col];
        const hover = state.hover?.row === row && state.hover?.col === col;
        const hinted = state.hint?.row === row && state.hint?.col === col;
        const blocked = state.blocked.has(cell);

        ctx.save();
        roundRect(x + 3, y + 3, board.cell - 6, board.cell - 6, 9);
        ctx.fillStyle = (row + col) % 2 ? "rgba(7, 31, 63, 0.13)" : "rgba(255, 255, 255, 0.7)";
        ctx.fill();
        ctx.strokeStyle = "rgba(7, 31, 63, 0.14)";
        ctx.stroke();
        if (blocked) {
          ctx.fillStyle = "rgba(7, 31, 63, 0.78)";
          ctx.fill();
          text("LOCK", x + board.cell / 2, y + board.cell / 2 - 8, 12, palette.gold, 900, "center");
        }
        if (hinted && state.mode === "playing") {
          ctx.strokeStyle = palette.gold;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        ctx.restore();

        if (tile) {
          const pulse = state.lastPlaced?.row === row && state.lastPlaced?.col === col && performance.now() - state.lastPlaced.t < 450;
          drawTile(tile, x + 5, y + 5, board.cell - 10, { pulse });
        } else if (hover && state.mode === "playing" && state.choices[state.selected] && !blocked) {
          const candidate = state.choices[state.selected];
          const legal = placementCheck(row, col, candidate, state.columnTokens > 0).ok;
          drawTile(candidate, x + 5, y + 5, board.cell - 10, { preview: true, legal, alpha: 0.76 });
        }
      }
    }
  }

  function drawHand() {
    panel(920, 98, 330, 552, "rgba(7, 31, 63, 0.84)", "rgba(197, 154, 54, 0.5)", 20);
    text("Tile Choices", 946, 122, 20, palette.lightBlue, 900);
    text("1-3 select / R rotates", 946, 150, 13, "rgba(255,255,255,0.72)", 800);
    handRects().forEach((rect) => {
      const tile = state.choices[rect.index];
      if (!tile) return;
      const selected = rect.index === state.selected;
      panel(rect.x, rect.y, rect.w, rect.h, selected ? "rgba(216,235,255,0.98)" : "rgba(255,247,230,0.9)", selected ? palette.gold : "rgba(197,154,54,0.48)", 16);
      drawTile(tile, rect.x + 14, rect.y + 14, 94, { selected });
      text(tile.name, rect.x + 122, rect.y + 22, 17, palette.navy, 900, "left", 146);
      text(zoneColors[tile.center].label, rect.x + 122, rect.y + 50, 12, palette.blue, 900, "left", 148);
      text(tile.edges.map((edge) => edge[0].toUpperCase()).join("  "), rect.x + 122, rect.y + 76, 14, palette.gold, 900);
      text(`Key ${rect.index + 1}`, rect.x + rect.w - 40, rect.y + rect.h - 28, 12, palette.navy, 900, "center");
    });

    const inventory = [
      ["Redraw", state.redraws],
      ["Apron", state.apron],
      ["Gavel", state.gavels],
      ["Column", state.columnTokens],
      ["Acacia x2", state.acaciaDouble],
      ["Charity", state.charityBonus],
    ];
    inventory.forEach((item, index) => {
      const x = 946 + (index % 2) * 142;
      const y = 594 + Math.floor(index / 2) * 18;
      text(`${item[0]} ${item[1]}`, x, y, 12, "rgba(255,255,255,0.82)", 900);
    });
  }

  function drawGuide() {
    panel(34, 98, 292, 552, "rgba(7, 31, 63, 0.84)", "rgba(197, 154, 54, 0.5)", 20);
    text("Light Blue Guide", 60, 122, 18, palette.lightBlue, 900);
    panel(60, 154, 240, 126, "rgba(255, 247, 230, 0.96)", "rgba(197,154,54,0.74)", 18);
    wrapText(state.message, 82, 176, 196, 20, 14, palette.navy);
    if (assetImages.character) {
      ctx.save();
      if (state.guideMood === "warning") ctx.filter = "saturate(1.2) hue-rotate(-18deg)";
      if (state.guideMood === "pleased" || state.guideMood === "celebrate") ctx.filter = "saturate(1.2) brightness(1.08)";
      const bounce = !reducedMotion && state.guideMood === "celebrate" ? Math.sin(clock * 8) * 6 : 0;
      ctx.drawImage(assetImages.character, 42, 310 + bounce, 248, 310);
      ctx.restore();
    }
  }

  function drawHeader() {
    panel(26, 22, 1228, 58, "rgba(4, 17, 34, 0.86)", "rgba(197, 154, 54, 0.65)", 18);
    text("Tyler's Trial: Lodge Floor", 52, 37, 24, palette.ink, 900);
    text(`Score ${state.score}`, 604, 40, 18, palette.gold, 900, "center");
    text(`Target ${state.target}`, 752, 40, 18, palette.cream, 900, "center");
    text(`Round ${state.round}`, 902, 40, 18, palette.lightBlue, 900, "center");
    text(`${placedCount()}/${size * size - state.blocked.size} Tiles`, 1088, 40, 18, palette.green, 900, "center");
  }

  function drawFloating() {
    state.floating.forEach((item) => {
      ctx.save();
      ctx.globalAlpha = item.life;
      text(item.text, item.x, item.y, 18, item.color, 900, "center", 220);
      ctx.restore();
    });
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

  function drawOverlay() {
    if (state.mode === "choose-upgrade") {
      ctx.fillStyle = "rgba(3, 12, 24, 0.72)";
      ctx.fillRect(0, 0, W, H);
      panel(246, 164, 788, 442, "rgba(7,31,63,0.96)", "rgba(197,154,54,0.92)", 24);
      text("Round Complete", 640, 198, 38, palette.cream, 900, "center");
      text("Choose one item for the next working", 640, 244, 16, palette.lightBlue, 900, "center");
      upgradeRects().forEach((rect) => {
        const upgrade = state.upgradeChoices[rect.index];
        const hover = pointer.x >= rect.x && pointer.x <= rect.x + rect.w && pointer.y >= rect.y && pointer.y <= rect.y + rect.h;
        panel(rect.x, rect.y, rect.w, rect.h, hover ? "rgba(255,247,230,0.99)" : "rgba(255,247,230,0.9)", hover ? palette.lightBlue : "rgba(197,154,54,0.76)", 18);
        drawItemIcon(upgrade, rect.x + 44, rect.y + 26, 116, 90);
        text(upgrade.name, rect.x + rect.w / 2, rect.y + 132, 16, palette.navy, 900, "center", rect.w - 18);
        wrapText(upgrade.desc, rect.x + 28, rect.y + 168, rect.w - 56, 19, 14, palette.blue);
      });
    }

    if (state.mode === "game-over") {
      ctx.fillStyle = "rgba(3, 12, 24, 0.78)";
      ctx.fillRect(0, 0, W, H);
      panel(330, 188, 620, 416, "rgba(7,31,63,0.96)", "rgba(197,154,54,0.94)", 24);
      text("Trial Complete", 640, 230, 42, palette.cream, 900, "center");
      text(`Final Score ${state.score}`, 640, 294, 24, palette.gold, 900, "center");
      text(`Round ${state.round}`, 640, 330, 18, palette.lightBlue, 900, "center");
      wrapText(state.message, 450, 380, 380, 23, 16, "rgba(255,255,255,0.84)");
      drawButton(462, 520, 158, 58, "Play Again");
      drawButton(650, 520, 192, 58, "Return");
    }
  }

  function drawButton(x, y, w, h, label) {
    panel(x, y, w, h, "rgba(255,247,230,0.96)", "rgba(197,154,54,0.86)", 16);
    text(label, x + w / 2, y + 19, 15, palette.navy, 900, "center");
  }

  function render(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!reducedMotion) clock += dt;
    updateFloating(dt);
    drawImageCover(assetImages.bg, 0, 0, W, H, 1);
    ctx.fillStyle = "rgba(3, 12, 24, 0.16)";
    ctx.fillRect(0, 0, W, H);
    drawHeader();
    drawGuide();
    drawBoard();
    drawHand();
    drawFloating();
    drawOverlay();
    requestAnimationFrame(render);
  }

  function installEvents() {
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mouseleave", onPointerLeave);
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      onPointerDown(event);
    }, { passive: false });
    canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      onPointerMove(event);
    }, { passive: false });
    rotateButton?.addEventListener("click", rotateSelected);
    redrawButton?.addEventListener("click", () => redrawChoices(false));
    restartButton?.addEventListener("click", restartGame);

    document.addEventListener("keydown", (event) => {
      const pressed = event.key.toLowerCase();
      if (pressed === "escape") {
        window.location.href = "index.html";
        return;
      }
      if (pressed === "r") rotateSelected();
      if (pressed === "b") redrawChoices(false);
      if (["1", "2", "3"].includes(pressed) && state.mode === "playing") {
        const index = Number(pressed) - 1;
        if (state.choices[index]) {
          state.selected = index;
          updateHint();
          say(`${state.choices[index].name} selected.`);
        }
      }
      if (pressed === " " && state.mode === "playing") {
        event.preventDefault();
        const move = findBestPlacement();
        if (move) placeTile(move.row, move.col);
      }
    });
  }

  function exposeDebugApi() {
    window.tylersTrialDebug = {
      getState: () => ({
        score: state.score,
        round: state.round,
        mode: state.mode,
        target: state.target,
        placed: placedCount(),
        choices: state.choices.map((tile) => tile.name),
        hint: state.hint,
      }),
      placeFirstLegal: () => {
        const move = findBestPlacement();
        if (!move) return false;
        placeTile(move.row, move.col);
        return true;
      },
      forceRoundComplete: () => finishRound(),
      chooseUpgrade: (index = 0) => chooseUpgrade(index),
      forceNoMoves: () => {
        state.redraws = 0;
        state.gavels = 0;
        state.columnTokens = 0;
        state.choices = [];
        checkProgress();
      },
    };
  }

  async function init() {
    resizeCanvas();
    const entries = await Promise.all(Object.entries(assets).map(async ([name, src]) => [name, await loadImage(src)]));
    entries.forEach(([name, img]) => {
      assetImages[name] = img;
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
