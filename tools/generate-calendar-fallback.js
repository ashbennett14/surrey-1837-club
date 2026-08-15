#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "calendar-events.json");
const jsPath = path.join(root, "calendar-events.js");

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const output = `window.surrey1837ManagedCalendarData = ${JSON.stringify(data, null, 2)};\n`;

fs.writeFileSync(jsPath, output);
console.log(`Generated ${path.relative(root, jsPath)} from ${path.relative(root, jsonPath)}.`);
