#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const requiredFiles = [
  "package.json",
  "src/index.ts",
  "dist/module/index.js",
  "dist/types/index.d.ts",
  "nitro.json",
  "nitrogen/generated/android/pretext+autolinking.gradle",
  "nitrogen/generated/android/pretext+autolinking.cmake",
  "nitrogen/generated/android/pretextOnLoad.cpp",
  "nitrogen/generated/ios/Pretext+autolinking.rb",
  "nitrogen/generated/ios/PretextAutolinking.swift",
  "nitrogen/generated/shared/c++/HybridPretextSpec.hpp",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

const pack = spawnSync(
  "npm",
  ["pack", "--dry-run", "--ignore-scripts", "--json"],
  {
    cwd: rootDir,
    encoding: "utf8",
  },
);

if (pack.error) {
  fail(pack.error.message);
}

if (pack.status !== 0) {
  process.stderr.write(pack.stderr);
  process.stdout.write(pack.stdout);
  fail("npm pack --dry-run failed.");
}

const output = pack.stdout.trim();
const jsonStart = output.indexOf("[");
const jsonEnd = output.lastIndexOf("]");

if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
  fail("npm pack did not return JSON output.");
}

const [packResult] = JSON.parse(output.slice(jsonStart, jsonEnd + 1));
const packedFiles = new Set(packResult.files.map((file) => file.path));
const missingFiles = requiredFiles.filter((file) => !packedFiles.has(file));

if (missingFiles.length > 0) {
  fail(
    [
      "Package tarball is missing required files:",
      ...missingFiles.map((file) => `- ${file}`),
      "Run yarn build and make sure package.json files includes the generated outputs.",
    ].join("\n"),
  );
}

console.log(
  `Package contents verified (${packResult.entryCount} files, including Nitrogen generated outputs).`,
);
