const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");
const appendScript = path.join(
  rootDir,
  "example/maestro/scripts/append-parity-logcat-report.js",
);

describe("Android parity logcat report transport", () => {
  it("reconstructs URI-encoded chunks without corrupting emoji payloads", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pretext-logcat-"));
    const logcatPath = path.join(tempDir, "logcat.txt");
    const maestroLogPath = path.join(tempDir, "maestro.log");
    const report = {
      caseCount: 259,
      completedAt: "10:00:02",
      completedCases: 259,
      failedCaseResults: [],
      failedCases: 0,
      geometryTolerance: 0.5,
      lineCountMismatches: 0,
      lineGeometryMismatches: 0,
      lineTextMismatches: 1,
      mismatchCount: 1,
      mismatches: [
        {
          caseId: "parity-emoji-001",
          category: "emoji",
          firstDiff: {
            field: "text",
            lineIndex: 0,
            pretextValue: "expected 🧑‍🚀",
            rnValue: "actual 🧑‍🚀",
          },
          kind: "line-text",
          platform: "android",
          pretextLines: [],
          rnLines: [],
          style: {},
          width: 244,
        },
      ],
      platform: "android",
      screen: "benchmark/parity",
      status: "completed",
    };
    const reportLine = `AUTOMATION_REPORT::benchmark/parity::${JSON.stringify(report)}`;
    const encoded = encodeURIComponent(reportLine);
    const splitAt = Math.floor(encoded.length / 2);

    fs.writeFileSync(
      logcatPath,
      [
        `I/ReactNativeJS: BENCHMARK_REPORT_CHUNK_URI::benchmark/parity::run-1::1/2::${encoded.slice(0, splitAt)}`,
        `I/ReactNativeJS: BENCHMARK_REPORT_CHUNK_URI::benchmark/parity::run-1::2/2::${encoded.slice(splitAt)}`,
        "I/ReactNativeJS: BENCHMARK_REPORT_CHUNKS_DONE_URI::benchmark/parity::run-1::2",
      ].join("\n"),
    );
    fs.writeFileSync(maestroLogPath, "");

    execFileSync(process.execPath, [appendScript, logcatPath, maestroLogPath]);

    const maestroLog = fs.readFileSync(maestroLogPath, "utf8");
    const rawJson = maestroLog.slice(
      maestroLog.indexOf("BENCHMARK_REPORT::benchmark/parity::") +
        "BENCHMARK_REPORT::benchmark/parity::".length,
    );
    const appendedReport = JSON.parse(rawJson);

    expect(appendedReport.mismatches[0].firstDiff.rnValue).toBe("actual 🧑‍🚀");
  });
});
