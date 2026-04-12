import type { InlineSegment } from "./Pretext.nitro";

export function serializeInlineParagraphs(
  paragraphs: InlineSegment[][],
): string {
  return JSON.stringify(paragraphs);
}
