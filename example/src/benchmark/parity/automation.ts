import { Platform } from "react-native";

import { PARITY_GEOMETRY_TOLERANCE } from "./comparator";
import type {
  ParityAutomationReport,
  ParityAutomationStatus,
  ParityCaseResult,
  ParityMismatch,
} from "./types";

function normalizePlatform(): "android" | "ios" | "unknown" {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    return Platform.OS;
  }

  return "unknown";
}

function countMismatchesByKind(
  mismatches: ParityMismatch[],
  kind: ParityMismatch["kind"],
): number {
  return mismatches.filter((mismatch) => mismatch.kind === kind).length;
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
  const mismatches = args.results.flatMap((result) => result.mismatches);

  return {
    caseCount: args.caseCount,
    completedAt: args.completedAt,
    completedCases: args.results.length,
    failedCases: args.results.filter((result) => result.errorMessage !== null)
      .length,
    geometryTolerance: PARITY_GEOMETRY_TOLERANCE,
    lineCountMismatches: countMismatchesByKind(mismatches, "line-count"),
    lineGeometryMismatches: countMismatchesByKind(mismatches, "line-geometry"),
    lineTextMismatches: countMismatchesByKind(mismatches, "line-text"),
    mismatchCount: mismatches.length,
    mismatches,
    platform: normalizePlatform(),
    screen: "benchmark/parity",
    status: args.status,
  };
}

export function serializeParityAutomationReport(
  report: ParityAutomationReport,
): string {
  return `AUTOMATION_REPORT::benchmark/parity::${JSON.stringify(report)}`;
}
