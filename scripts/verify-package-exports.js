#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const rootDir = path.resolve(__dirname, "..");
const entryPath = path.join(rootDir, "dist/module/index.js");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(entryPath)) {
  fail("dist/module/index.js is missing. Run yarn build first.");
}

if (packageJson["react-native"] !== "./src/index.ts") {
  fail('package.json must expose "react-native": "./src/index.ts".');
}

if (packageJson.exports?.["."]?.["react-native"] !== "./src/index.ts") {
  fail('package exports must expose "." react-native -> ./src/index.ts.');
}

const pretextSource = fs.readFileSync(
  path.join(rootDir, "src/Pretext.ts"),
  "utf8",
);

if (!pretextSource.includes('from "./TextMeasure";')) {
  fail(
    'src/Pretext.ts must import "./TextMeasure" without an extension so Metro can resolve TextMeasure.native.ts.',
  );
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
