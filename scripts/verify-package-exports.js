#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const rootDir = path.resolve(__dirname, "..");
const entryPath = path.join(rootDir, "dist/module/index.js");

if (!fs.existsSync(entryPath)) {
  console.error("dist/module/index.js is missing. Run yarn build first.");
  process.exit(1);
}

import(pathToFileURL(entryPath).href)
  .then((module) => {
    for (const exportName of [
      "Pretext",
      "layout",
      "prepare",
      "usePretextLayout",
    ]) {
      if (module[exportName] === undefined) {
        throw new Error(`Missing package export: ${exportName}`);
      }
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
