#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const maxLines = 900;
const sourceRoots = ["android/src/main/java/com/margelo/nitro/pretext", "ios"];
const sourcePattern = /\.(kt|swift)$/;

function listNativeSources(relativeDir) {
  const dir = path.join(rootDir, relativeDir);

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && sourcePattern.test(entry.name))
    .map((entry) => path.join(relativeDir, entry.name));
}

function countLines(source) {
  if (source.length === 0) {
    return 0;
  }

  const newlineCount = source.split("\n").length - 1;
  return source.endsWith("\n") ? newlineCount : newlineCount + 1;
}

const violations = sourceRoots
  .flatMap(listNativeSources)
  .map((relativePath) => {
    const absolutePath = path.join(rootDir, relativePath);
    const lineCount = countLines(fs.readFileSync(absolutePath, "utf8"));

    return { lineCount, relativePath };
  })
  .filter(({ lineCount }) => lineCount > maxLines)
  .sort((left, right) => right.lineCount - left.lineCount);

if (violations.length > 0) {
  console.error(`Native source files must stay at or below ${maxLines} lines:`);
  for (const violation of violations) {
    console.error(`- ${violation.relativePath}: ${violation.lineCount} lines`);
  }
  process.exit(1);
}

console.log(`Native source size guard passed. Max allowed: ${maxLines} lines.`);
