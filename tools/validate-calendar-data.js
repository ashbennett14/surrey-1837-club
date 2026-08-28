#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "calendar-events.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const requiredCollections = ["socialEvents", "lodgeEvents", "chapterEvents"];
const socialCategories = new Set(["1837 Club Event", "Community Event"]);
const meetingTypes = new Set([
  "Installation",
  "Initiation",
  "Installation & Initiation",
  "Passing",
  "Raising",
  "Other",
  "Royal Arch",
  "Initiation & Passing",
]);
const errors = [];
const warnings = [];
const seenIds = new Map();
const seenLikelyDuplicates = new Map();

function addIssue(list, collection, id, message) {
  list.push(`${collection}${id ? `/${id}` : ""}: ${message}`);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function fileExists(assetPath) {
  if (!assetPath || /^https?:\/\//i.test(assetPath)) return true;
  return fs.existsSync(path.join(root, assetPath));
}

function fileSize(assetPath) {
  if (!assetPath || /^https?:\/\//i.test(assetPath)) return 0;
  try {
    return fs.statSync(path.join(root, assetPath)).size;
  } catch {
    return 0;
  }
}

function normaliseKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

requiredCollections.forEach((collection) => {
  if (!Array.isArray(data[collection])) {
    addIssue(errors, collection, "", "missing collection array");
    return;
  }

  data[collection].forEach((event, index) => {
    const id = event.id || `row-${index + 1}`;
    const isSocial = collection === "socialEvents";
    const required = isSocial
      ? ["id", "date", "title", "location", "category"]
      : ["id", "date", "title", "lodgeName", "lodgeNumber", "degree", "location"];

    required.forEach((field) => {
      if (!String(event[field] || "").trim()) {
        addIssue(errors, collection, id, `missing required field "${field}"`);
      }
    });

    if (!isValidDate(event.date)) {
      addIssue(errors, collection, id, `invalid date "${event.date || ""}"`);
    }

    if (seenIds.has(event.id)) {
      addIssue(errors, collection, id, `duplicate id also used by ${seenIds.get(event.id)}`);
    } else if (event.id) {
      seenIds.set(event.id, collection);
    }

    const duplicateKey = `${collection}|${event.date}|${normaliseKey(event.title)}|${normaliseKey(event.location)}`;
    if (seenLikelyDuplicates.has(duplicateKey)) {
      addIssue(warnings, collection, id, "possible duplicate event with the same date, title, and location");
    } else {
      seenLikelyDuplicates.set(duplicateKey, id);
    }

    if (isSocial && !socialCategories.has(event.category)) {
      addIssue(errors, collection, id, `invalid social category "${event.category || ""}"`);
    }

    if (!isSocial && !meetingTypes.has(event.degree)) {
      addIssue(errors, collection, id, `invalid meeting type "${event.degree || ""}"`);
    }

    ["poster", "displayPoster"].forEach((field) => {
      if (event[field] && !fileExists(event[field])) {
        addIssue(errors, collection, id, `missing image path in "${field}": ${event[field]}`);
      }
    });

    if (event.poster && fileSize(event.poster) > 2.5 * 1024 * 1024) {
      addIssue(warnings, collection, id, `large original image (${Math.round(fileSize(event.poster) / 1024)} KB)`);
    }
  });
});

const totals = requiredCollections
  .map((collection) => `${collection}: ${Array.isArray(data[collection]) ? data[collection].length : 0}`)
  .join(", ");

warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

if (errors.length > 0) {
  errors.forEach((error) => console.error(`Error: ${error}`));
  console.error(`Calendar validation failed. ${totals}`);
  process.exit(1);
}

console.log(`Calendar validation passed. ${totals}`);
