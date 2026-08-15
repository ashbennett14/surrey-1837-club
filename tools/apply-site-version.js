#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const versionPath = path.join(__dirname, "site-version.json");
const { version } = JSON.parse(fs.readFileSync(versionPath, "utf8"));

if (!version || !/^[a-z0-9._-]+$/i.test(version)) {
  throw new Error("tools/site-version.json needs a simple version string.");
}

const htmlFiles = fs
  .readdirSync(root)
  .filter((file) => file.endsWith(".html"))
  .map((file) => path.join(root, file));

htmlFiles.forEach((file) => {
  const before = fs.readFileSync(file, "utf8");
  const after = before.replace(
    /(href|src)="([^"]+\.(?:css|js))\?v=[^"]+"/g,
    `$1="$2?v=${version}"`,
  );

  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log(`Updated ${path.relative(root, file)} to ${version}.`);
  }
});
