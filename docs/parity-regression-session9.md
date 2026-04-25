# Session 9 Cross-Platform RN Text Parity Closure

Date: 2026-04-25

## Scope

Session 9 reruns the same 240 unique RN Text parity cases on iOS and Android
after the platform-specific TextKit and StaticLayout work. The goal is to
confirm that shared TypeScript comparator/report code and platform fixes still
agree on the common Maestro parity contract.

## Commands

```sh
MAESTRO_IOS_DEVICE_ID=2BDA24D2-3694-46CA-9CF5-2EA46D0445DE yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=emulator-5554 yarn benchmark:parity:android
```

## Results

| Platform | Completed | Cases | Mismatches | Line count | Line text | Geometry | Contract candidates |
| -------- | --------- | ----: | ---------: | ---------: | --------: | -------: | ------------------: |
| iOS      | 11:49:56  |   240 |          0 |      0/240 |     0/240 |    0/240 |                   0 |
| Android  | 11:50:45  |   240 |          0 |      0/240 |     0/240 |    0/240 |                   0 |

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

## Closure

No new cross-platform mismatch was found. There is no Session 6.x or Session
8.x follow-up bucket to reopen from this pass.
