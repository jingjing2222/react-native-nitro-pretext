#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const [, , logcatPathArg, maestroLogPathArg] = process.argv;

if (!logcatPathArg || !maestroLogPathArg) {
  console.error(
    "usage: node example/maestro/scripts/append-parity-logcat-report.js <logcat-log> <maestro-log>",
  );
  process.exit(1);
}

const logcatPath = path.resolve(logcatPathArg);
const maestroLogPath = path.resolve(maestroLogPathArg);
const logcat = fs.readFileSync(logcatPath, "utf8");
const groups = new Map();

function groupForKey(key) {
  const existing = groups.get(key);
  if (existing) {
    return existing;
  }

  const next = {
    chunks: new Map(),
    doneTotal: null,
    lastSeenLine: 0,
    total: null,
  };
  groups.set(key, next);
  return next;
}

logcat.split(/\r?\n/u).forEach((line, lineIndex) => {
  const chunkMarker = "BENCHMARK_REPORT_CHUNK::benchmark/parity::";
  const chunkStart = line.indexOf(chunkMarker);
  if (chunkStart >= 0) {
    const payload = line.slice(chunkStart + chunkMarker.length);
    const firstSeparator = payload.indexOf("::");
    const secondSeparator =
      firstSeparator < 0 ? -1 : payload.indexOf("::", firstSeparator + 2);

    if (firstSeparator < 0 || secondSeparator < 0) {
      return;
    }

    const key = payload.slice(0, firstSeparator);
    const progress = payload.slice(firstSeparator + 2, secondSeparator);
    const chunk = payload.slice(secondSeparator + 2);
    const progressMatch = /^(\d+)\/(\d+)$/u.exec(progress);
    if (!progressMatch) {
      return;
    }

    const index = Number(progressMatch[1]);
    const total = Number(progressMatch[2]);
    const group = groupForKey(key);
    group.chunks.set(index, chunk);
    group.lastSeenLine = lineIndex;
    group.total = total;
    return;
  }

  const doneMarker = "BENCHMARK_REPORT_CHUNKS_DONE::benchmark/parity::";
  const doneStart = line.indexOf(doneMarker);
  if (doneStart < 0) {
    return;
  }

  const payload = line.slice(doneStart + doneMarker.length);
  const firstSeparator = payload.indexOf("::");
  if (firstSeparator < 0) {
    return;
  }

  const key = payload.slice(0, firstSeparator);
  const total = Number(payload.slice(firstSeparator + 2));
  const group = groupForKey(key);
  group.doneTotal = total;
  group.lastSeenLine = lineIndex;
});

const completeGroups = [...groups.entries()]
  .filter(([, group]) => {
    const total = group.doneTotal ?? group.total;
    return total !== null && group.chunks.size === total;
  })
  .sort(([, left], [, right]) => right.lastSeenLine - left.lastSeenLine);

if (completeGroups.length === 0) {
  throw new Error(
    `No complete Android parity report chunks found in ${logcatPath}`,
  );
}

const [reportKey, group] = completeGroups[0];
const total = group.doneTotal ?? group.total;
const reportLine = Array.from({ length: total }, (_, index) => {
  const chunk = group.chunks.get(index + 1);
  if (chunk === undefined) {
    throw new Error(
      `Missing Android parity report chunk ${index + 1}/${total} for ${reportKey}`,
    );
  }
  return chunk;
}).join("");

const prefix = "AUTOMATION_REPORT::benchmark/parity::";
if (!reportLine.startsWith(prefix)) {
  throw new Error(
    `Android parity report chunks did not reconstruct an automation report for ${reportKey}`,
  );
}

const rawJson = reportLine.slice(prefix.length);
JSON.parse(rawJson);

fs.appendFileSync(
  maestroLogPath,
  `\nI/ReactNativeJS: JsConsole: BENCHMARK_REPORT::benchmark/parity::${rawJson}\n`,
);
console.log(
  `Appended Android parity report ${reportKey} from ${total} logcat chunks to ${maestroLogPath}`,
);
