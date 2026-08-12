(function () {
  const canvas = document.querySelector("#lodgeGameCanvas");
  const loading = document.querySelector("#lodgeGameLoading");
  const help = document.querySelector("#lodgeGameHelp");
  const beginButton = document.querySelector("#gameRotate");
  const alarmButton = document.querySelector("#gameRedraw");
  const restartButton = document.querySelector("#gameRestart");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = 1280;
  const H = 720;
  const DPR = Math.max(1, Math.min(1.5, window.devicePixelRatio || 1));
  const GRID = 8;
  const CELL = 64;
  const board = { x: 386, y: 128, w: GRID * CELL, h: GRID * CELL };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const palette = {
    navy: "#061a36",
    blue: "#0c376e",
    royal: "#135ca3",
    lightBlue: "#9fd4ff",
    gold: "#c99a35",
    cream: "#fff6df",
    ivory: "#f5ead2",
    crimson: "#a82431",
    green: "#4d9658",
    mahogany: "#4a2618",
    ink: "#17243a",
    white: "#ffffff",
  };

  const resources = {
    ashlar: {
      label: "Ashlar",
      short: "Ashlar",
      color: "#d8d2c2",
      dark: "#7a7468",
      tower: ["Ashlar Guard", "Dressed Ashlar", "Perfect Ashlar"],
      range: [120, 145, 175],
      damage: [16, 34, 72],
      rate: [0.92, 0.78, 0.64],
      icon: "stone",
      role: "Reliable balanced damage",
      detail: "Balanced medium-range defence with steady damage. Good all-round coverage and reliable against heavy threats.",
    },
    candle: {
      label: "Candle",
      short: "Candle",
      color: "#f7d36a",
      dark: "#9c6f1d",
      tower: ["Candle Stand", "Lesser Light", "Greater Light"],
      range: [180, 220, 265],
      damage: [12, 25, 48],
      rate: [1.15, 0.95, 0.78],
      icon: "flame",
      role: "Long-range slower attack",
      detail: "Long-range golden ray. Fires more slowly, but reaches deep into the Lodge floor and counters heavy or disruptive threats.",
    },
    tool: {
      label: "Lewis",
      short: "Lewis",
      color: "#65c7e8",
      dark: "#1b6682",
      tower: ["Lewis Support", "Senior Lewis", "Grand Lewis"],
      range: [112, 135, 160],
      damage: [6, 12, 22],
      rate: [0.72, 0.58, 0.46],
      support: [1.18, 1.28, 1.42],
      icon: "lewis",
      role: "Nearby attack-speed support",
      detail: "Support defence. Does not attack directly, but boosts nearby defences so they fire faster.",
    },
    acacia: {
      label: "Wand",
      short: "Wand",
      color: "#8d73dc",
      dark: "#443282",
      tower: ["Steward's Wand", "Deacon's Wand", "Director's Wand"],
      range: [112, 135, 156],
      damage: [5, 11, 20],
      rate: [1.0, 0.82, 0.66],
      slow: [0.62, 0.5, 0.38],
      icon: "wand",
      role: "Slows fast-moving threats",
      detail: "Slowing defence. Wands are best placed where fast threats can be held in range of stronger towers.",
    },
    gold: {
      label: "Jewels",
      short: "Jewels",
      color: "#e1515d",
      dark: "#84202a",
      tower: ["Officer's Jewel", "Collar Jewel", "Provincial Jewel"],
      range: [116, 140, 166],
      damage: [9, 18, 34],
      rate: [1.25, 1.05, 0.88],
      reward: true,
      icon: "jewel",
      role: "Bonus and reward structure",
      detail: "Reward structure. Lower direct damage, but creates bonus score and helpful rewards when merged.",
    },
  };

  const resourceKeys = Object.keys(resources);
  const defenceGuide = {
    ashlar: resources.ashlar.detail,
    candle: resources.candle.detail,
    tool: resources.tool.detail,
    acacia: resources.acacia.detail,
    gold: resources.gold.detail,
  };
  const abilityGuide = {
    sword: "Combat: turn away the nearest threat. Uses one Tyler charge.",
    guard: "Combat: guard the Lodge entrance for five seconds.",
    installation: "Setup: randomise the whole board once before the Trial begins.",
    close: "Combat: close the Lodge briefly, freezing all threats on the path.",
  };
  const localLeaderboardKey = "tylersTrialLocalScores";
  const chapters = [
    { name: "Entered Apprentice", min: 1 },
    { name: "Fellow Craft", min: 11 },
    { name: "Master Mason", min: 21 },
    { name: "The Master's Challenges", min: 31 },
  ];

  const assets = {
    bg: "assets/tylers-lodge-floor-bg-v2.webp",
    character: "assets/tylers-lodge-character-v3.png",
    items: "assets/tylers-lodge-items.webp",
    ui: "assets/tylers-lodge-ui.webp",
    tylerSheet: "assets/tylers-trial-tyler-sheet-v1.png",
    defenceSheet: "assets/tylers-trial-defences-v1.png",
    enemySheet: "assets/tylers-trial-enemies-v1.png",
    uiSheet: "assets/tylers-trial-ui-v1.png",
    logo: "assets/surrey-1837-club-badge.png",
  };
  const images = {};
  const spriteColumns = {
    tyler: 5,
    defence: 5,
    enemy: 4,
  };
  const defenceSpriteIndex = { ashlar: 0, candle: 1, tool: 2, acacia: 3, gold: 4 };
  const enemySpriteIndex = { cowan: 0, mischief: 0, ruffian: 1, discord: 2, lewis: 3 };
  const tylerPoseIndex = { idle: 0, ready: 1, pleased: 2, guard: 3, strike: 4, warning: 3 };

  const pathCells = [
    [7, 0], [7, 1], [6, 1], [5, 1], [5, 2], [4, 2], [4, 3],
    [3, 3], [3, 4], [2, 4], [1, 4], [0, 4],
  ];
  const secondPathCells = [
    [7, 7], [7, 6], [6, 6], [5, 6], [5, 5], [4, 5], [4, 4],
    [3, 4], [2, 4], [1, 4], [0, 4],
  ];

  const enemyTypes = {
    cowan: { name: "Cowan", trait: "Fast", counter: "Wand slow", color: "#6e70c8", hp: 34, speed: 44, reward: 11, size: 12, weakTo: ["acacia"] },
    ruffian: { name: "Ruffian", trait: "Heavy", counter: "Ashlar or Candle", color: "#9b4b37", hp: 90, speed: 27, reward: 22, size: 17, weakTo: ["ashlar", "candle"] },
    mischief: { name: "Mischief", trait: "Swift", counter: "Wand slow", color: "#28324d", hp: 46, speed: 56, reward: 15, size: 11, weakTo: ["acacia"] },
    discord: { name: "Discord", trait: "Disruptive", counter: "Candle focus", color: "#a82468", hp: 72, speed: 34, reward: 20, size: 14, aura: true, disrupt: 0.78, weakTo: ["candle"] },
    lewis: { name: "Lewis Breaker", trait: "Boss", counter: "Focused fire", color: "#77736a", hp: 230, speed: 22, reward: 75, size: 24, boss: true, weakTo: ["ashlar", "candle", "gold"] },
  };

  let state;
  let pointer = { x: -1, y: -1 };
  let last = performance.now();
  let clock = 0;
  let leaderboardUi;

  function emptyState() {
    return {
      mode: "menu",
      trial: 1,
      score: 0,
      security: 10,
      maxSecurity: 10,
      swaps: swapsForTrial(1),
      selected: null,
      board: createBoard(),
      enemies: [],
      projectiles: [],
      particles: [],
      floaters: [],
      supportPulses: [],
      matchHighlights: [],
      wave: { timer: 0, spawned: 0, total: 0, done: false, bossAnnounced: false },
      tyler: { charges: 3, guard: 0, alarm: 0, closed: 0, installation: 1, stance: "idle" },
      stats: {
        defeated: 0,
        defeatedThisTrial: 0,
        highest: 0,
        bestChain: 0,
        bosses: 0,
        builtThisTrial: 0,
        mergedThisTrial: 0,
      },
      objective: null,
      message: "Begin the Trial and prepare the Lodge.",
      chest: null,
      eventCard: null,
      inspect: null,
      leaderboardOpen: false,
      helpOpen: false,
      transition: 0,
      shake: 0,
      highScore: Number(localStorage.getItem("tylersTrialHighScore") || 0),
      muted: localStorage.getItem("tylersTrialMuted") === "true",
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

  function swapsForTrial(trial) {
    return Math.max(8, Math.round((18 + Math.floor((trial - 1) / 3)) * 0.67));
  }

  function resizeCanvas() {
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.aspectRatio = `${W} / ${H}`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function rand(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cellKey(row, col) {
    return `${row},${col}`;
  }

  function isPath(row, col) {
    return pathCells.concat(secondPathCells).some(([r, c]) => r === row && c === col);
  }

  function isLodgeDoor(row, col) {
    return row === 0 && col === 4;
  }

  function makeTile(kind) {
    return { kind, level: 0, tower: false, charged: false, id: Math.random().toString(36).slice(2) };
  }

  function createBoard() {
    const cells = [];
    for (let row = 0; row < GRID; row += 1) {
      const line = [];
      for (let col = 0; col < GRID; col += 1) {
        if (isPath(row, col) || isLodgeDoor(row, col)) {
          line.push({ path: true, tile: null });
          continue;
        }
        const blockedKinds = new Set();
        if (col >= 2 && line[col - 1]?.tile?.kind && line[col - 1]?.tile?.kind === line[col - 2]?.tile?.kind) {
          blockedKinds.add(line[col - 1].tile.kind);
        }
        if (row >= 2 && cells[row - 1]?.[col]?.tile?.kind && cells[row - 1]?.[col]?.tile?.kind === cells[row - 2]?.[col]?.tile?.kind) {
          blockedKinds.add(cells[row - 1][col].tile.kind);
        }
        const options = resourceKeys.filter((kind) => !blockedKinds.has(kind));
        line.push({ path: false, tile: makeTile(rand(options.length ? options : resourceKeys)) });
      }
      cells.push(line);
    }
    return cells;
  }

  function startGame() {
    const muted = state?.muted || false;
    state = emptyState();
    state.muted = muted;
    state.board = createBoard();
    state.mode = "prep";
    hideLeaderboard();
    setTrialObjective();
    say("Prepare the Lodge. Swap adjacent tiles; three resources become defences.");
  }

  function beginCombat() {
    if (state.mode !== "prep") return;
    state.mode = "combat";
    state.selected = null;
    state.wave = makeWave();
    state.transition = 0.85;
    say("THE TRIAL BEGINS. Your defences will work automatically.");
    state.tyler.stance = "ready";
    knock();
  }

  function makeWave() {
    const boss = state.trial % 10 === 0;
    const total = boss ? 1 : 7 + Math.floor(state.trial * 1.7);
    return { timer: 0.85, spawned: 0, total, done: false, bossAnnounced: boss };
  }

  function nextTrial() {
    checkEndOfTrialObjective();
    state.trial += 1;
    state.mode = "prep";
    state.swaps = swapsForTrial(state.trial);
    state.enemies = [];
    state.projectiles = [];
    state.selected = null;
    state.tyler.charges = Math.min(4, state.tyler.charges + 1);
    state.tyler.guard = 0;
    state.tyler.alarm = 0;
    state.tyler.closed = 0;
    state.tyler.installation = 1;
    refillEmptyTiles();
    if ((state.trial - 1) % 10 === 0) {
      randomiseEntryLevelDefences();
      say("A new Degree begins. The board has been randomised, but only non-upgraded defences have moved.");
    } else {
      say("THE LODGE IS SECURE. Prepare for the next Trial.");
    }
    setTrialObjective();
    if (state.trial % 5 === 1) {
      state.eventCard = randomEventCard();
    }
  }

  function resetTrialStats() {
    state.stats.defeatedThisTrial = 0;
    state.stats.builtThisTrial = 0;
    state.stats.mergedThisTrial = 0;
    state.stats.heavyDefeatedThisTrial = 0;
    state.stats.swapsAtStart = state.swaps;
  }

  function setTrialObjective() {
    resetTrialStats();
    const trial = state.trial;
    const templates = [
      { kind: "build", text: "Build 3 defences", target: 3, bonus: 180 },
      { kind: "merge", text: "Merge one stronger defence", target: 1, bonus: 170 },
      { kind: "defeatHeavy", text: "Defeat a heavy threat", target: 1, bonus: 210 },
      { kind: "efficient", text: "Keep 3 swaps in reserve", target: 3, bonus: 190 },
      { kind: "security", text: "Keep Lodge Security above 8", target: 9, bonus: 210 },
      { kind: "defeat", text: "Defeat all threats", target: makeWave().total, bonus: 210 },
    ];
    const objective = trial === 1 ? templates[0] : templates[(trial - 1) % templates.length];
    if (trial % 10 === 0) {
      state.objective = { kind: "boss", text: "Turn away the boss threat", target: 1, progress: 0, bonus: 360, completed: false };
    } else {
      state.objective = { ...objective, progress: 0, completed: false };
    }
  }

  function recordObjective(kind, amount = 1) {
    const objective = state.objective;
    if (!objective || objective.completed || objective.kind !== kind) return;
    objective.progress = Math.min(objective.target, objective.progress + amount);
    if (objective.progress >= objective.target) completeObjective();
  }

  function checkEndOfTrialObjective() {
    const objective = state.objective;
    if (!objective || objective.completed) return;
    if (objective.kind === "security" && state.security >= objective.target) completeObjective();
    if (objective.kind === "defeat" && state.wave.spawned >= state.wave.total && !state.enemies.length) completeObjective();
    if (objective.kind === "efficient" && state.swaps >= objective.target) completeObjective();
  }

  function completeObjective() {
    const objective = state.objective;
    if (!objective || objective.completed) return;
    objective.completed = true;
    state.score += objective.bonus;
    floatText(`OBJECTIVE +${objective.bonus}`, board.x + board.w / 2, board.y - 56, palette.gold, 20);
    say(`Objective complete: ${objective.text}. Bonus awarded.`);
  }

  function objectiveProgressText() {
    const objective = state.objective;
    if (!objective) return "";
    if (objective.completed) return `Complete +${objective.bonus}`;
    if (objective.kind === "security") return `${state.security}/${objective.target}+ security`;
    if (objective.kind === "efficient") return `${state.swaps}/${objective.target}+ swaps`;
    return `${Math.min(objective.progress, objective.target)}/${objective.target}`;
  }

  function randomEventCard() {
    const cards = [
      {
        title: "A Visiting Brother",
        body: "Gain three additional swaps.",
        apply: () => { state.swaps += 3; },
      },
      {
        title: "Festive Board",
        body: "The next Trial begins with all defences working faster.",
        apply: () => { state.tyler.alarm = 6; },
      },
      {
        title: "The Architect Arrives",
        body: "One random defence is upgraded.",
        apply: upgradeRandomTower,
      },
      {
        title: "Provincial Visit",
        body: "Restore two Lodge Security.",
        apply: () => { state.security = Math.min(state.maxSecurity, state.security + 2); },
      },
    ];
    return rand(cards);
  }

  function refillEmptyTiles() {
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const cell = state.board[row][col];
        if (!cell.path && !cell.tile) cell.tile = makeTile(rand(resourceKeys));
      }
    }
  }

  function boardPoint(row, col) {
    return { x: board.x + col * CELL + CELL / 2, y: board.y + row * CELL + CELL / 2 };
  }

  function pathPoint(enemy) {
    const path = enemy.path;
    const index = Math.min(path.length - 1, Math.floor(enemy.progress));
    const next = Math.min(path.length - 1, index + 1);
    const t = enemy.progress - index;
    const a = boardPoint(path[index][0], path[index][1]);
    const b = boardPoint(path[next][0], path[next][1]);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function rectHit(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return { x: ((source.clientX - rect.left) / rect.width) * W, y: ((source.clientY - rect.top) / rect.height) * H };
  }

  function hitCell(point) {
    if (point.x < board.x || point.y < board.y || point.x > board.x + board.w || point.y > board.y + board.h) return null;
    const col = Math.floor((point.x - board.x) / CELL);
    const row = Math.floor((point.y - board.y) / CELL);
    if (row < 0 || row >= GRID || col < 0 || col >= GRID) return null;
    return { row, col };
  }

  function adjacent(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  }

  function swapCells(a, b) {
    const ca = state.board[a.row][a.col];
    const cb = state.board[b.row][b.col];
    if (ca.path || cb.path || !ca.tile || !cb.tile) return;
    [ca.tile, cb.tile] = [cb.tile, ca.tile];
    state.swaps -= 1;
    particle(boardPoint(a.row, a.col), palette.gold, 18);
    particle(boardPoint(b.row, b.col), palette.lightBlue, 18);
    say("Tiles swapped. Matches may build or strengthen your defences.");
    const chain = resolveMatches(false, [a, b]);
    if (chain === 0) say("No match this time. Positioning still matters.");
    if (state.swaps <= 0) beginCombat();
  }

  function findMatches() {
    const matches = [];
    for (let row = 0; row < GRID; row += 1) {
      let run = [];
      for (let col = 0; col < GRID; col += 1) {
        const tile = state.board[row][col].tile;
        const marker = tile ? `${tile.kind}-${tile.level}-${tile.tower ? "t" : "r"}` : "";
        const prev = run.length ? run[run.length - 1].marker : null;
        if (marker && marker === prev) run.push({ row, col, marker });
        else {
          if (run.length >= 3) matches.push(run);
          run = marker ? [{ row, col, marker }] : [];
        }
      }
      if (run.length >= 3) matches.push(run);
    }
    for (let col = 0; col < GRID; col += 1) {
      let run = [];
      for (let row = 0; row < GRID; row += 1) {
        const tile = state.board[row][col].tile;
        const marker = tile ? `${tile.kind}-${tile.level}-${tile.tower ? "t" : "r"}` : "";
        const prev = run.length ? run[run.length - 1].marker : null;
        if (marker && marker === prev) run.push({ row, col, marker });
        else {
          if (run.length >= 3) matches.push(run);
          run = marker ? [{ row, col, marker }] : [];
        }
      }
      if (run.length >= 3) matches.push(run);
    }
    return matches;
  }

  function resolveMatches(silent, seedCells) {
    let chains = 0;
    let guard = 0;
    let activeCells = seedCells?.length ? new Set(seedCells.map((cell) => cellKey(cell.row, cell.col))) : null;
    while (guard < 8) {
      guard += 1;
      let raw = findMatches();
      if (activeCells) raw = raw.filter((group) => group.some((cell) => activeCells.has(cellKey(cell.row, cell.col))));
      if (!raw.length) break;
      chains += 1;
      const used = new Set();
      const clearedCells = [];
      const nextActive = new Set();
      raw.forEach((group) => {
        const cells = group.filter((cell) => !used.has(cellKey(cell.row, cell.col)));
        if (cells.length < 3) return;
        cells.forEach((cell) => used.add(cellKey(cell.row, cell.col)));
        const result = mergeGroup(cells);
        result.cleared.forEach((cell) => {
          clearedCells.push(cell);
          nextActive.add(cellKey(cell.row, cell.col));
        });
        nextActive.add(cellKey(result.anchor.row, result.anchor.col));
      });
      refillClearedCells(clearedCells);
      activeCells = nextActive.size ? nextActive : null;
      if (seedCells?.length) break;
    }
    state.stats.bestChain = Math.max(state.stats.bestChain, chains);
    if (!silent && chains > 0) {
      const harmony = chains > 2 ? "SUBLIME HARMONY" : chains > 1 ? "PERFECT HARMONY" : "HARMONY";
      floatText(harmony, board.x + board.w / 2, board.y - 28, palette.gold, 28);
      state.score += chains * 30;
    }
    return chains;
  }

  function mergeGroup(cells) {
    const anchor = cells[Math.floor(cells.length / 2)];
    const tile = state.board[anchor.row][anchor.col].tile;
    if (!tile) return { anchor, cleared: [] };
    const wasTower = tile.tower;
    const next = { kind: tile.kind, level: tile.level, tower: true, charged: cells.length >= 4, id: Math.random().toString(36).slice(2) };
    if (tile.tower) next.level = Math.min(2, tile.level + 1);
    state.board[anchor.row][anchor.col].tile = next;
    state.stats.highest = Math.max(state.stats.highest, next.level + 1);
    const cleared = [];
    cells.forEach((cell) => {
      if (cell.row === anchor.row && cell.col === anchor.col) return;
      state.board[cell.row][cell.col].tile = null;
      cleared.push(cell);
    });
    const point = boardPoint(anchor.row, anchor.col);
    const definition = resources[next.kind];
    const label = next.tower ? definition.tower[next.level] : definition.label;
    state.matchHighlights.push({
      cells: cells.map((cell) => ({ row: cell.row, col: cell.col })),
      color: definition.color,
      life: 0.7,
    });
    state.score += 25 + cells.length * 10 + next.level * 35;
    particle(point, definition.color, cells.length >= 5 ? 42 : 26);
    floatText(label, point.x, point.y - 18, definition.color, 17);
    if (wasTower) {
      state.stats.mergedThisTrial += 1;
      recordObjective("merge", 1);
    } else {
      state.stats.builtThisTrial += 1;
      recordObjective("build", 1);
    }
    if (next.kind === "gold" && next.tower) openChest();
    return { anchor, cleared };
  }

  function refillClearedCells(cells) {
    const unique = new Map();
    cells.forEach((cell) => unique.set(cellKey(cell.row, cell.col), cell));
    unique.forEach((cell) => {
      const boardCell = state.board[cell.row]?.[cell.col];
      if (!boardCell || boardCell.path || boardCell.tile) return;
      boardCell.tile = makeTile(rand(resourceKeys));
      particle(boardPoint(cell.row, cell.col), "rgba(255,246,223,0.95)", 8);
    });
  }

  function openChest() {
    const rewards = [
      () => { state.swaps += 3; say("Treasurer's Chest: +3 swaps."); },
      () => { state.security = Math.min(state.maxSecurity, state.security + 1); say("Treasurer's Chest: Lodge Security restored."); },
      () => { upgradeRandomTower(); say("Treasurer's Chest: one defence upgraded."); },
      () => { state.score += 180; say("Treasurer's Chest: charity bonus awarded."); },
    ];
    state.chest = 1.4;
    rand(rewards)();
  }

  function shuffleBoard() {
    const tiles = [];
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const cell = state.board[row][col];
        if (!cell.path && cell.tile) tiles.push(cell.tile);
      }
    }
    for (let index = tiles.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [tiles[index], tiles[target]] = [tiles[target], tiles[index]];
    }
    let cursor = 0;
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const cell = state.board[row][col];
        if (!cell.path && cell.tile) {
          cell.tile = tiles[cursor];
          cursor += 1;
        }
      }
    }
  }

  function randomiseEntryLevelDefences() {
    const slots = [];
    const tiles = [];
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const cell = state.board[row][col];
        const tile = cell.tile;
        if (!cell.path && tile?.tower && tile.level === 0) {
          slots.push({ row, col });
          tiles.push(tile);
        }
      }
    }
    for (let index = tiles.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [tiles[index], tiles[target]] = [tiles[target], tiles[index]];
    }
    slots.forEach((slot, index) => {
      state.board[slot.row][slot.col].tile = tiles[index];
      particle(boardPoint(slot.row, slot.col), palette.lightBlue, 4);
    });
    if (slots.length) {
      floatText("BOARD RANDOMISED", board.x + board.w / 2, board.y - 28, palette.lightBlue, 24);
    }
  }

  function upgradeRandomTower() {
    const towers = [];
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const tile = state.board[row][col].tile;
        if (tile?.tower && tile.level < 2) towers.push({ row, col, tile });
      }
    }
    const pick = rand(towers);
    if (!pick) return;
    pick.tile.level += 1;
    particle(boardPoint(pick.row, pick.col), palette.gold, 34);
  }

  function spawnEnemy() {
    const boss = state.trial % 10 === 0;
    const pool = boss ? ["lewis"] : state.trial > 6 ? ["cowan", "cowan", "ruffian", "mischief", "discord"] : state.trial > 3 ? ["cowan", "cowan", "ruffian", "mischief"] : ["cowan", "cowan", "ruffian"];
    const type = enemyTypes[rand(pool)];
    const hpScale = 1 + state.trial * 0.15;
    const path = Math.random() > 0.52 ? pathCells : secondPathCells;
    state.enemies.push({
      type,
      typeKey: Object.entries(enemyTypes).find(([, value]) => value === type)?.[0] || "cowan",
      hp: type.hp * hpScale,
      maxHp: type.hp * hpScale,
      progress: 0,
      path,
      slow: 1,
      wobble: Math.random() * Math.PI * 2,
      id: Math.random().toString(36).slice(2),
    });
  }

  function updateCombat(dt) {
    state.wave.timer -= dt;
    if (state.wave.spawned < state.wave.total && state.wave.timer <= 0) {
      state.wave.spawned += 1;
      spawnEnemy();
      state.wave.timer = Math.max(0.35, 1.15 - state.trial * 0.035);
    }

    updateTowers(dt);
    updateProjectiles(dt);
    updateEnemies(dt);

    if (state.wave.spawned >= state.wave.total && !state.enemies.length && state.mode === "combat") {
      state.score += state.trial * 65 + state.security * 15 + state.swaps * 8;
      nextTrial();
    }
  }

  function updateTowers(dt) {
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const tile = state.board[row][col].tile;
        if (!tile?.tower) continue;
        const def = resources[tile.kind];
        tile.cooldown = Math.max(0, (tile.cooldown || 0) - dt);
        if (tile.kind === "tool") continue;
        const supportBoost = nearbySupport(row, col);
        const speedBoost = supportBoost * (state.tyler.alarm > 0 ? 1.55 : 1);
        if (tile.cooldown > 0) continue;
        const origin = boardPoint(row, col);
        const target = nearestEnemy(origin, def.range[tile.level]);
        if (!target) continue;
        const disrupted = towerDisruption(origin);
        tile.cooldown = def.rate[tile.level] / Math.max(0.3, speedBoost * disrupted);
        const damage = def.damage[tile.level] * (tile.charged ? 1.22 : 1) * enemyCounterMultiplier(tile.kind, target);
        fireProjectile(origin, target, tile.kind, damage);
        if (disrupted < 1) {
          floatText("Disrupted", origin.x, origin.y - 42, palette.crimson, 11);
        }
        if (supportBoost > 1) {
          tile.supportFlash = 0.45;
          state.supportPulses.push({ row, col, life: 0.65, boost: supportBoost });
          if ((tile.boostNotice || 0) <= 0) {
            floatText("Lewis boost", origin.x, origin.y - 30, palette.lightBlue, 12);
            tile.boostNotice = 2.2;
          }
        }
        tile.boostNotice = Math.max(0, (tile.boostNotice || 0) - dt);
      }
    }
  }

  function nearbySupport(row, col) {
    let boost = 1;
    for (let r = Math.max(0, row - 1); r <= Math.min(GRID - 1, row + 1); r += 1) {
      for (let c = Math.max(0, col - 1); c <= Math.min(GRID - 1, col + 1); c += 1) {
        const tile = state.board[r][c].tile;
        if (tile?.tower && tile.kind === "tool") boost = Math.max(boost, resources.tool.support[tile.level]);
      }
    }
    return boost;
  }

  function isSupportedTower(row, col) {
    return nearbySupport(row, col) > 1;
  }

  function nearestEnemy(origin, range) {
    let best = null;
    state.enemies.forEach((enemy) => {
      const pos = pathPoint(enemy);
      const distance = Math.hypot(pos.x - origin.x, pos.y - origin.y);
      if (distance <= range && (!best || enemy.progress > best.enemy.progress)) best = { enemy, pos, distance };
    });
    return best?.enemy || null;
  }

  function towerDisruption(origin) {
    let multiplier = 1;
    state.enemies.forEach((enemy) => {
      if (!enemy.type.disrupt) return;
      const pos = pathPoint(enemy);
      const distance = Math.hypot(pos.x - origin.x, pos.y - origin.y);
      if (distance <= 94) multiplier = Math.min(multiplier, enemy.type.disrupt);
    });
    return multiplier;
  }

  function enemyCounterMultiplier(kind, enemy) {
    if (enemy.type.weakTo?.includes(kind)) return enemy.type.boss ? 1.16 : 1.28;
    if (kind === "gold" && !enemy.type.boss) return 0.86;
    if (kind === "acacia" && enemy.type.trait === "Heavy") return 0.78;
    return 1;
  }

  function fireProjectile(origin, enemy, kind, damage) {
    const def = resources[kind];
    if (kind === "acacia") enemy.slow = Math.min(enemy.slow, def.slow[Math.min(2, Math.max(0, Math.floor(damage / 12)))]);
    state.projectiles.push({ x: origin.x, y: origin.y, enemy, kind, damage, life: 0.42 });
    particle(origin, def.color, 8);
  }

  function updateProjectiles(dt) {
    state.projectiles = state.projectiles.filter((shot) => {
      shot.life -= dt;
      if (shot.life <= 0 || !state.enemies.includes(shot.enemy)) {
        if (state.enemies.includes(shot.enemy)) damageEnemy(shot.enemy, shot.damage, shot.kind);
        return false;
      }
      return true;
    });
  }

  function damageEnemy(enemy, amount, kind) {
    const weakHit = enemy.type.weakTo?.includes(kind);
    enemy.hp -= amount;
    const pos = pathPoint(enemy);
    floatText(`-${Math.round(amount)}`, pos.x, pos.y - 18, resources[kind].color, 14);
    if (weakHit && (enemy.hitNotice || 0) <= 0) {
      floatText("Counter!", pos.x, pos.y - 34, palette.gold, 12);
      enemy.hitNotice = 0.8;
    }
    if (enemy.hp <= 0) {
      state.score += enemy.type.reward;
      state.stats.defeated += 1;
      state.stats.defeatedThisTrial += 1;
      recordObjective(enemy.type.boss ? "boss" : "defeat", 1);
      if (enemy.type.trait === "Heavy") {
        state.stats.heavyDefeatedThisTrial += 1;
        recordObjective("defeatHeavy", 1);
      }
      if (enemy.type.boss) state.stats.bosses += 1;
      particle(pos, enemy.type.color, enemy.type.boss ? 50 : 22);
      state.enemies = state.enemies.filter((item) => item !== enemy);
    }
  }

  function updateEnemies(dt) {
    state.enemies.slice().forEach((enemy) => {
      const speed = enemy.type.speed * enemy.slow * (state.tyler.closed > 0 ? 0 : 1);
      enemy.progress += (speed * dt) / CELL;
      enemy.slow = Math.min(1, enemy.slow + dt * 0.22);
      enemy.hitNotice = Math.max(0, (enemy.hitNotice || 0) - dt);
      if (!enemy.warned && enemy.progress > enemy.path.length - 2.35) {
        enemy.warned = true;
        state.tyler.stance = "warning";
        floatText("Entrance threatened", board.x + board.w / 2, board.y - 48, palette.crimson, 18);
        say("A threat is close to the Lodge entrance.");
      }
      if (enemy.progress >= enemy.path.length - 1) reachDoor(enemy);
    });
  }

  function reachDoor(enemy) {
    const pos = pathPoint(enemy);
    if (state.tyler.guard > 0 || state.tyler.charges > 0) {
      if (state.tyler.charges > 0) state.tyler.charges -= 1;
      state.tyler.stance = "strike";
      particle(pos, palette.gold, 30);
      state.score += Math.round(enemy.type.reward * 0.7);
      state.stats.defeated += 1;
      state.stats.defeatedThisTrial += 1;
      if (enemy.type.boss) state.stats.bosses += 1;
      if (enemy.type.trait === "Heavy") {
        state.stats.heavyDefeatedThisTrial += 1;
        recordObjective("defeatHeavy", 1);
      }
      recordObjective(enemy.type.boss ? "boss" : "defeat", 1);
      state.enemies = state.enemies.filter((item) => item !== enemy);
      say("The Tyler turned one away at the door.");
      return;
    }
    state.security -= enemy.type.boss ? 3 : 1;
    state.shake = 0.35;
    state.enemies = state.enemies.filter((item) => item !== enemy);
    say("An enemy reached the Lodge. Security reduced.");
    if (state.security <= 0) gameOver();
  }

  function useAbility(id) {
    if (id === "installation") {
      if (state.mode !== "prep") {
        say("Installation can only be used while setting up the Lodge.");
        return;
      }
      if (state.tyler.installation <= 0) {
        say("Installation has already been used for this Trial.");
        return;
      }
      state.tyler.installation -= 1;
      shuffleBoard();
      state.selected = null;
      particle({ x: board.x + board.w / 2, y: board.y + board.h / 2 }, palette.lightBlue, 46);
      floatText("INSTALLATION", board.x + board.w / 2, board.y - 28, palette.gold, 28);
      say("Installation: the whole board has been randomised for fresh matches.");
      return;
    }
    if (state.mode !== "combat") return;
    if (id === "sword") {
      if (state.tyler.charges <= 0 || !state.enemies.length) {
        say("Tyler's Sword is not ready.");
        return;
      }
      const enemy = state.enemies.reduce((best, item) => (item.progress > best.progress ? item : best), state.enemies[0]);
      state.tyler.charges -= 1;
      state.tyler.stance = "strike";
      damageEnemy(enemy, enemy.hp + 1, "gold");
      say("Tyler's Sword turned away the nearest threat.");
    }
    if (id === "guard") {
      if (state.tyler.guard > 0) return;
      state.tyler.guard = 5;
      state.tyler.stance = "guard";
      say("Guard the Door: no enemy may enter for five seconds.");
    }
    if (id === "alarm") {
      if (state.tyler.alarm > 0) return;
      state.tyler.alarm = 7;
      say("Festive Board: all defences work faster.");
    }
    if (id === "close") {
      if (state.tyler.closed > 0) return;
      state.tyler.closed = 4;
      say("Close the Lodge: the doors are protected.");
    }
  }

  function updateTimers(dt) {
    state.tyler.guard = Math.max(0, state.tyler.guard - dt);
    state.tyler.alarm = Math.max(0, state.tyler.alarm - dt);
    state.tyler.closed = Math.max(0, state.tyler.closed - dt);
    state.transition = Math.max(0, state.transition - dt);
    state.shake = Math.max(0, state.shake - dt);
    if (state.chest) state.chest = Math.max(0, state.chest - dt);
    state.supportPulses = state.supportPulses
      .map((pulse) => ({ ...pulse, life: pulse.life - dt }))
      .filter((pulse) => pulse.life > 0);
    state.matchHighlights = state.matchHighlights
      .map((highlight) => ({ ...highlight, life: highlight.life - dt }))
      .filter((highlight) => highlight.life > 0);
    state.board.forEach((line) => line.forEach((cell) => {
      if (cell.tile) {
        cell.tile.supportFlash = Math.max(0, (cell.tile.supportFlash || 0) - dt);
        cell.tile.boostNotice = Math.max(0, (cell.tile.boostNotice || 0) - dt);
      }
    }));
    state.floaters = state.floaters.map((f) => ({ ...f, y: f.y - dt * 34, life: f.life - dt * 0.7 })).filter((f) => f.life > 0);
    state.particles = state.particles.map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      life: p.life - dt,
      r: p.r * (1 - dt * 0.15),
    })).filter((p) => p.life > 0);
  }

  function gameOver() {
    state.mode = "game-over";
    say("THE LODGE HAS BEEN BREACHED");
    state.highScore = Math.max(state.highScore, state.score);
    localStorage.setItem("tylersTrialHighScore", String(state.highScore));
    showLeaderboard();
  }

  function setupLeaderboardUi() {
    const frame = document.querySelector(".lodge-game-frame");
    if (!frame || leaderboardUi) return;
    const panelEl = document.createElement("section");
    panelEl.className = "tylers-score-panel";
    panelEl.setAttribute("hidden", "");
    panelEl.setAttribute("aria-live", "polite");
    panelEl.innerHTML = `
      <div class="tylers-score-card">
        <div class="tylers-score-head">
          <div>
            <p class="section-kicker">All-Time High Scores</p>
            <h2>Record Your Trial</h2>
          </div>
          <button class="tylers-score-close" type="button" aria-label="Close high score panel">x</button>
        </div>
        <form class="tylers-score-form">
          <label>
            First name <span aria-hidden="true">*</span>
            <input name="first_name" type="text" maxlength="24" autocomplete="given-name" required />
          </label>
          <label>
            Lodge name
            <input name="lodge_name" type="text" maxlength="60" autocomplete="organization" />
          </label>
          <label>
            Lodge number
            <input name="lodge_number" type="text" maxlength="10" inputmode="numeric" />
          </label>
          <button type="submit">Submit Score</button>
        </form>
        <p class="tylers-score-status"></p>
        <ol class="tylers-score-list"></ol>
      </div>
    `;
    frame.appendChild(panelEl);
    leaderboardUi = {
      panel: panelEl,
      form: panelEl.querySelector(".tylers-score-form"),
      list: panelEl.querySelector(".tylers-score-list"),
      status: panelEl.querySelector(".tylers-score-status"),
      close: panelEl.querySelector(".tylers-score-close"),
    };
    leaderboardUi.close.addEventListener("click", hideLeaderboard);
    leaderboardUi.form.addEventListener("submit", submitLeaderboardScore);
  }

  function getSupabaseConfig() {
    const config = window.TYLERS_TRIAL_SUPABASE || {};
    const url = String(config.url || "").replace(/\/$/, "");
    const anonKey = String(config.anonKey || "");
    if (!url || !anonKey || !/^https:\/\/.+\.supabase\.co$/i.test(url)) return null;
    return { url, anonKey };
  }

  function showLeaderboard() {
    setupLeaderboardUi();
    if (!leaderboardUi) return;
    state.leaderboardOpen = true;
    leaderboardUi.panel.removeAttribute("hidden");
    leaderboardUi.form.hidden = false;
    leaderboardUi.form.reset();
    leaderboardUi.status.textContent = getSupabaseConfig()
      ? "Submit your score to the shared board."
      : "Online leaderboard unavailable. Scores are being saved on this device.";
    loadLeaderboardScores();
  }

  function hideLeaderboard() {
    if (!leaderboardUi) return;
    state.leaderboardOpen = false;
    leaderboardUi.panel.setAttribute("hidden", "");
  }

  function scorePayload(formData) {
    const firstName = String(formData.get("first_name") || "").trim().replace(/\s+/g, " ");
    const lodgeName = String(formData.get("lodge_name") || "").trim().replace(/\s+/g, " ");
    const lodgeNumber = String(formData.get("lodge_number") || "").trim().replace(/[^\dA-Za-z]/g, "");
    if (!firstName) throw new Error("Please enter your first name.");
    return {
      first_name: firstName.slice(0, 24),
      lodge_name: lodgeName ? lodgeName.slice(0, 60) : null,
      lodge_number: lodgeNumber ? lodgeNumber.slice(0, 10) : null,
      score: Math.max(0, Math.round(state.score)),
      trials_survived: Math.max(0, state.trial - 1),
      enemies_defeated: state.stats.defeated,
      highest_structure: state.stats.highest || 1,
    };
  }

  async function submitLeaderboardScore(event) {
    event.preventDefault();
    if (!leaderboardUi) return;
    let payload;
    try {
      payload = scorePayload(new FormData(leaderboardUi.form));
    } catch (error) {
      leaderboardUi.status.textContent = error.message;
      return;
    }
    leaderboardUi.form.hidden = true;
    leaderboardUi.status.textContent = "Saving score...";
    const config = getSupabaseConfig();
    if (!config) {
      saveLocalScore(payload);
      leaderboardUi.status.textContent = "Online leaderboard unavailable. Your score is saved on this device.";
      await loadLeaderboardScores();
      return;
    }
    try {
      const response = await fetch(`${config.url}/rest/v1/tylers_trial_scores`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Supabase rejected the score.");
      leaderboardUi.status.textContent = "Score submitted to the all-time board.";
      await loadLeaderboardScores();
    } catch {
      saveLocalScore(payload);
      leaderboardUi.status.textContent = "Online leaderboard unavailable. Your score is saved on this device.";
      await loadLeaderboardScores();
    }
  }

  async function loadLeaderboardScores() {
    if (!leaderboardUi) return;
    const config = getSupabaseConfig();
    if (!config) {
      renderLeaderboard(loadLocalScores());
      return;
    }
    try {
      const response = await fetch(`${config.url}/rest/v1/tylers_trial_scores?select=first_name,lodge_name,lodge_number,score,trials_survived,enemies_defeated,highest_structure,created_at&order=score.desc,created_at.asc&limit=10`, {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      });
      if (!response.ok) throw new Error("Leaderboard unavailable.");
      const scores = await response.json();
      renderLeaderboard(scores);
    } catch {
      leaderboardUi.status.textContent = "Online leaderboard unavailable. Showing scores saved on this device.";
      renderLeaderboard(loadLocalScores());
    }
  }

  function saveLocalScore(entry) {
    const scores = loadLocalScores();
    scores.push({ ...entry, created_at: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at));
    localStorage.setItem(localLeaderboardKey, JSON.stringify(scores.slice(0, 10)));
  }

  function loadLocalScores() {
    try {
      return JSON.parse(localStorage.getItem(localLeaderboardKey) || "[]");
    } catch {
      return [];
    }
  }

  function renderLeaderboard(scores) {
    if (!leaderboardUi) return;
    if (!scores.length) {
      leaderboardUi.list.innerHTML = "<li>No scores yet. Yours can be first.</li>";
      return;
    }
    leaderboardUi.list.innerHTML = scores.slice(0, 10).map((score, index) => {
      const lodge = [score.lodge_name, score.lodge_number ? `No. ${score.lodge_number}` : ""].filter(Boolean).join(" ");
      return `
        <li>
          <span class="score-rank">${index + 1}</span>
          <span class="score-name">${escapeHtml(score.first_name)}${lodge ? `<small>${escapeHtml(lodge)}</small>` : ""}</span>
          <span class="score-value">${Number(score.score || 0).toLocaleString()}</span>
        </li>
      `;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function chapterName() {
    return chapters.reduce((active, chapter) => (state.trial >= chapter.min ? chapter : active), chapters[0]).name;
  }

  function levelCounter() {
    const name = chapterName();
    const progress = ((state.trial - 1) % 10) + 1;
    return `${name} ${progress}/10`;
  }

  function say(message) {
    state.message = message;
    if (help) help.textContent = message;
  }

  function floatText(text, x, y, color, size) {
    state.floaters.push({ text, x, y, color, size, life: 1 });
  }

  function particle(origin, color, count) {
    if (reducedMotion) return;
    count = Math.min(count, 18);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 90;
      state.particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * 4,
        color,
        life: 0.45 + Math.random() * 0.55,
      });
    }
  }

  function knock() {
    if (state.muted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audio = new AudioContext();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.value = 145;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.18);
    } catch {
      // Audio is decorative only.
    }
  }

  function buttonRects() {
    return [
      { id: "begin", label: state.mode === "prep" ? "BEGIN TRIAL" : "PREPARE", x: 1018, y: 602, w: 190, h: 48 },
      { id: "scores", label: "SCORES", x: 954, y: 548, w: 128, h: 40 },
      { id: "help", label: "HELP", x: 1094, y: 548, w: 128, h: 40 },
      { id: "sword", label: `SWORD ${state.tyler.charges}`, x: 54, y: 566, w: 132, h: 36 },
      { id: "guard", label: "GUARD", x: 198, y: 566, w: 112, h: 36 },
      { id: "installation", label: `INSTALL ${state.tyler.installation}`, x: 54, y: 610, w: 132, h: 36 },
      { id: "close", label: "CLOSE", x: 198, y: 610, w: 112, h: 36 },
    ];
  }

  function abilityRects() {
    return buttonRects().filter((button) => ["sword", "guard", "installation", "close"].includes(button.id));
  }

  function abilityDisabled(id) {
    if (id === "scores" || id === "help") return false;
    if (id === "installation") return state.mode !== "prep" || state.tyler.installation <= 0;
    return state.mode !== "combat";
  }

  function menuRects() {
    return [
      { id: "begin", label: "BEGIN THE TRIAL", x: 505, y: 374, w: 270, h: 52 },
      { id: "how", label: "HOW TO PLAY", x: 505, y: 436, w: 270, h: 46 },
      { id: "achievements", label: "ACHIEVEMENTS", x: 505, y: 492, w: 270, h: 46 },
      { id: "settings", label: state.muted ? "SOUND: OFF" : "SOUND: ON", x: 505, y: 548, w: 270, h: 46 },
      { id: "return", label: "RETURN TO LODGE", x: 505, y: 604, w: 270, h: 46 },
    ];
  }

  function handlePointer(point) {
    pointer = point;
    if (state.helpOpen) {
      if (rectHit({ x: 976, y: 124, w: 40, h: 40 }, point) || rectHit({ x: 466, y: 614, w: 348, h: 48 }, point)) state.helpOpen = false;
      return;
    }
    if (state.eventCard) {
      if (rectHit({ x: 477, y: 484, w: 326, h: 54 }, point)) {
        state.eventCard.apply();
        state.eventCard = null;
      }
      return;
    }
    if (state.mode === "menu" || state.mode === "how" || state.mode === "achievements") {
      if (state.mode !== "menu" && rectHit({ x: 505, y: 552, w: 270, h: 50 }, point)) {
        state.mode = "menu";
        return;
      }
      const hit = menuRects().find((rect) => rectHit(rect, point));
      if (!hit) return;
      if (hit.id === "begin") startGame();
      if (hit.id === "how") state.mode = state.mode === "how" ? "menu" : "how";
      if (hit.id === "achievements") state.mode = state.mode === "achievements" ? "menu" : "achievements";
      if (hit.id === "settings") {
        state.muted = !state.muted;
        localStorage.setItem("tylersTrialMuted", String(state.muted));
      }
      if (hit.id === "return") window.location.href = "index.html";
      return;
    }
    if (state.mode === "game-over") {
      if (rectHit({ x: 440, y: 538, w: 190, h: 54 }, point)) startGame();
      if (rectHit({ x: 650, y: 538, w: 190, h: 54 }, point)) window.location.href = "index.html";
      return;
    }
    const button = buttonRects().find((rect) => rectHit(rect, point));
    if (button) {
      if (button.id === "begin" && state.mode === "prep") beginCombat();
      if (button.id === "scores") {
        showLeaderboard();
        return;
      }
      if (button.id === "help") {
        state.helpOpen = true;
        return;
      }
      if (button.id !== "begin") useAbility(button.id);
      return;
    }
    if (state.mode !== "prep") return;
    const cell = hitCell(point);
    if (!cell) return;
    state.inspect = cell;
    const boardCell = state.board[cell.row][cell.col];
    if (boardCell.path || !boardCell.tile) return;
    if (!state.selected) {
      state.selected = cell;
      return;
    }
    if (state.selected.row === cell.row && state.selected.col === cell.col) {
      state.selected = null;
      return;
    }
    if (adjacent(state.selected, cell) && state.swaps > 0) {
      swapCells(state.selected, cell);
      state.selected = null;
    } else {
      state.selected = cell;
    }
  }

  function onPointerMove(event) {
    pointer = canvasPoint(event);
    if (state.helpOpen) return;
    const cell = hitCell(pointer);
    if (cell) state.inspect = cell;
  }

  function onPointerDown(event) {
    handlePointer(canvasPoint(event));
  }

  function drawCover(img, x, y, w, h, alpha) {
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = alpha ?? 1;
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
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
    ctx.strokeStyle = stroke || "rgba(201,154,53,0.62)";
    ctx.stroke();
    ctx.restore();
  }

  function gradientFill(x, y, w, h, colors) {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    colors.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    return gradient;
  }

  function label(text, x, y, size, color, weight, align, maxWidth) {
    ctx.save();
    ctx.font = `${weight || 800} ${size}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  function wrap(text, x, y, w, line, size, color, weight, align) {
    const words = text.split(" ");
    let current = "";
    let currentY = y;
    ctx.save();
    ctx.font = `${weight || 800} ${size}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    const textX = align === "center" ? x + w / 2 : x;
    words.forEach((word) => {
      const test = `${current}${word} `;
      if (ctx.measureText(test).width > w && current) {
        ctx.fillText(current.trim(), textX, currentY);
        current = `${word} `;
        currentY += line;
      } else current = test;
    });
    ctx.fillText(current.trim(), textX, currentY);
    ctx.restore();
  }

  function drawGame() {
    const shakeX = state.shake > 0 && !reducedMotion ? (Math.random() - 0.5) * 8 : 0;
    ctx.save();
    ctx.translate(shakeX, 0);
    drawCover(images.bg, 0, 0, W, H, 1);
    ctx.fillStyle = "rgba(4, 13, 29, 0.18)";
    ctx.fillRect(0, 0, W, H);
    drawLodge();
    drawTopBar();
    drawSidePanels();
    drawBoard();
    drawTyler();
    drawEnemies();
    drawProjectiles();
    drawParticles();
    drawFloaters();
    drawTransition();
    drawEventCard();
    if (state.helpOpen) drawHelpOverlay();
    if (state.mode === "menu" || state.mode === "how" || state.mode === "achievements") drawMenu();
    if (state.mode === "game-over") drawGameOver();
    ctx.restore();
  }

  function drawLodge() {
    const stage = Math.min(4, Math.floor((state.trial - 1) / 5));
    panel(384, 24, 512, 88 + stage * 5, "rgba(255,246,223,0.9)", "rgba(201,154,53,0.92)", 18);
    ctx.save();
    ctx.shadowColor = "rgba(201,154,53,0.35)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = gradientFill(414, 76, 452, 32, [[0, palette.navy], [0.5, palette.royal], [1, palette.navy]]);
    roundRect(414, 76, 452, 32, 10);
    ctx.fill();
    ctx.shadowColor = "rgba(201,154,53,0.8)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 3;
    roundRect(496, 64, 288, 50, 14);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 4 + stage; i += 1) {
      const x = 442 + i * (368 / Math.max(1, 3 + stage));
      ctx.fillStyle = gradientFill(x, 40, 20, 44, [[0, i % 2 ? "#2175bf" : "#b93342"], [1, i % 2 ? "#082b56" : "#5b1018"]]);
      roundRect(x, 40, 20, 44, 5);
      ctx.fill();
      ctx.fillStyle = palette.gold;
      roundRect(x - 3, 38, 26, 6, 3);
      ctx.fill();
    }
    label(["Small Lodge", "Established Lodge", "Masonic Hall", "Provincial Hall", "Grand Temple"][stage], 640, 46, 22, palette.navy, 900, "center");
    label("THE LODGE", 640, 84, 15, palette.gold, 900, "center");
  }

  function drawTopBar() {
    panel(28, 20, 1224, 56, "rgba(6,26,54,0.9)", "rgba(201,154,53,0.65)", 18);
    label(levelCounter(), 56, 37, 19, palette.cream, 900);
    label(`SWAPS ${state.swaps}`, 460, 38, 18, palette.gold, 900, "center");
    label(`SECURITY ${state.security}/${state.maxSecurity}`, 642, 38, 18, palette.cream, 900, "center");
    label(`SCORE ${state.score}`, 842, 38, 18, palette.lightBlue, 900, "center");
    if (images.logo) {
      ctx.save();
      ctx.fillStyle = "rgba(255,246,223,0.96)";
      ctx.beginPath();
      ctx.arc(1112, 48, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(images.logo, 1091, 27, 42, 42);
      ctx.restore();
    }
    label("Surrey 1837 Club", 1144, 39, 15, palette.gold, 900, "left", 92);
  }

  function drawObjectivePanel() {
    if (!state.objective || ["menu", "how", "achievements", "game-over"].includes(state.mode)) return;
    const completed = state.objective.completed;
    panel(954, 492, 268, 48, completed ? "rgba(77,150,88,0.86)" : "rgba(255,246,223,0.1)", completed ? "rgba(255,246,223,0.55)" : "rgba(159,212,255,0.38)", 12);
    label("Objective", 970, 503, 11, completed ? palette.cream : palette.gold, 900);
    label(objectiveProgressText(), 1206, 503, 11, completed ? palette.cream : palette.lightBlue, 900, "right", 74);
    label(state.objective.text, 970, 520, 11, palette.cream, 900, "left", 228);
  }

  function drawSidePanels() {
    panel(30, 96, 324, 584, "rgba(6,26,54,0.86)", "rgba(201,154,53,0.52)", 18);
    label("The Tyler", 58, 120, 22, palette.lightBlue, 900);
    wrap(state.message, 58, 154, 254, 20, 14, palette.cream);
    drawInspectCard(58, 404, 252, 102);
    label("Abilities", 58, 510, 16, palette.gold, 900);
    const hoveredAbility = abilityRects().find((button) => rectHit(button, pointer));
    const abilityText = hoveredAbility
      ? abilityGuide[hoveredAbility.id]
      : "Use Installation during setup. Other abilities work during combat.";
    wrap(abilityText, 58, 530, 252, 13, 10.5, "rgba(255,255,255,0.76)", 800);
    abilityRects().forEach((button) => drawButton(button, abilityDisabled(button.id)));

    panel(926, 96, 324, 584, "rgba(6,26,54,0.86)", "rgba(201,154,53,0.52)", 18);
    label("Defence Guide", 954, 120, 22, palette.lightBlue, 900);
    resourceKeys.forEach((keyName, index) => {
      const y = 150 + index * 65;
      const def = resources[keyName];
      const hover = rectHit({ x: 954, y: y - 4, w: 268, h: 58 }, pointer);
      panel(954, y - 4, 268, 58, hover ? "rgba(255,246,223,0.16)" : "rgba(255,255,255,0.07)", hover ? def.color : "rgba(255,255,255,0.13)", 12);
      drawDefenceSprite(keyName, 963, y + 5, 42, 0, false);
      label(def.short, 1012, y + 3, 13, palette.cream, 900, "left", 188);
      label(def.role, 1012, y + 18, 10, def.color, 900, "left", 184);
      wrap(defenceGuide[keyName], 1012, y + 31, 184, 11, 9, "rgba(255,255,255,0.76)", 800);
    });
    drawObjectivePanel();
    drawButton(buttonRects().find((button) => button.id === "scores"), false);
    drawButton(buttonRects().find((button) => button.id === "help"), false);
    drawButton(buttonRects().find((button) => button.id === "begin"), state.mode !== "prep");
    wrap("Inspect tiles and threats for counters. Match resources to build; match defences to merge.", 954, 656, 248, 15, 11, "rgba(255,255,255,0.78)", 800);
  }

  function drawInspectCard(x, y, w, h) {
    const cell = state.inspect || hitCell(pointer);
    panel(x, y, w, h, "rgba(255,255,255,0.07)", "rgba(159,212,255,0.22)", 12);
    label("Inspect", x + 14, y + 12, 13, palette.gold, 900);
    if (!cell) {
      wrap("Hover or tap a tile to see what it does.", x + 14, y + 36, w - 28, 15, 11, "rgba(255,255,255,0.74)", 800);
      return;
    }
    const tile = state.board[cell.row]?.[cell.col]?.tile;
    if (!tile) {
      wrap("Path or Lodge entrance. Keep threats away from here.", x + 14, y + 36, w - 28, 15, 11, "rgba(255,255,255,0.74)", 800);
      return;
    }
    const def = resources[tile.kind];
    const name = tile.tower ? def.tower[tile.level] : def.label;
    label(name, x + 14, y + 34, 13, def.color, 900, "left", w - 28);
    const text = tile.tower
      ? `${def.role}. ${defenceGuide[tile.kind]}`
      : `Resource tile. Match three to build ${def.short}. ${def.role}.`;
    wrap(text, x + 14, y + 54, w - 28, 14, 10.5, "rgba(255,255,255,0.76)", 800);
  }

  function drawButton(rect, disabled) {
    const hover = rectHit(rect, pointer);
    panel(rect.x, rect.y, rect.w, rect.h, disabled ? "rgba(255,246,223,0.48)" : hover ? "rgba(255,246,223,1)" : "rgba(255,246,223,0.9)", hover ? palette.lightBlue : "rgba(201,154,53,0.76)", 14);
    if (images.uiSheet && rect.w >= 120 && rect.h >= 38 && !disabled) {
      ctx.save();
      ctx.globalAlpha = hover ? 0.5 : 0.32;
      ctx.drawImage(images.uiSheet, 48, 92, 640, 152, rect.x - 5, rect.y - 4, rect.w + 10, rect.h + 8);
      ctx.restore();
    }
    ctx.save();
    ctx.font = "900 13px Inter, Arial, sans-serif";
    ctx.fillStyle = disabled ? "rgba(23,36,58,0.45)" : palette.navy;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rect.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, rect.w - 18);
    ctx.restore();
  }

  function drawSpriteSheet(img, index, columns, sourceOptions, x, y, w, h) {
    if (!img) return false;
    const sourceW = img.width / columns;
    const sx = sourceW * index + (sourceOptions?.xPad || 0) * sourceW;
    const sy = (sourceOptions?.y || 0) * img.height;
    const sw = sourceW * (1 - (sourceOptions?.xPad || 0) * 2);
    const sh = img.height * (sourceOptions?.h || 1);
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    return true;
  }

  function drawDefenceSprite(kind, x, y, size, level, tower) {
    const img = images.defenceSheet;
    const index = defenceSpriteIndex[kind] ?? 0;
    ctx.save();
    ctx.shadowColor = tower ? "rgba(201,154,53,0.48)" : "rgba(0,0,0,0.18)";
    ctx.shadowBlur = tower ? 12 : 4;
    const drawn = drawSpriteSheet(img, index, spriteColumns.defence, { y: 0.2, h: 0.68, xPad: 0.03 }, x, y, size, size);
    ctx.restore();
    if (!drawn) drawIcon(kind, x, y, size, level, tower);
    if (tower) {
      ctx.save();
      ctx.strokeStyle = resources[kind].color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * (0.42 + level * 0.04), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemySprite(enemy, pos, size, wobble) {
    const img = images.enemySheet;
    const index = enemySpriteIndex[enemy.typeKey] ?? enemySpriteIndex[enemy.type.name] ?? 0;
    if (!img) return false;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = enemy.type.boss ? 16 : 10;
    drawSpriteSheet(img, index, spriteColumns.enemy, { y: 0.12, h: 0.74, xPad: 0.04 }, pos.x - size / 2, pos.y - size / 2 + wobble, size, size);
    ctx.restore();
    return true;
  }

  function drawMatchHighlights() {
    state.matchHighlights.forEach((highlight) => {
      const alpha = Math.max(0, highlight.life / 0.7);
      highlight.cells.forEach((cell) => {
        const x = board.x + cell.col * CELL;
        const y = board.y + cell.row * CELL;
        ctx.save();
        ctx.globalAlpha = 0.16 + alpha * 0.28;
        ctx.fillStyle = highlight.color;
        roundRect(x + 4, y + 4, CELL - 8, CELL - 8, 12);
        ctx.fill();
        ctx.strokeStyle = palette.gold;
        ctx.lineWidth = 2 + alpha * 3;
        ctx.stroke();
        ctx.restore();
      });
    });
  }

  function drawBoard() {
    if (state.board.length < GRID) return;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = 28;
    panel(board.x - 24, board.y - 24, board.w + 48, board.h + 48, "rgba(255,246,223,0.93)", "rgba(201,154,53,0.96)", 22);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(13,55,109,0.34)";
    ctx.lineWidth = 4;
    roundRect(board.x - 12, board.y - 12, board.w + 24, board.h + 24, 16);
    ctx.stroke();
    ctx.restore();
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const x = board.x + col * CELL;
        const y = board.y + row * CELL;
        const cell = state.board[row][col];
        const selected = state.selected?.row === row && state.selected?.col === col;
        ctx.save();
        roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 10);
        ctx.fillStyle = cell.path
          ? gradientFill(x, y, CELL, CELL, [[0, "rgba(31,26,23,0.92)"], [1, "rgba(82,54,35,0.86)"]])
          : (row + col) % 2
            ? gradientFill(x, y, CELL, CELL, [[0, "#f4ead4"], [1, "#ded0ad"]])
            : gradientFill(x, y, CELL, CELL, [[0, "#fffdf3"], [1, "#efe2c6"]]);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.fillRect(x + 8, y + 8, CELL - 16, 2);
        ctx.strokeStyle = selected ? palette.gold : "rgba(23,36,58,0.16)";
        ctx.lineWidth = selected ? 5 : 1.5;
        ctx.stroke();
        ctx.restore();
        if (cell.path) {
          drawPathMark(x, y, row, col);
          if (isLodgeDoor(row, col)) drawEntranceCell(x, y, row, col);
        }
        if (cell.tile) drawTile(cell.tile, x + 6, y + 6, CELL - 12, selected, row, col);
      }
    }
    drawMatchHighlights();
    drawTowerRanges();
    drawSupportPulses();
  }

  function drawTowerRanges() {
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const tile = state.board[row][col].tile;
        if (tile?.tower) drawTowerRange(tile, row, col);
      }
    }
  }

  function drawTowerRange(tile, row, col) {
    const def = resources[tile.kind];
    const point = boardPoint(row, col);
    const inspected = state.inspect?.row === row && state.inspect?.col === col;
    if (!inspected && !(tile.supportFlash > 0)) return;
    ctx.save();
    ctx.globalAlpha = inspected ? 0.48 : 0.16;
    ctx.strokeStyle = tile.kind === "tool" ? palette.lightBlue : def.color;
    ctx.lineWidth = inspected ? 6 : 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, def.range[tile.level], 0, Math.PI * 2);
    ctx.stroke();
    if (inspected) {
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = tile.kind === "tool" ? palette.lightBlue : def.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, def.range[tile.level], 0, Math.PI * 2);
      ctx.fill();
    }
    if (inspected && tile.kind === "tool") {
      ctx.globalAlpha = 0.08 + (Math.sin(clock * 3) + 1) * 0.03;
      ctx.fillStyle = palette.lightBlue;
      ctx.beginPath();
      ctx.arc(point.x, point.y, def.range[tile.level], 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSupportPulses() {
    state.supportPulses.forEach((pulse) => {
      const point = boardPoint(pulse.row, pulse.col);
      ctx.save();
      ctx.globalAlpha = Math.max(0, pulse.life);
      ctx.strokeStyle = palette.lightBlue;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 24 + (1 - pulse.life) * 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawPathMark(x, y, row, col) {
    ctx.save();
    ctx.fillStyle = (row + col) % 2 ? "#0d1725" : "#f6f1e6";
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x + 8, y + 8, 20, 20);
    ctx.fillRect(x + 36, y + 36, 20, 20);
    ctx.restore();
  }

  function drawEntranceCell(x, y, row, col) {
    ctx.save();
    const pulse = 0.82 + (!reducedMotion ? Math.sin(clock * 3) * 0.1 : 0);
    ctx.globalAlpha = pulse;
    ctx.shadowColor = "rgba(201,154,53,0.7)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = gradientFill(x + 5, y + 5, CELL - 10, CELL - 10, [[0, "#fff3bf"], [0.45, palette.gold], [1, "#6b4315"]]);
    roundRect(x + 5, y + 5, CELL - 10, CELL - 10, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL * 0.62, CELL * 0.23, Math.PI, Math.PI * 2);
    ctx.lineTo(x + CELL * 0.73, y + CELL * 0.8);
    ctx.lineTo(x + CELL * 0.27, y + CELL * 0.8);
    ctx.closePath();
    ctx.stroke();
    label("ENTRANCE", x + CELL / 2, y + 10, 8, palette.navy, 900, "center", CELL - 10);
    ctx.restore();
  }


  function drawTile(tile, x, y, size, selected, row, col) {
    const def = resources[tile.kind];
    const fill = tile.tower
      ? gradientFill(x, y, size, size, [[0, "rgba(13,55,109,0.98)"], [0.55, "rgba(6,26,54,0.96)"], [1, "rgba(3,12,24,0.98)"]])
      : gradientFill(x, y, size, size, [[0, "#ffffff"], [0.62, "#fff6df"], [1, "#e9dcbf"]]);
    ctx.save();
    ctx.shadowColor = tile.tower ? "rgba(0,0,0,0.34)" : "rgba(13,55,109,0.16)";
    ctx.shadowBlur = tile.tower ? 12 : 5;
    panel(x, y, size, size, fill, selected ? palette.gold : "rgba(23,36,58,0.2)", 12);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = tile.tower ? 0.2 : 0.11;
    ctx.fillStyle = def.color;
    roundRect(x + 5, y + 5, size - 10, size - 10, 10);
    ctx.fill();
    ctx.restore();
    if (tile.kind === "tool" && tile.tower) {
      ctx.save();
      ctx.globalAlpha = 0.22 + (Math.sin(clock * 3) + 1) * 0.05;
      ctx.fillStyle = palette.lightBlue;
      roundRect(x + 3, y + 3, size - 6, size - 6, 10);
      ctx.fill();
      ctx.restore();
    }
    drawDefenceSprite(tile.kind, x + 5, y + 5, size - 10, tile.level, tile.tower);
    if (tile.tower) {
      label(roman(tile.level + 1), x + size - 14, y + 7, 12, palette.gold, 900, "center");
      if (tile.kind !== "tool" && isSupportedTower(row, col)) {
        ctx.save();
        ctx.fillStyle = palette.lightBlue;
        ctx.strokeStyle = palette.navy;
        ctx.lineWidth = 1.5;
        roundRect(x + 6, y + size - 18, 34, 13, 5);
        ctx.fill();
        ctx.stroke();
        label("SPD", x + 23, y + size - 15.5, 8, palette.navy, 900, "center");
        ctx.restore();
      }
      if (tile.charged) {
        ctx.strokeStyle = palette.lightBlue;
        ctx.lineWidth = 3;
        roundRect(x + 4, y + 4, size - 8, size - 8, 10);
        ctx.stroke();
      }
    }
    ctx.fillStyle = def.color;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(x + 5, y + size - 10, size - 10, 5);
    ctx.globalAlpha = 1;
  }

  function drawIcon(kind, x, y, size, level, tower) {
    const def = resources[kind];
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.save();
    ctx.shadowColor = tower ? "rgba(201,154,53,0.45)" : "rgba(0,0,0,0.18)";
    ctx.shadowBlur = tower ? 8 : 3;
    ctx.fillStyle = def.color;
    ctx.strokeStyle = tower ? palette.gold : def.dark;
    ctx.lineWidth = Math.max(2, size * 0.06);
    if (kind === "ashlar") {
      ctx.fillStyle = gradientFill(x, y, size, size, [[0, "#f3eee1"], [1, def.color]]);
      roundRect(x + size * 0.16, y + size * 0.22, size * 0.68, size * 0.56, 6);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + size * (0.28 + i * 0.12), y + size * 0.35);
        ctx.lineTo(x + size * (0.2 + i * 0.12), y + size * 0.62);
        ctx.stroke();
      }
    }
    if (kind === "candle") {
      ctx.fillStyle = "#f7d36a";
      ctx.fillRect(cx - size * 0.11, y + size * 0.36, size * 0.22, size * 0.42);
      ctx.strokeRect(cx - size * 0.11, y + size * 0.36, size * 0.22, size * 0.42);
      ctx.beginPath();
      ctx.fillStyle = gradientFill(cx - size * 0.14, y + size * 0.04, size * 0.28, size * 0.4, [[0, "#ffffff"], [0.48, "#ffef9d"], [1, "#f4a62a"]]);
      ctx.ellipse(cx, y + size * 0.25, size * 0.13, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (kind === "tool") {
      ctx.fillStyle = gradientFill(x, y, size, size, [[0, "#dff8ff"], [1, def.color]]);
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.22, y + size * 0.22);
      ctx.lineTo(cx + size * 0.22, y + size * 0.22);
      ctx.lineTo(cx + size * 0.12, y + size * 0.5);
      ctx.lineTo(cx + size * 0.28, y + size * 0.78);
      ctx.lineTo(cx - size * 0.28, y + size * 0.78);
      ctx.lineTo(cx - size * 0.12, y + size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = palette.cream;
      ctx.beginPath();
      ctx.moveTo(cx, y + size * 0.28);
      ctx.lineTo(cx, y + size * 0.72);
      ctx.stroke();
    }
    if (kind === "acacia") {
      ctx.lineCap = "round";
      ctx.strokeStyle = tower ? palette.gold : def.dark;
      ctx.lineWidth = Math.max(3, size * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.18, y + size * 0.78);
      ctx.lineTo(cx + size * 0.18, y + size * 0.22);
      ctx.stroke();
      ctx.fillStyle = gradientFill(x, y, size, size, [[0, "#efe8ff"], [1, def.color]]);
      ctx.beginPath();
      ctx.arc(cx + size * 0.22, y + size * 0.18, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = palette.cream;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.1, y + size * 0.66);
      ctx.lineTo(cx + size * 0.24, y + size * 0.12);
      ctx.stroke();
    }
    if (kind === "gold") {
      ctx.fillStyle = gradientFill(x, y, size, size, [[0, "#ffd4d8"], [0.5, def.color], [1, "#671018"]]);
      ctx.beginPath();
      ctx.moveTo(cx, y + size * 0.18);
      ctx.lineTo(cx + size * 0.28, cy);
      ctx.lineTo(cx, y + size * 0.82);
      ctx.lineTo(cx - size * 0.28, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.gold;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
    if (tower) {
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size * (0.38 + level * 0.05), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTyler() {
    const x = 145;
    const y = 230 + (!reducedMotion ? Math.sin(clock * 2) * 2 : 0);
    if (images.tylerSheet) {
      const pose = tylerPoseIndex[state.tyler.stance] ?? 0;
      ctx.save();
      if (state.tyler.stance === "strike" || state.tyler.stance === "pleased") ctx.filter = "brightness(1.12) saturate(1.12)";
      ctx.shadowColor = "rgba(0,0,0,0.38)";
      ctx.shadowBlur = 16;
      drawSpriteSheet(images.tylerSheet, pose, spriteColumns.tyler, { y: 0.05, h: 0.9, xPad: 0.05 }, x - 62, y - 8, 152, 216);
      ctx.restore();
    } else if (images.character) {
      ctx.save();
      if (state.tyler.stance === "strike") ctx.filter = "brightness(1.15) saturate(1.15)";
      ctx.shadowColor = "rgba(0,0,0,0.38)";
      ctx.shadowBlur = 16;
      ctx.drawImage(images.character, x - 54, y, 136, 204);
      ctx.restore();
    } else {
      ctx.fillStyle = palette.navy;
      ctx.fillRect(x, y, 42, 112);
    }
    if (state.tyler.guard > 0 || state.tyler.closed > 0) {
      ctx.strokeStyle = "rgba(159,212,255,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + 40, y + 90, 58, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      const pos = pathPoint(enemy);
      const wobble = !reducedMotion ? Math.sin(clock * 5 + enemy.wobble) * 2 : 0;
      const spriteSize = enemy.type.boss ? 76 : enemy.type.trait === "Heavy" ? 58 : 46;
      ctx.save();
      if (!drawEnemySprite(enemy, pos, spriteSize, wobble)) {
        ctx.shadowColor = "rgba(0,0,0,0.38)";
        ctx.shadowBlur = enemy.type.boss ? 14 : 8;
        ctx.fillStyle = gradientFill(pos.x - enemy.type.size, pos.y - enemy.type.size, enemy.type.size * 2, enemy.type.size * 2, [[0, enemy.type.color], [1, "#101827"]]);
        ctx.strokeStyle = enemy.type.boss ? palette.gold : palette.cream;
        ctx.lineWidth = enemy.type.boss ? 3 : 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y + wobble, enemy.type.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (enemy.type.aura) {
        ctx.strokeStyle = "rgba(168,36,104,0.35)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 32, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (state.trial <= 6 || enemy.type.boss || enemy.type.aura) {
        const labelWidth = enemy.type.boss ? 86 : 58;
        ctx.fillStyle = "rgba(6,26,54,0.9)";
        roundRect(pos.x - labelWidth / 2, pos.y + spriteSize / 2 + 8, labelWidth, 18, 7);
        ctx.fill();
        label(enemy.type.trait, pos.x, pos.y + spriteSize / 2 + 11, 9, palette.cream, 900, "center", labelWidth - 8);
      }
      ctx.fillStyle = palette.crimson;
      ctx.fillRect(pos.x - 18, pos.y - spriteSize / 2 - 13, 36, 5);
      ctx.fillStyle = palette.green;
      ctx.fillRect(pos.x - 18, pos.y - spriteSize / 2 - 13, 36 * Math.max(0, enemy.hp / enemy.maxHp), 5);
      ctx.restore();
    });
  }

  function drawProjectiles() {
    state.projectiles.forEach((shot) => {
      if (!state.enemies.includes(shot.enemy)) return;
      const target = pathPoint(shot.enemy);
      const t = 1 - shot.life / 0.42;
      const x = shot.x + (target.x - shot.x) * t;
      const y = shot.y + (target.y - shot.y) * t;
      ctx.strokeStyle = resources[shot.kind].color;
      ctx.shadowColor = resources[shot.kind].color;
      ctx.shadowBlur = shot.kind === "candle" ? 12 : 7;
      ctx.lineWidth = shot.kind === "candle" ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = resources[shot.kind].color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawParticles() {
    state.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawFloaters() {
    state.floaters.forEach((f) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life);
      label(f.text, f.x, f.y, f.size, f.color, 900, "center", 360);
      ctx.restore();
    });
  }

  function drawTransition() {
    if (state.transition <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.88, state.transition);
    ctx.fillStyle = "rgba(3,12,24,0.62)";
    ctx.fillRect(0, 0, W, H);
    label("THE TRIAL BEGINS", W / 2, H / 2 - 36, 44, palette.gold, 900, "center");
    label(levelCounter(), W / 2, H / 2 + 18, 22, palette.cream, 900, "center");
    ctx.restore();
  }

  function drawEventCard() {
    if (!state.eventCard) return;
    ctx.fillStyle = "rgba(3,12,24,0.7)";
    ctx.fillRect(0, 0, W, H);
    panel(376, 190, 528, 380, "rgba(255,246,223,0.98)", "rgba(201,154,53,0.9)", 24);
    label(state.eventCard.title, 640, 238, 34, palette.navy, 900, "center");
    wrap(state.eventCard.body, 468, 304, 344, 28, 18, palette.blue, 800, "center");
    drawButton({ x: 477, y: 484, w: 326, h: 54, label: "ACCEPT AND CONTINUE" }, false);
  }

  function drawHelpOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(3,12,24,0.78)";
    ctx.fillRect(0, 0, W, H);
    panel(260, 92, 760, 560, "rgba(255,246,223,0.97)", "rgba(201,154,53,0.9)", 24);
    label("Tyler's Trial Field Guide", 640, 126, 30, palette.navy, 900, "center");
    label("Swap, match, build, merge, defend.", 640, 164, 15, palette.blue, 900, "center");
    drawButton({ x: 976, y: 124, w: 40, h: 40, label: "X" }, false);

    label("Defences", 310, 204, 17, palette.gold, 900);
    resourceKeys.forEach((keyName, index) => {
      const def = resources[keyName];
      const y = 232 + index * 62;
      panel(300, y, 318, 52, "rgba(6,26,54,0.08)", "rgba(13,55,109,0.14)", 12);
      drawDefenceSprite(keyName, 312, y + 7, 38, 0, false);
      label(def.short, 360, y + 7, 13, palette.navy, 900, "left", 130);
      wrap(def.detail, 360, y + 24, 232, 11, 9, palette.ink, 800);
    });

    label("Threat Counters", 662, 204, 17, palette.gold, 900);
    const counters = [
      ["Fast", "Use Wand slow so other defences can finish them."],
      ["Heavy", "Ashlar and Candle hit hardest against these."],
      ["Disruptor", "Candle focus removes their speed-reducing aura."],
      ["Boss", "Appears every tenth Trial. Focus fire and protect the entrance."],
    ];
    counters.forEach(([name, text], index) => {
      const y = 232 + index * 64;
      panel(650, y, 318, 52, "rgba(6,26,54,0.08)", "rgba(13,55,109,0.14)", 12);
      label(name, 668, y + 9, 13, palette.navy, 900, "left", 88);
      wrap(text, 760, y + 8, 188, 12, 9.5, palette.ink, 800);
    });

    label("Controls and Scoring", 662, 500, 17, palette.gold, 900);
    wrap("Setup: tap two adjacent tiles to swap them. Three resources build a defence. Three matching defences merge into a stronger defence. Combat: defences fire automatically; use Tyler abilities when the entrance is under pressure. Objectives award bonus score.", 650, 528, 318, 17, 12, palette.ink, 800);
    drawButton({ x: 466, y: 614, w: 348, h: 48, label: "RETURN TO THE TRIAL" }, false);
    ctx.restore();
  }

  function drawMenu() {
    ctx.fillStyle = "rgba(3,12,24,0.72)";
    ctx.fillRect(0, 0, W, H);
    panel(330, 90, 620, 580, "rgba(6,26,54,0.94)", "rgba(201,154,53,0.88)", 26);
    label("TYLER'S TRIAL", 640, 136, 54, palette.cream, 900, "center");
    label("A Masonic puzzle of preparation, harmony, and defence", 640, 202, 18, palette.lightBlue, 900, "center");
    if (state.mode === "how") {
      wrap("Loop: swap adjacent resources, match three to build a defence, merge three matching defences to strengthen them, then begin the Trial. Each Trial has an objective for bonus score. Ashlar is balanced, Candle reaches far, Lewis boosts nearby defences, Wand slows fast threats, and Jewels provide rewards. During setup, Installation deliberately randomises the board once. Between Degrees, only non-upgraded defences are reshuffled so stronger work stays in place.", 430, 248, 420, 22, 14, palette.cream);
    } else if (state.mode === "achievements") {
      wrap(`High Score: ${state.highScore}. Achievements are tracked by play: create stronger structures, survive Trials, and protect Lodge Security. This first version stores your best score locally.`, 430, 288, 420, 24, 16, palette.cream);
    } else {
      wrap("Build the Lodge before each Trial begins. Swap tiles to make matches, turn resources into defences, then protect the Lodge entrance from approaching threats.", 400, 238, 480, 20, 13, "rgba(255,255,255,0.82)", 800, "center");
      wrap("Every ten Trials you move to the next Degree. Enemies become harder, the board gets busier, and non-upgraded defences are reshuffled so new matches can be found while stronger work stays in place.", 400, 300, 480, 20, 13, "rgba(255,255,255,0.74)", 800, "center");
      menuRects().forEach((rect) => drawButton(rect, false));
    }
    if (state.mode !== "menu") drawButton({ id: "back", label: "BACK TO MENU", x: 505, y: 552, w: 270, h: 50 }, false);
  }

  function drawGameOver() {
    ctx.fillStyle = "rgba(3,12,24,0.78)";
    ctx.fillRect(0, 0, W, H);
    panel(330, 130, 620, 500, "rgba(6,26,54,0.96)", "rgba(201,154,53,0.9)", 26);
    label("THE LODGE HAS BEEN BREACHED", 640, 174, 30, palette.gold, 900, "center");
    const lines = [
      `Trials Survived: ${Math.max(0, state.trial - 1)}`,
      `Enemies Turned Away: ${state.stats.defeated}`,
      `Highest Structure: Level ${state.stats.highest || 1}`,
      `Best Harmony Chain: ${state.stats.bestChain}`,
      `Bosses Defeated: ${state.stats.bosses}`,
      `Final Score: ${state.score}`,
      `High Score: ${state.highScore}`,
    ];
    lines.forEach((line, index) => label(line, 468, 242 + index * 34, 18, index >= 5 ? palette.gold : palette.cream, 900));
    drawButton({ x: 440, y: 538, w: 190, h: 54, label: "TRY AGAIN" }, false);
    drawButton({ x: 650, y: 538, w: 190, h: 54, label: "RETURN" }, false);
  }

  function roman(number) {
    const numerals = [
      [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
    ];
    let value = number;
    let result = "";
    numerals.forEach(([amount, symbol]) => {
      while (value >= amount) {
        result += symbol;
        value -= amount;
      }
    });
    return result;
  }

  function update(dt) {
    updateTimers(dt);
    if (state.mode === "combat" && !state.helpOpen && !state.leaderboardOpen) updateCombat(dt);
    updateDomControls();
  }

  function updateDomControls() {
    if (beginButton) {
      beginButton.textContent = state.mode === "prep" ? "Begin Trial" : state.mode === "menu" ? "Begin Trial" : "Trial Running";
      beginButton.disabled = !["menu", "prep"].includes(state.mode);
    }
    if (alarmButton) {
      alarmButton.textContent = "Installation";
      alarmButton.disabled = state.mode !== "prep" || state.tyler.installation <= 0;
    }
  }

  function render(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reducedMotion) clock += dt;
    update(dt);
    drawGame();
    requestAnimationFrame(render);
  }

  function installEvents() {
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      onPointerDown(event);
    }, { passive: false });
    canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      onPointerMove(event);
    }, { passive: false });
    beginButton?.addEventListener("click", () => {
      if (state.mode === "menu") startGame();
      else if (state.mode === "prep") beginCombat();
    });
    alarmButton?.addEventListener("click", () => useAbility("installation"));
    restartButton?.addEventListener("click", startGame);
    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape" && state.helpOpen) {
        state.helpOpen = false;
        return;
      }
      if (key === "escape") window.location.href = "index.html";
      if (key === "h") {
        state.helpOpen = !state.helpOpen;
      }
      if (key === " " && state.mode === "prep") {
        event.preventDefault();
        beginCombat();
      }
      if (key === "1") useAbility("sword");
      if (key === "2") useAbility("guard");
      if (key === "3") useAbility("installation");
      if (key === "4") useAbility("close");
    });
  }

  function exposeDebugApi() {
    window.tylersTrialDebug = {
      getState: () => ({
        mode: state.mode,
        trial: state.trial,
        score: state.score,
        security: state.security,
        swaps: state.swaps,
        enemies: state.enemies.length,
        towers: state.board.flat().filter((cell) => cell.tile?.tower).length,
        highScore: state.highScore,
      }),
      snapshotBoard: () => state.board.map((line) => line.map((cell) => {
        if (cell.path) return "path";
        if (!cell.tile) return "empty";
        return `${cell.tile.kind}-${cell.tile.level}-${cell.tile.tower ? "tower" : "resource"}`;
      })),
      begin: startGame,
      forceMatch: () => {
        state.mode = "prep";
        state.board[1][0].tile = makeTile("ashlar");
        state.board[1][1].tile = makeTile("ashlar");
        state.board[1][2].tile = makeTile("ashlar");
        resolveMatches(false, [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }]);
      },
      forceToolSupport: () => {
        state.mode = "combat";
        state.board[2][2].tile = { ...makeTile("tool"), tower: true, level: 1 };
        state.board[2][3].tile = { ...makeTile("ashlar"), tower: true, level: 1, cooldown: 0 };
        state.enemies = [{
          type: enemyTypes.cowan,
          hp: 80,
          maxHp: 80,
          progress: 7.2,
          path: pathCells,
          slow: 1,
          wobble: 0,
          id: "debug-enemy",
        }];
        return nearbySupport(2, 3);
      },
      supportAt: nearbySupport,
      beginCombat,
      clearWave: () => {
        state.enemies = [];
        state.wave.spawned = state.wave.total;
      },
      damageLodge: () => {
        state.security = 1;
        state.tyler.charges = 0;
        state.tyler.guard = 0;
        state.tyler.closed = 0;
        reachDoor({ type: enemyTypes.ruffian, path: pathCells, progress: pathCells.length - 1 });
      },
    };
  }

  async function init() {
    resizeCanvas();
    state = emptyState();
    setupLeaderboardUi();
    const loaded = await Promise.all(Object.entries(assets).map(async ([key, src]) => [key, await loadImage(src)]));
    loaded.forEach(([key, img]) => { images[key] = img; });
    loading?.setAttribute("hidden", "");
    installEvents();
    exposeDebugApi();
    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resizeCanvas);
  init();
})();
