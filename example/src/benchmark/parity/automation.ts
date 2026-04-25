import { PARITY_GEOMETRY_TOLERANCE } from "./comparator";
import { normalizeParityPlatform } from "./platform";
import type {
  ParityAutomationReport,
  ParityAutomationStatus,
  ParityCaseResult,
  ParityMismatch,
} from "./types";

type ParityMismatchTransportGroup = Pick<
  ParityMismatch,
  | "caseId"
  | "category"
  | "platform"
  | "pretextLines"
  | "rnLines"
  | "style"
  | "width"
> & {
  mismatches: Array<Pick<ParityMismatch, "firstDiff" | "kind">>;
};

function countMismatchesByKind(
  mismatches: ParityMismatch[],
  kind: ParityMismatch["kind"],
): number {
  return mismatches.filter((mismatch) => mismatch.kind === kind).length;
}

function uniqueMismatchesByCaseKind(
  mismatches: ParityMismatch[],
): ParityMismatch[] {
  const seen = new Set<string>();
  const uniqueMismatches: ParityMismatch[] = [];

  for (const mismatch of mismatches) {
    const key = `${mismatch.caseId}::${mismatch.kind}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueMismatches.push(mismatch);
  }

  return uniqueMismatches;
}

function countUniqueCaseIds(results: ParityCaseResult[]): number {
  return new Set(results.map((result) => result.caseId)).size;
}

function countFailedCaseIds(results: ParityCaseResult[]): number {
  return new Set(
    results
      .filter((result) => result.errorMessage !== null)
      .map((result) => result.caseId),
  ).size;
}

function groupMismatchesForTransport(
  mismatches: ParityMismatch[],
): ParityMismatchTransportGroup[] {
  const groups = new Map<string, ParityMismatchTransportGroup>();

  for (const mismatch of mismatches) {
    const existing = groups.get(mismatch.caseId);
    if (existing) {
      existing.mismatches.push({
        firstDiff: mismatch.firstDiff,
        kind: mismatch.kind,
      });
      continue;
    }

    groups.set(mismatch.caseId, {
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
    });
  }

  return [...groups.values()];
}

export function createParityAutomationStatusLine(args: {
  activeCaseId: string | null;
  caseCount: number;
  completedCases: number;
  status: ParityAutomationStatus;
}): string {
  return [
    "AUTOMATION_STATUS::benchmark/parity",
    args.status,
    `${args.completedCases}/${args.caseCount}`,
    args.activeCaseId ?? "none",
  ].join("::");
}

export function createParityAutomationReport(args: {
  caseCount: number;
  completedAt: string | null;
  results: ParityCaseResult[];
  status: ParityAutomationStatus;
}): ParityAutomationReport {
  const mismatches = uniqueMismatchesByCaseKind(
    args.results.flatMap((result) => result.mismatches),
  );

  return {
    caseCount: args.caseCount,
    completedAt: args.completedAt,
    completedCases: countUniqueCaseIds(args.results),
    failedCases: countFailedCaseIds(args.results),
    geometryTolerance: PARITY_GEOMETRY_TOLERANCE,
    lineCountMismatches: countMismatchesByKind(mismatches, "line-count"),
    lineGeometryMismatches: countMismatchesByKind(mismatches, "line-geometry"),
    lineTextMismatches: countMismatchesByKind(mismatches, "line-text"),
    mismatchCount: mismatches.length,
    mismatches,
    platform: normalizeParityPlatform(),
    screen: "benchmark/parity",
    status: args.status,
  };
}

export function serializeParityAutomationReport(
  report: ParityAutomationReport,
): string {
  const { mismatches, ...reportSummary } = report;
  const transportReport = {
    ...reportSummary,
    mismatchGroups: groupMismatchesForTransport(mismatches),
    transportVersion: "parity-grouped-v1",
  };

  return `AUTOMATION_REPORT::benchmark/parity::${JSON.stringify(transportReport)}`;
}
