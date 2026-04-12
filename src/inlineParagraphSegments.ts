import type { InlineParagraphSegments, InlineSegment } from "./Pretext.nitro";

export function flattenInlineParagraphs(
  paragraphs: InlineSegment[][],
): InlineParagraphSegments {
  const segments: InlineSegment[] = [];
  const paragraphSegmentOffsets: number[] = [0];

  for (const paragraph of paragraphs) {
    segments.push(...paragraph);
    paragraphSegmentOffsets.push(segments.length);
  }

  return {
    segments,
    paragraphSegmentOffsets,
  };
}
