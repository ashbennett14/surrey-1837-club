#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "assets");
const displayDir = path.join(assetsDir, "display");
const dataPath = path.join(root, "calendar-events.json");
const maxBytes = 500 * 1024;

fs.mkdirSync(displayDir, { recursive: true });

function assetPath(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return relativePath && !/^https?:\/\//i.test(relativePath) && fs.existsSync(assetPath(relativePath));
}

function needsDisplayImage(relativePath) {
  return exists(relativePath) && fs.statSync(assetPath(relativePath)).size > maxBytes;
}

function displayPathFor(relativePath) {
  const parsed = path.parse(relativePath);
  return `assets/display/${parsed.name}-display${parsed.ext.toLowerCase()}`;
}

function maxDimensionFor(collection) {
  return collection === "socialEvents" ? 560 : 420;
}

function generateDisplayImage(source, destination, maxDimension) {
  const output = assetPath(destination);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  execFileSync("sips", ["-Z", String(maxDimension), assetPath(source), "--out", output], {
    stdio: "ignore",
  });
}

function updateCalendarImages() {
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  let generated = 0;
  let updated = 0;

  ["socialEvents", "lodgeEvents", "chapterEvents"].forEach((collection) => {
    (data[collection] || []).forEach((event) => {
      if (!needsDisplayImage(event.poster)) return;
      const destination = displayPathFor(event.poster);
      if (
        !fs.existsSync(assetPath(destination)) ||
        fs.statSync(assetPath(destination)).size > fs.statSync(assetPath(event.poster)).size ||
        fs.statSync(assetPath(destination)).size > maxBytes
      ) {
        generateDisplayImage(event.poster, destination, maxDimensionFor(collection));
        generated += 1;
      }
      event.displayPoster = destination;
      event.fullPoster = event.poster;
      updated += 1;
    });
  });

  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Calendar images: ${generated} generated, ${updated} records updated.`);
}

function optimiseStandaloneImages() {
  const standaloneAssets = [
    "assets/general-chat.png",
    "assets/surrey-1837-club-home.png",
    "assets/tylers-trial-defences-v1.png",
    "assets/tylers-trial-defences-v2.png",
    "assets/tylers-trial-enemies-v1.png",
    "assets/tylers-trial-enemies-v2.png",
    "assets/tylers-trial-tyler-sheet-v1.png",
    "assets/tylers-trial-ui-v1.png",
  ];
  let generated = 0;

  standaloneAssets.forEach((source) => {
    if (!needsDisplayImage(source)) return;
    const destination = displayPathFor(source);
    if (
      !fs.existsSync(assetPath(destination)) ||
      fs.statSync(assetPath(destination)).size > fs.statSync(assetPath(source)).size ||
      fs.statSync(assetPath(destination)).size > maxBytes
    ) {
      generateDisplayImage(source, destination, source.includes("tylers-trial") ? 820 : 520);
      generated += 1;
    }
  });

  console.log(`Standalone display images: ${generated} generated.`);
}

updateCalendarImages();
optimiseStandaloneImages();
