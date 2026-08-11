(function () {
  const canvas = document.querySelector("#lodgeGameCanvas");
  const loading = document.querySelector("#lodgeGameLoading");
  const help = document.querySelector("#lodgeGameHelp");
  const guideButton = document.querySelector("#gameRotate");
  const dropButton = document.querySelector("#gameRedraw");
  const restartButton = document.querySelector("#gameRestart");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const W = 1280;
  const H = 720;
  const floorBounds = { x: 205, y: 210, w: 870, h: 420 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const palette = {
    navy: "#071f3f",
    blue: "#0d376d",
    lightBlue: "#9ed0ff",
    gold: "#c59a36",
    cream: "#fff7e6",
    green: "#4f8a5b",
    red: "#9e1d2f",
    ink: "#ffffff",
  };

  const assets = {
    bg: "assets/tylers-lodge-floor-bg.webp",
    character: "assets/tylers-lodge-character.webp",
    items: "assets/tylers-lodge-items.webp",
    ui: "assets/tylers-lodge-ui.webp",
  };

  const assetImages = {};

  const itemDefs = [
    {
      id: "summons",
      name: "Summons",
      station: "Secretary's Desk",
      clue: "Take the summons to the desk.",
      sheet: 0,
      color: "#9ed0ff",
    },
    {
      id: "apron",
      name: "Apron",
      station: "Preparation Bench",
      clue: "Place the apron neatly on the bench.",
      sheet: 1,
      color: "#d8ebff",
    },
    {
      id: "gavel",
      name: "Gavel",
      station: "Master's Pedestal",
      clue: "Return the gavel to the main pedestal.",
      sheet: 2,
      color: "#d4a83e",
    },
    {
      id: "book",
      name: "Book of Constitutions",
      station: "Book Stand",
      clue: "Carry the book to the book stand.",
      sheet: 3,
      color: "#fff7e6",
    },
    {
      id: "acacia",
      name: "Acacia Sprig",
      station: "Acacia Vase",
      clue: "Set the acacia sprig in the vase.",
      sheet: 4,
      color: "#70b36d",
    },
    {
      id: "charity",
      name: "Charity Jewel",
      station: "Charity Table",
      clue: "Put the charity jewel on the charity table.",
      sheet: 5,
      color: "#f5d46a",
    },
    {
      id: "key",
      name: "Tyler's Key",
      station: "West Door",
      clue: "Return the key to the West Door.",
      sheet: 6,
      color: "#c59a36",
    },
    {
      id: "column",
      name: "Column Token",
      station: "Twin Columns",
      clue: "Place the column token between the columns.",
      sheet: 7,
      color: "#b9dcff",
    },
  ];

  const stationLayout = [
    { id: "summons", x: 900, y: 244 },
    { id: "apron", x: 274, y: 478 },
    { id: "gavel", x: 640, y: 270 },
    { id: "book", x: 912, y: 508 },
    { id: "acacia", x: 995, y: 318 },
    { id: "charity", x: 336, y: 314 },
    { id: "key", x: 218, y: 600 },
    { id: "column", x: 640, y: 188 },
  ];

  const itemSpawns = [
    { x: 392, y: 546 },
    { x: 760, y: 574 },
    { x: 510, y: 324 },
    { x: 826, y: 365 },
    { x: 574, y: 606 },
    { x: 708, y: 438 },
    { x: 466, y: 438 },
    { x: 930, y: 604 },
  ];

  const upgrades = [
    {
      id: "pace",
      name: "Light Blue Pace",
      desc: "Move faster next round.",
      sheet: 1,
      apply: (state) => {
        state.speedBonus += 24;
      },
    },
    {
      id: "steward",
      name: "Steward's Eye",
      desc: "Stations glow from further away.",
      sheet: 0,
      apply: (state) => {
        state.stationGlow += 14;
      },
    },
    {
      id: "charity",
      name: "Charity Boost",
      desc: "Each delivery scores more.",
      sheet: 5,
      apply: (state) => {
        state.deliveryBonus += 25;
      },
    },
    {
      id: "acacia",
      name: "Acacia Calm",
      desc: "Adds extra time next round.",
      sheet: 4,
      apply: (state) => {
        state.extraTime += 8;
      },
    },
  ];

  let state;
  let pointer = { x: -1, y: -1 };
  let keys = new Set();
  let lastFrame = performance.now();
  let t = 0;

  function createState() {
    return {
      player: { x: 640, y: 588, targetX: 640, targetY: 588, speed: 214 },
      items: [],
      stations: [],
      carried: null,
      score: 0,
      round: 1,
      delivered: 0,
      totalThisRound: 6,
      timeLeft: 72,
      speedBonus: 0,
      stationGlow: 0,
      deliveryBonus: 0,
      extraTime: 0,
      message: "Walk the floor, collect an item, and carry it to its glowing station.",
      mode: "playing",
      upgradeChoices: [],
      floating: [],
      guidePulse: null,
    };
  }

  function resizeCanvas() {
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.aspectRatio = `${W} / ${H}`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function say(text) {
    state.message = text;
    if (help) help.textContent = text;
  }

  function startRound() {
    const selection = shuffle(itemDefs).slice(0, Math.min(8, state.totalThisRound + state.round - 1));
    const spawnSelection = shuffle(itemSpawns);
    state.items = selection.map((item, index) => ({
      ...item,
      x: spawnSelection[index].x,
      y: spawnSelection[index].y,
      collected: false,
      delivered: false,
      bob: Math.random() * Math.PI * 2,
    }));
    state.stations = selection.map((item) => {
      const layout = stationLayout.find((station) => station.id === item.id);
      return { ...item, x: layout.x, y: layout.y, r: 38 };
    });
    state.carried = null;
    state.delivered = 0;
    state.timeLeft = 68 + state.extraTime + Math.max(0, 4 - state.round) * 4;
    state.mode = "playing";
    state.player.x = 640;
    state.player.y = 588;
    state.player.targetX = 640;
    state.player.targetY = 588;
    say(`Round ${state.round}: set ${selection.length} lodge-room items before time runs out.`);
  }

  function restartGame() {
    state = createState();
    startRound();
  }

  function finishRound() {
    state.score += Math.round(state.timeLeft * 2) + state.round * 75;
    state.mode = "choose-upgrade";
    state.upgradeChoices = shuffle(upgrades).slice(0, 3);
    say("Room set. Choose a useful advantage for the next round.");
  }

  function chooseUpgrade(index) {
    if (state.mode !== "choose-upgrade") return;
    const choice = state.upgradeChoices[index];
    if (!choice) return;
    choice.apply(state);
    state.round += 1;
    state.totalThisRound = Math.min(8, state.totalThisRound + 1);
    startRound();
  }

  function endGame(reason) {
    state.mode = "game-over";
    say(reason);
  }

  function callGuide() {
    if (state.mode !== "playing") return;
    const target = state.carried
      ? state.stations.find((station) => station.id === state.carried.id)
      : nearestAvailableItem();

    if (!target) {
      say("Everything is set. Excellent work.");
      return;
    }

    state.guidePulse = { x: target.x, y: target.y, until: performance.now() + 2800 };
    say(state.carried ? state.carried.clue : `Collect the ${target.name}.`);
  }

  function dropItem() {
    if (state.mode !== "playing") return;
    if (!state.carried) {
      say("You are not carrying anything.");
      return;
    }
    state.carried.collected = false;
    state.carried.x = state.player.x + 26;
    state.carried.y = state.player.y + 8;
    state.items.push(state.carried);
    say(`${state.carried.name} dropped. Pick it up again when ready.`);
    state.carried = null;
  }

  function nearestAvailableItem() {
    const available = state.items.filter((item) => !item.collected && !item.delivered);
    available.sort((a, b) => distance(state.player, a) - distance(state.player, b));
    return available[0] || null;
  }

  function update(dt) {
    if (state.mode !== "playing") {
      updateFloating(dt);
      return;
    }

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endGame("Time called. Try again and set the room a little quicker.");
      return;
    }

    movePlayer(dt);
    collectAndDeliver();
    updateFloating(dt);

    if (state.delivered >= state.stations.length) {
      finishRound();
    }
  }

  function movePlayer(dt) {
    const player = state.player;
    const speed = player.speed + state.speedBonus;
    let vx = 0;
    let vy = 0;

    if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
    if (keys.has("arrowright") || keys.has("d")) vx += 1;
    if (keys.has("arrowup") || keys.has("w")) vy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) vy += 1;

    if (vx || vy) {
      const length = Math.hypot(vx, vy) || 1;
      player.x += (vx / length) * speed * dt;
      player.y += (vy / length) * speed * dt;
      player.targetX = player.x;
      player.targetY = player.y;
    } else {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const remaining = Math.hypot(dx, dy);
      if (remaining > 2) {
        const step = Math.min(remaining, speed * dt);
        player.x += (dx / remaining) * step;
        player.y += (dy / remaining) * step;
      }
    }

    player.x = clamp(player.x, floorBounds.x, floorBounds.x + floorBounds.w);
    player.y = clamp(player.y, floorBounds.y, floorBounds.y + floorBounds.h);
  }

  function collectAndDeliver() {
    if (!state.carried) {
      const item = state.items.find((candidate) => !candidate.collected && !candidate.delivered && distance(state.player, candidate) < 42);
      if (item) {
        item.collected = true;
        state.carried = item;
        state.items = state.items.filter((candidate) => candidate !== item);
        say(item.clue);
        addFloating(`Picked up ${item.name}`, item.x, item.y, item.color);
      }
      return;
    }

    const station = state.stations.find((candidate) => candidate.id === state.carried.id);
    if (station && distance(state.player, station) < 52 + state.stationGlow) {
      state.carried.delivered = true;
      state.delivered += 1;
      const points = 120 + state.round * 15 + state.deliveryBonus + Math.round(state.timeLeft / 3);
      state.score += points;
      addFloating(`+${points}`, station.x - 10, station.y - 24, palette.gold);
      say(`${state.carried.name} set at the ${station.station}.`);
      state.carried = null;
    }
  }

  function updateFloating(dt) {
    state.floating = state.floating
      .map((text) => ({ ...text, y: text.y - 36 * dt, life: text.life - dt * 0.72 }))
      .filter((text) => text.life > 0);
  }

  function addFloating(text, x, y, color) {
    state.floating.push({ text, x, y, color, life: 1 });
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * W,
      y: ((source.clientY - rect.top) / rect.height) * H,
    };
  }

  function onPointerMove(event) {
    pointer = canvasPoint(event);
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
      if (point.x >= 464 && point.x <= 620 && point.y >= 520 && point.y <= 576) restartGame();
      if (point.x >= 650 && point.x <= 842 && point.y >= 520 && point.y <= 576) window.location.href = "index.html";
      return;
    }

    state.player.targetX = clamp(point.x, floorBounds.x, floorBounds.x + floorBounds.w);
    state.player.targetY = clamp(point.y, floorBounds.y, floorBounds.y + floorBounds.h);
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(total / 60);
    const remainder = String(total % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
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

  function panel(x, y, w, h, fill, stroke, r) {
    ctx.save();
    roundRect(x, y, w, h, r || 18);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke || "rgba(197, 154, 54, 0.62)";
    ctx.stroke();
    ctx.restore();
  }

  function text(content, x, y, size, color, weight, align, maxWidth) {
    ctx.save();
    ctx.font = `${weight || 800} ${size}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(content, x, y, maxWidth);
    ctx.restore();
  }

  function wrapText(content, x, y, maxWidth, lineHeight, size, color) {
    const words = content.split(" ");
    let line = "";
    let currentY = y;
    ctx.save();
    ctx.font = `800 ${size}px Inter, Arial, sans-serif`;
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

  function drawScene() {
    drawImageCover(assetImages.bg, 0, 0, W, H, 1);
    ctx.fillStyle = "rgba(3, 12, 24, 0.15)";
    ctx.fillRect(0, 0, W, H);

    const pulse = reducedMotion ? 0 : Math.sin(t * 2) * 0.5 + 0.5;
    state.stations.forEach((station) => {
      const done = !state.items.some((item) => item.id === station.id) && state.carried?.id !== station.id;
      const active = state.carried?.id === station.id;
      ctx.save();
      ctx.globalAlpha = done ? 0.28 : active ? 0.95 : 0.52;
      ctx.shadowColor = active ? station.color : "rgba(158, 208, 255, 0.55)";
      ctx.shadowBlur = active ? 24 + pulse * 12 : 12;
      ctx.fillStyle = active ? station.color : "rgba(158, 208, 255, 0.42)";
      ctx.beginPath();
      ctx.arc(station.x, station.y, station.r + (active ? pulse * 8 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = palette.gold;
      ctx.stroke();
      ctx.restore();
      if (!done) text(station.station, station.x, station.y + 42, 11, "rgba(255,255,255,0.78)", 900, "center", 130);
    });

    state.items.forEach((item) => {
      const bob = reducedMotion ? 0 : Math.sin(t * 3 + item.bob) * 6;
      drawItemIcon(item, item.x - 34, item.y - 40 + bob, 68, 58);
      text(item.name, item.x, item.y + 28 + bob, 12, palette.cream, 900, "center", 120);
    });

    if (state.guidePulse && state.guidePulse.until > performance.now()) {
      const age = (state.guidePulse.until - performance.now()) / 2800;
      ctx.save();
      ctx.globalAlpha = Math.max(0, age);
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(state.guidePulse.x, state.guidePulse.y, 54 + (1 - age) * 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawPlayer();
    drawCarriedItem();
    drawFloating();
  }

  function drawPlayer() {
    const player = state.player;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 30, 38, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    if (assetImages.character) {
      ctx.drawImage(assetImages.character, player.x - 54, player.y - 128, 112, 170);
    } else {
      ctx.fillStyle = palette.lightBlue;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 28, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCarriedItem() {
    if (!state.carried) return;
    drawItemIcon(state.carried, state.player.x + 16, state.player.y - 118, 58, 48);
    text(state.carried.name, state.player.x + 48, state.player.y - 68, 12, palette.cream, 900, "center", 110);
  }

  function drawFloating() {
    state.floating.forEach((floating) => {
      ctx.save();
      ctx.globalAlpha = floating.life;
      text(floating.text, floating.x, floating.y, 18, floating.color, 900, "center", 220);
      ctx.restore();
    });
  }

  function drawHud() {
    panel(26, 22, 1228, 58, "rgba(4, 17, 34, 0.86)", "rgba(197, 154, 54, 0.65)", 18);
    text("Tyler's Trial: Set the Lodge Room", 52, 37, 24, palette.ink, 900);
    text(`Score ${state.score}`, 644, 40, 18, palette.gold, 900, "center");
    text(`Round ${state.round}`, 790, 40, 18, palette.lightBlue, 900, "center");
    text(`Time ${formatTime(state.timeLeft)}`, 940, 40, 18, state.timeLeft < 12 ? palette.red : palette.cream, 900, "center");
    text(`${state.delivered}/${state.stations.length} Set`, 1100, 40, 18, palette.green, 900, "center");

    panel(36, 96, 318, 112, "rgba(7, 31, 63, 0.86)", "rgba(197, 154, 54, 0.55)", 18);
    text("Current Task", 60, 116, 15, palette.lightBlue, 900);
    wrapText(state.message, 60, 142, 260, 20, 15, palette.cream);

    panel(950, 96, 288, 134, "rgba(7, 31, 63, 0.82)", "rgba(197, 154, 54, 0.55)", 18);
    text("Controls", 974, 116, 15, palette.lightBlue, 900);
    wrapText("Arrow keys or WASD to walk. Click or tap the floor to move. Pick up an item, then go to the matching glowing station.", 974, 142, 232, 18, 13, "rgba(255,255,255,0.84)");

    panel(950, 548, 288, 92, "rgba(7, 31, 63, 0.78)", "rgba(197, 154, 54, 0.45)", 18);
    text("Carrying", 974, 568, 14, palette.lightBlue, 900);
    if (state.carried) {
      drawItemIcon(state.carried, 974, 588, 44, 38);
      text(state.carried.name, 1026, 592, 14, palette.cream, 900);
    } else {
      text("Nothing yet", 974, 594, 14, "rgba(255,255,255,0.74)", 900);
    }
  }

  function upgradeRects() {
    return [0, 1, 2].map((index) => ({
      index,
      x: 300 + index * 230,
      y: 315,
      w: 204,
      h: 248,
    }));
  }

  function drawOverlay() {
    if (state.mode === "choose-upgrade") {
      ctx.fillStyle = "rgba(3, 12, 24, 0.7)";
      ctx.fillRect(0, 0, W, H);
      panel(248, 164, 784, 440, "rgba(7, 31, 63, 0.96)", "rgba(197, 154, 54, 0.92)", 24);
      text("Room Set", 640, 196, 42, palette.cream, 900, "center");
      text("Choose one advantage for the next round", 640, 246, 16, palette.lightBlue, 900, "center");

      upgradeRects().forEach((rect) => {
        const upgrade = state.upgradeChoices[rect.index];
        const hover = pointer.x >= rect.x && pointer.x <= rect.x + rect.w && pointer.y >= rect.y && pointer.y <= rect.y + rect.h;
        panel(rect.x, rect.y, rect.w, rect.h, hover ? "rgba(255, 247, 230, 0.98)" : "rgba(255, 247, 230, 0.9)", hover ? palette.lightBlue : "rgba(197, 154, 54, 0.75)", 18);
        drawItemIcon(upgrade, rect.x + 46, rect.y + 24, 112, 88);
        text(upgrade.name, rect.x + rect.w / 2, rect.y + 132, 17, palette.navy, 900, "center", rect.w - 20);
        wrapText(upgrade.desc, rect.x + 28, rect.y + 168, rect.w - 56, 19, 14, palette.blue);
      });
    }

    if (state.mode === "game-over") {
      ctx.fillStyle = "rgba(3, 12, 24, 0.74)";
      ctx.fillRect(0, 0, W, H);
      panel(330, 188, 620, 416, "rgba(7, 31, 63, 0.96)", "rgba(197, 154, 54, 0.94)", 24);
      text("Trial Over", 640, 230, 44, palette.cream, 900, "center");
      text(`Final Score ${state.score}`, 640, 296, 24, palette.gold, 900, "center");
      text(`Round ${state.round}`, 640, 332, 18, palette.lightBlue, 900, "center");
      wrapText(state.message, 450, 378, 380, 23, 16, "rgba(255,255,255,0.84)");
      drawButton(464, 520, 156, 56, "Play Again");
      drawButton(650, 520, 192, 56, "Return");
    }
  }

  function drawButton(x, y, w, h, label) {
    panel(x, y, w, h, "rgba(255, 247, 230, 0.96)", "rgba(197, 154, 54, 0.86)", 16);
    text(label, x + w / 2, y + 18, 15, palette.navy, 900, "center");
  }

  function render(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!reducedMotion) t += dt;
    update(dt);
    drawScene();
    drawHud();
    drawOverlay();
    requestAnimationFrame(render);
  }

  function installEvents() {
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mouseleave", () => {
      pointer = { x: -1, y: -1 };
    });
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      onPointerDown(event);
    }, { passive: false });
    canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      onPointerMove(event);
    }, { passive: false });

    guideButton?.addEventListener("click", callGuide);
    dropButton?.addEventListener("click", dropItem);
    restartButton?.addEventListener("click", restartGame);

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape") {
        window.location.href = "index.html";
        return;
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        keys.add(key);
        event.preventDefault();
      }
      if (key === "g") callGuide();
      if (key === "q") dropItem();
    });

    document.addEventListener("keyup", (event) => {
      keys.delete(event.key.toLowerCase());
    });
  }

  function exposeDebugApi() {
    window.tylersTrialDebug = {
      getState: () => ({
        score: state.score,
        round: state.round,
        delivered: state.delivered,
        carrying: state.carried?.name || null,
        mode: state.mode,
        timeLeft: Math.round(state.timeLeft),
      }),
      moveToFirstItem: () => {
        const item = nearestAvailableItem();
        if (!item) return false;
        state.player.x = item.x;
        state.player.y = item.y;
        collectAndDeliver();
        return true;
      },
      deliverCarried: () => {
        if (!state.carried) return false;
        const station = state.stations.find((candidate) => candidate.id === state.carried.id);
        state.player.x = station.x;
        state.player.y = station.y;
        collectAndDeliver();
        return true;
      },
      finishRound: () => finishRound(),
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
