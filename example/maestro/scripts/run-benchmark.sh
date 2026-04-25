#!/usr/bin/env bash
set -euo pipefail

APP_ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FLOW_NAME="${1:-suite}"
PLATFORM_NAME="${2:-}"
APP_ID="${MAESTRO_APP_ID:-pretext.example}"

cd "$APP_ROOT_DIR"

if [[ -z "$FLOW_NAME" || -z "$PLATFORM_NAME" ]]; then
  echo "usage: bash example/maestro/scripts/run-benchmark.sh <suite|base-text|pretext-layout|parity> <ios|android>" >&2
  exit 1
fi

case "$FLOW_NAME" in
  suite)
    FLOW_FILE="$APP_ROOT_DIR/maestro/flows/benchmark/suite.yaml"
    FLOW_KEY="suite"
    ;;
  base-text)
    FLOW_FILE="$APP_ROOT_DIR/maestro/flows/benchmark/base-text.yaml"
    FLOW_KEY="base-text"
    ;;
  pretext-layout)
    FLOW_FILE="$APP_ROOT_DIR/maestro/flows/benchmark/pretext-layout.yaml"
    FLOW_KEY="pretext-layout"
    ;;
  parity)
    FLOW_FILE="$APP_ROOT_DIR/maestro/flows/benchmark/parity.yaml"
    FLOW_KEY="parity"
    ;;
  *)
    echo "unsupported flow: $FLOW_NAME" >&2
    exit 1
    ;;
esac

log_step() {
  echo "[benchmark] $1"
}

die() {
  echo "[benchmark] $1" >&2
  exit 1
}

release_android_forward_7001() {
  if ! command -v adb >/dev/null 2>&1; then
    return
  fi

  local forward_list
  forward_list="$(adb forward --list 2>/dev/null || true)"

  if [[ -z "$forward_list" ]]; then
    return
  fi

  while IFS= read -r forward; do
    [[ -z "$forward" ]] && continue

    local serial local_spec
    serial="$(awk '{print $1}' <<< "$forward")"
    local_spec="$(awk '{print $2}' <<< "$forward")"

    if [[ "$local_spec" == "tcp:7001" ]]; then
      adb -s "$serial" forward --remove tcp:7001 >/dev/null 2>&1 || true
    fi
  done <<< "$forward_list"
}

release_local_port_7001() {
  local listeners
  listeners="$(lsof -tiTCP:7001 -sTCP:LISTEN || true)"

  if [[ -z "$listeners" ]]; then
    return
  fi

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    local command
    command="$(ps -p "$pid" -o command= || true)"

    case "$command" in
      *"maestro-driver-iosUITests-Runner"*|*"xcodebuild"*maestro-driver-ios*|*"xctest"*maestro-driver-ios*)
        kill "$pid" >/dev/null 2>&1 || true
        ;;
      *"adb"*)
        release_android_forward_7001
        ;;
      *)
        die "Port 7001 is already in use by '$command'. Free that port and rerun the benchmark."
        ;;
    esac
  done <<< "$listeners"

  sleep 1

  if lsof -tiTCP:7001 -sTCP:LISTEN >/dev/null 2>&1; then
    local blocking_pid blocking_command
    blocking_pid="$(lsof -tiTCP:7001 -sTCP:LISTEN | head -n 1)"
    blocking_command="$(ps -p "$blocking_pid" -o command= || true)"
    die "Port 7001 is still busy after cleanup by '$blocking_command'. Free that port and rerun the benchmark."
  fi
}

extract_android_driver_apks() {
  local target_dir="$1"
  mkdir -p "$target_dir"

  if [[ ! -f "$target_dir/maestro-app.apk" || ! -f "$target_dir/maestro-server.apk" ]]; then
    (
      cd "$target_dir"
      jar xf "$HOME/.maestro/lib/maestro-client.jar" maestro-app.apk maestro-server.apk
    )
  fi
}

ensure_android_maestro_driver() {
  local device_id="$1"
  local debug_dir="$2"
  local driver_dir="$APP_ROOT_DIR/.maestro-artifacts/android-driver"

  mkdir -p "$debug_dir"
  extract_android_driver_apks "$driver_dir"

  if ! adb -s "$device_id" shell pm list packages | grep -q "^package:dev.mobile.maestro$"; then
    adb -s "$device_id" install -r "$driver_dir/maestro-app.apk"
    adb -s "$device_id" install -r "$driver_dir/maestro-server.apk"
  fi

  release_local_port_7001
  adb -s "$device_id" forward --remove-all >/dev/null 2>&1 || true
  adb -s "$device_id" forward tcp:7001 tcp:7001 >/dev/null
  adb -s "$device_id" shell am force-stop dev.mobile.maestro >/dev/null 2>&1 || true
  adb -s "$device_id" shell am instrument -w dev.mobile.maestro.test/androidx.test.runner.AndroidJUnitRunner >"$debug_dir/maestro-android-driver.log" 2>&1 &
  ANDROID_DRIVER_PID=$!
  ANDROID_DEVICE_ID_FOR_CLEANUP="$device_id"
  sleep 2
}

print_latest_summary() {
  local debug_dir="$1"
  local platform_name="$2"
  local flow_key="$3"
  local latest_log

  latest_log="$(find_latest_log "$debug_dir")"

  local summary_file="$debug_dir/latest-summary.txt"
  node "$APP_ROOT_DIR/maestro/scripts/format-benchmark-summary.js" \
    "$latest_log" \
    "$summary_file" \
    "$platform_name" \
    "$flow_key"
}

write_parity_artifacts() {
  local debug_dir="$1"
  local platform_name="$2"
  local latest_log

  latest_log="$(find_latest_log "$debug_dir")"

  node "$APP_ROOT_DIR/maestro/scripts/format-parity-artifacts.js" \
    "$latest_log" \
    "$debug_dir" \
    "$platform_name"
}

find_latest_log() {
  local debug_dir="$1"
  local latest_log

  latest_log="$(find "$debug_dir/.maestro/tests" -name "maestro.log" | sort | tail -n 1)"
  if [[ -z "$latest_log" ]]; then
    echo "No maestro.log found under $debug_dir" >&2
    return 1
  fi

  echo "$latest_log"
}

run_quality_gate() {
  local debug_dir="$1"
  local platform_name="$2"
  local flow_key="$3"
  local latest_log

  latest_log="$(find_latest_log "$debug_dir")"

  local gate_file="$debug_dir/latest-gate.txt"
  node "$APP_ROOT_DIR/maestro/scripts/assert-benchmark-gates.js" \
    "$latest_log" \
    "$gate_file" \
    "$platform_name" \
    "$flow_key"
}

cleanup() {
  if [[ -n "${ANDROID_DRIVER_PID:-}" ]]; then
    kill "$ANDROID_DRIVER_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "${ANDROID_DEVICE_ID_FOR_CLEANUP:-}" ]]; then
    adb -s "$ANDROID_DEVICE_ID_FOR_CLEANUP" forward --remove tcp:7001 >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

ensure_ios_app_ready() {
  local device_id="$1"

  log_step "Using iOS simulator $device_id"
  log_step "Benchmark scripts do not build or install the app."
  log_step "Ensuring Maestro XCTest port 7001 is available"
  release_local_port_7001

  if ! xcrun simctl list devices | grep -F "$device_id" >/dev/null; then
    die "Simulator $device_id was not found."
  fi

  if ! xcrun simctl list devices | grep -F "$device_id" | grep -F "(Booted)" >/dev/null; then
    log_step "Booting simulator $device_id"
    xcrun simctl boot "$device_id" >/dev/null 2>&1 || true
    xcrun simctl bootstatus "$device_id" -b
  fi

  if ! xcrun simctl get_app_container "$device_id" "$APP_ID" app >/dev/null 2>&1; then
    die "App $APP_ID is not installed on simulator $device_id. Build and install it first, then rerun yarn benchmark:ios."
  fi

  log_step "Launching $APP_ID"
  xcrun simctl terminate "$device_id" "$APP_ID" >/dev/null 2>&1 || true
  xcrun simctl launch "$device_id" "$APP_ID" >/dev/null
}

resolve_ios_device_id() {
  if [[ -n "${MAESTRO_IOS_DEVICE_ID:-}" ]]; then
    echo "$MAESTRO_IOS_DEVICE_ID"
    return
  fi

  local simulator_name="${IOS_SIMULATOR:-iPhone 16}"
  local device_id
  device_id="$(
    IOS_SIMULATOR_NAME="$simulator_name" xcrun simctl list -j devices available | node -e '
const fs = require("node:fs");
const requestedName = process.env.IOS_SIMULATOR_NAME;
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
const devices = Object.values(payload.devices ?? {}).flat();
const bootedByName = devices.find((device) => device.name === requestedName && device.state === "Booted");
const booted = devices.find((device) => device.state === "Booted");
const named = devices.find((device) => device.name === requestedName);
const selected = bootedByName ?? booted ?? named;
if (selected?.udid) {
  process.stdout.write(selected.udid);
}
'
  )"

  if [[ -z "$device_id" ]]; then
    die "No available iOS simulator found. Set MAESTRO_IOS_DEVICE_ID or IOS_SIMULATOR."
  fi

  echo "$device_id"
}

ensure_android_app_ready() {
  local device_id="$1"

  log_step "Using Android device $device_id"
  log_step "Benchmark scripts do not build or install the app."

  if ! adb -s "$device_id" get-state >/dev/null 2>&1; then
    die "Android device $device_id is not connected. Start the emulator or connect the device first."
  fi

  if ! adb -s "$device_id" shell pm path "$APP_ID" 2>/dev/null | grep -q '^package:'; then
    die "App $APP_ID is not installed on Android device $device_id. Build and install it first, then rerun yarn benchmark:android."
  fi

  log_step "Waking device and launching $APP_ID"
  adb -s "$device_id" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
  adb -s "$device_id" shell wm dismiss-keyguard >/dev/null 2>&1 || true
  adb -s "$device_id" shell am force-stop "$APP_ID" >/dev/null 2>&1 || true
  adb -s "$device_id" shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null
}

run_ios_benchmark() {
  local debug_dir="$1"
  local device_id="$2"
  local flow_file="$3"
  local attempt=1
  local max_attempts=2

  mkdir -p "$debug_dir"

  while true; do
    local attempt_log="$debug_dir/ios-attempt-${attempt}.log"
    if MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}" \
      maestro --platform ios --device "$device_id" test --debug-output "$debug_dir" "$flow_file" 2>&1 | tee "$attempt_log"; then
      return 0
    fi

    if ! rg -q 'iOS driver not ready in time' "$attempt_log" || [[ "$attempt" -ge "$max_attempts" ]]; then
      return 1
    fi

    echo "Retrying iOS benchmark after driver startup timeout..." >&2
    attempt=$((attempt + 1))
    sleep 5
  done
}

case "$PLATFORM_NAME" in
  ios)
    DEBUG_DIR="$APP_ROOT_DIR/.maestro-artifacts/ios-$FLOW_KEY"
    IOS_DEVICE_ID="$(resolve_ios_device_id)"
    ensure_ios_app_ready "$IOS_DEVICE_ID"
    log_step "Running Maestro flow $FLOW_NAME on iOS"
    log_step "Waiting for the XCTest driver can take a while even when the app is already installed."
    run_ios_benchmark "$DEBUG_DIR" "$IOS_DEVICE_ID" "$FLOW_FILE"
    ;;
  android)
    DEBUG_DIR="$APP_ROOT_DIR/.maestro-artifacts/android-$FLOW_KEY"
    ANDROID_DEVICE_ID="${MAESTRO_ANDROID_DEVICE_ID:-emulator-5554}"
    ensure_android_app_ready "$ANDROID_DEVICE_ID"
    log_step "Running Maestro flow $FLOW_NAME on Android"
    ensure_android_maestro_driver "$ANDROID_DEVICE_ID" "$DEBUG_DIR"
    JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true \
      maestro --platform android --device "$ANDROID_DEVICE_ID" test --no-reinstall-driver --debug-output "$DEBUG_DIR" "$FLOW_FILE"
    ;;
  *)
    echo "unsupported platform: $PLATFORM_NAME" >&2
    exit 1
    ;;
esac

print_latest_summary "$DEBUG_DIR" "$PLATFORM_NAME" "$FLOW_KEY"

if [[ "$FLOW_KEY" == "parity" ]]; then
  write_parity_artifacts "$DEBUG_DIR" "$PLATFORM_NAME"
fi

if [[ "${BENCHMARK_SKIP_GATE:-0}" != "1" ]]; then
  run_quality_gate "$DEBUG_DIR" "$PLATFORM_NAME" "$FLOW_KEY"
fi
