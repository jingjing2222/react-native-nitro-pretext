---
"react-native-nitro-pretext": minor
---

Add platform-native RN Text parity support across iOS and Android.

This release aligns normal-wrap layout with TextKit on iOS and RN-compatible
StaticLayout on Android, adds the strict 260-case RN Text parity harness, and
introduces deterministic Maestro parity gates. It also expands `shapeSlices`
from a single constrained segment per row to multi-slot obstacle-aware line
placement, including blocked-row and narrow-slot handling.

The example app now includes the draggable Pretext React Native shape reflow
demo, benchmark/parity screens, release-run documentation, and Maestro coverage
that verifies 20 circle moves across a 3x3 grid without text intruding into the
shape obstacle.
