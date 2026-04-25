# Session 4 RN Text Parity Inventory

Date: 2026-04-25

This is a historical inventory from the earlier 240-case contract. The current
public parity contract is the 259 unique-case strict raw Maestro suite recorded
in `docs/benchmark-improvement-report.md` and `docs/parity-regression-session9.md`.

## Scope

Session 4 was an inventory pass, not a parity engine fix pass. The goal was to
run the then-current 240 unique-case Maestro parity suite on both platforms,
produce the artifact files, and classify the first mismatch map that would drive
Sessions 5 through 8. The strict raw RN `onTextLayout` rule already applied:
text comparison must not trim or normalize whitespace/newline/NBSP drift.

## Harness Notes

The first iOS run completed all 240 cases but failed before artifact generation
because the full report text was below the visible accessibility hierarchy.
The report transport was adjusted during this session so the Maestro contract
can reliably collect full mismatch details:

- iOS copies a compact grouped report through the parity report accessibility
  label.
- Android skips UI report copying and appends grouped report chunks from
  `ReactNativeJS` logcat output into the Maestro log before artifact formatting.
- The artifact formatter expands grouped transport back into the existing
  mismatch schema: `caseId`, `platform`, `category`, `width`, `style`, `kind`,
  `rnLines`, `pretextLines`, `firstDiff`.

## Commands

```sh
MAESTRO_IOS_DEVICE_ID=2BDA24D2-3694-46CA-9CF5-2EA46D0445DE yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=emulator-5554 yarn benchmark:parity:android
```

At this point in the project history, both commands were expected to exit
non-zero until the parity gate reached `0/240`, because Session 3 made mismatch
count, line count, line text, and line geometry thresholds strict.

## Artifact Locations

- iOS summary:
  `example/.maestro-artifacts/ios-parity/latest-parity-summary.txt`
- iOS mismatches:
  `example/.maestro-artifacts/ios-parity/latest-parity-mismatches.json`
- iOS contract candidates:
  `example/.maestro-artifacts/ios-parity/latest-parity-contracts.json`
- Android summary:
  `example/.maestro-artifacts/android-parity/latest-parity-summary.txt`
- Android mismatches:
  `example/.maestro-artifacts/android-parity/latest-parity-mismatches.json`
- Android contract candidates:
  `example/.maestro-artifacts/android-parity/latest-parity-contracts.json`

## Session 4 Counts

| Platform | Cases | Cases with mismatch | Total mismatches | Line count | Line text | Geometry |
| -------- | ----: | ------------------: | ---------------: | ---------: | --------: | -------: |
| iOS      |   240 |                 237 |              572 |        117 |       218 |      237 |
| Android  |   240 |                 240 |              586 |        127 |       219 |      240 |

## Category Inventory

| Category   | iOS mismatches | iOS cases | Android mismatches | Android cases |
| ---------- | -------------: | --------: | -----------------: | ------------: |
| korean-cjk |             87 |        35 |                 87 |            35 |
| emoji      |             82 |        35 |                 84 |            35 |
| latin      |             74 |        30 |                 76 |            30 |
| indic      |             68 |        28 |                 74 |            30 |
| thai       |             62 |        25 |                 64 |            25 |
| japanese   |             60 |        25 |                 66 |            25 |
| rtl        |             55 |        25 |                 58 |            25 |
| whitespace |             51 |        20 |                 46 |            20 |
| style      |             33 |        14 |                 31 |            15 |

## First-Diff Inventory

| First diff | iOS | Android |
| ---------- | --: | ------: |
| `text`     | 218 |     219 |
| `width`    | 229 |     213 |
| `count`    | 117 |     127 |
| `height`   |   8 |       6 |
| `left`     |   0 |      21 |

## Fix Order

1. Shared harness width/padding alignment.
   The active RN `<Text>` inherits paragraph padding while Pretext receives the
   full `case.width`. The dominant width and text split failures across every
   category strongly suggest this shared setup must be normalized before
   platform-specific TextKit or StaticLayout work.
2. iOS normal-wrap baseline.
   After the shared width setup is corrected, rerun iOS and then align TextKit
   line fragment padding, `usesFontLeading`, and line-break policy against RN
   `onTextLayout`.
3. iOS complex buckets.
   Promote remaining deterministic emoji, fallback, CJK, RTL, and complex
   cluster mismatches into native fixtures while fixing each bucket.
4. Android normal-wrap baseline.
   After the shared width setup is corrected, rerun Android and align
   `StaticLayout` width rounding, `includeFontPadding`, break strategy,
   hyphenation, and line-end extraction.
5. Android complex buckets.
   Promote remaining includeFontPadding, lineHeight, fallback font, emoji, CJK,
   RTL, and Indic mismatches into native or instrumented fixtures while fixing
   each bucket.

The first follow-up run should happen immediately after the shared width/padding
normalization because it is likely to collapse a large fraction of all line
count and line text mismatches on both platforms.
