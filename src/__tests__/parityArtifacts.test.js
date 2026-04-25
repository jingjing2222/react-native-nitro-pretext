const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");
const artifactScript = path.join(
  rootDir,
  "example/maestro/scripts/format-parity-artifacts.js",
);

function createParityReport() {
  return {
    caseCount: 240,
    completedAt: "10:00:02",
    completedCases: 240,
    failedCases: 0,
    geometryTolerance: 0.5,
    lineCountMismatches: 0,
    lineGeometryMismatches: 0,
    lineTextMismatches: 1,
    mismatchCount: 1,
    mismatches: [
      {
        caseId: "parity-latin-001",
        category: "latin",
        firstDiff: {
          field: "text",
          lineIndex: 0,
          pretextValue: "expected",
          rnValue: "actual",
        },
        kind: "line-text",
        platform: "ios",
        pretextLines: [
          {
            geometry: { height: 28, left: 0, top: 0, width: 80 },
            text: "expected",
          },
        ],
        rnLines: [
          {
            geometry: { height: 28, left: 0, top: 0, width: 80 },
            text: "actual",
          },
        ],
        style: { fontFamily: "System", fontSize: 18, lineHeight: 28 },
        width: 220,
      },
    ],
    platform: "ios",
    screen: "benchmark/parity",
    status: "completed",
  };
}

function createGroupedParityReport() {
  const report = createParityReport();
  const mismatch = report.mismatches[0];
  const summary = { ...report };
  delete summary.mismatches;

  return {
    ...summary,
    mismatchGroups: [
      {
        caseId: mismatch.caseId,
        category: mismatch.category,
        platform: mismatch.platform,
        pretextLines: mismatch.pretextLines,
        rnLines: mismatch.rnLines,
        style: mismatch.style,
        width: mismatch.width,
        mismatches: [
          {
            firstDiff: mismatch.firstDiff,
            kind: mismatch.kind,
          },
        ],
      },
    ],
    transportVersion: "parity-grouped-v1",
  };
}

describe("parity Maestro artifacts", () => {
  it("writes summary, mismatch, and contract artifacts", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pretext-parity-"));
    const logPath = path.join(tempDir, "maestro.log");
    const parity = createParityReport();

    fs.writeFileSync(
      logPath,
      `I/ReactNativeJS: JsConsole: BENCHMARK_REPORT::benchmark/parity::${JSON.stringify(parity)}\n`,
    );

    execFileSync(process.execPath, [artifactScript, logPath, tempDir, "ios"]);

    const summary = fs.readFileSync(
      path.join(tempDir, "latest-parity-summary.txt"),
      "utf8",
    );
    const mismatches = JSON.parse(
      fs.readFileSync(
        path.join(tempDir, "latest-parity-mismatches.json"),
        "utf8",
      ),
    );
    const contracts = JSON.parse(
      fs.readFileSync(
        path.join(tempDir, "latest-parity-contracts.json"),
        "utf8",
      ),
    );

    expect(summary).toContain("RN Text Parity Report");
    expect(summary).toContain("parity-latin-001 [latin] line-text");
    expect(mismatches).toHaveLength(1);
    expect(contracts).toEqual([
      expect.objectContaining({
        caseId: "parity-latin-001",
        category: "latin",
        kind: "line-text",
        width: 220,
      }),
    ]);
  });

  it("expands grouped parity transport artifacts", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pretext-parity-"));
    const logPath = path.join(tempDir, "maestro.log");
    const parity = createGroupedParityReport();

    fs.writeFileSync(
      logPath,
      `I/ReactNativeJS: JsConsole: BENCHMARK_REPORT::benchmark/parity::${JSON.stringify(parity)}\n`,
    );

    execFileSync(process.execPath, [artifactScript, logPath, tempDir, "ios"]);

    const mismatches = JSON.parse(
      fs.readFileSync(
        path.join(tempDir, "latest-parity-mismatches.json"),
        "utf8",
      ),
    );

    expect(mismatches).toEqual([
      expect.objectContaining({
        caseId: "parity-latin-001",
        kind: "line-text",
        pretextLines: parity.mismatchGroups[0].pretextLines,
        rnLines: parity.mismatchGroups[0].rnLines,
      }),
    ]);
  });
});
