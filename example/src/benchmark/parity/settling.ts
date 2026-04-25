import type { ParityLineSnapshot } from "./types";

export const PARITY_REQUIRED_STABLE_FRAMES = 2;

export type ParityLayoutObservation = {
  caseId: string;
  eventVersion: number;
  lines: ParityLineSnapshot[];
  signature: string;
  stableFrames: number;
};

export function createParityLineSnapshotSignature(
  lines: ParityLineSnapshot[],
): string {
  return JSON.stringify(lines);
}

export function createParityLayoutObservation(args: {
  caseId: string;
  eventVersion: number;
  lines: ParityLineSnapshot[];
}): ParityLayoutObservation {
  return {
    caseId: args.caseId,
    eventVersion: args.eventVersion,
    lines: args.lines,
    signature: createParityLineSnapshotSignature(args.lines),
    stableFrames: 0,
  };
}

export function advanceParityLayoutObservation(
  observation: ParityLayoutObservation,
  requiredStableFrames = PARITY_REQUIRED_STABLE_FRAMES,
): {
  isStable: boolean;
  observation: ParityLayoutObservation;
} {
  const nextObservation = {
    ...observation,
    stableFrames: observation.stableFrames + 1,
  };

  return {
    isStable: nextObservation.stableFrames >= requiredStableFrames,
    observation: nextObservation,
  };
}
