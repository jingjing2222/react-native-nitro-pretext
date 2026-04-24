#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const moduleDir = path.resolve(__dirname, "../dist/module");
const files = ["Pretext.js"];

for (const fileName of files) {
  const filePath = path.join(moduleDir, fileName);
  const source = fs.readFileSync(filePath, "utf8");
  const patched = source.replace(
    /from "\.\/TextMeasure";/g,
    'from "./TextMeasure.js";',
  );

  if (patched !== source) {
    fs.writeFileSync(filePath, patched);
  }
}
