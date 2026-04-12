#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FLOW_NAME="${1:-suite}"
PLATFORM_NAME="${2:-}"

if [[ -z "$FLOW_NAME" || -z "$PLATFORM_NAME" ]]; then
  echo "usage: bash maestro/scripts/run-benchmark.sh <suite|base-text|prepared-view> <ios|android>" >&2
  exit 1
fi

case "$FLOW_NAME" in
  suite)
    FLOW_FILE="$ROOT_DIR/maestro/flows/benchmark/suite.yaml"
    FLOW_KEY="suite"
    ;;
  base-text)
    FLOW_FILE="$ROOT_DIR/maestro/flows/benchmark/base-text.yaml"
    FLOW_KEY="base-text"
    ;;
  prepared-view)
    FLOW_FILE="$ROOT_DIR/maestro/flows/benchmark/prepared-view.yaml"
    FLOW_KEY="prepared-view"
    ;;
  *)
    echo "unsupported flow: $FLOW_NAME" >&2
    exit 1
    ;;
esac

kill_ios_maestro_driver() {
  local listeners
  listeners="$(lsof -tiTCP:7001 -sTCP:LISTEN || true)"

  if [[ -z "$listeners" ]]; then
    return
  fi

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    local command
    command="$(ps -p "$pid" -o command= || true)"
    if [[ "$command" == *"maestro-driver-iosUITests-Runner"* ]]; then
      kill "$pid" || true
    fi
  done <<< "$listeners"
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
  local driver_dir="$ROOT_DIR/.maestro-artifacts/android-driver"

  mkdir -p "$debug_dir"
  extract_android_driver_apks "$driver_dir"

  if ! adb -s "$device_id" shell pm list packages | grep -q "^package:dev.mobile.maestro$"; then
    adb -s "$device_id" install -r "$driver_dir/maestro-app.apk"
    adb -s "$device_id" install -r "$driver_dir/maestro-server.apk"
  fi

  kill_ios_maestro_driver
  adb -s "$device_id" forward --remove-all >/dev/null 2>&1 || true
  adb -s "$device_id" forward tcp:7001 tcp:7001 >/dev/null
  adb -s "$device_id" shell am force-stop dev.mobile.maestro >/dev/null 2>&1 || true
  adb -s "$device_id" shell am instrument -w dev.mobile.maestro.test/androidx.test.runner.AndroidJUnitRunner >"$debug_dir/maestro-android-driver.log" 2>&1 &
  ANDROID_DRIVER_PID=$!
  sleep 2
}

print_latest_summary() {
  local debug_dir="$1"
  local latest_log

  latest_log="$(find "$debug_dir/.maestro/tests" -name "maestro.log" | sort | tail -n 1)"
  if [[ -z "$latest_log" ]]; then
    echo "No maestro.log found under $debug_dir" >&2
    return 1
  fi

  local summary_file="$debug_dir/latest-summary.txt"
  : > "$summary_file"

  rg 'BENCHMARK_REPORT::benchmark/(base-text|prepared-view|index)::|BENCHMARK_SUMMARY::' "$latest_log" | tee "$summary_file"
}

cleanup() {
  if [[ -n "${ANDROID_DRIVER_PID:-}" ]]; then
    kill "$ANDROID_DRIVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

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
    DEBUG_DIR="$ROOT_DIR/.maestro-artifacts/ios-$FLOW_KEY"
    IOS_DEVICE_ID="${MAESTRO_IOS_DEVICE_ID:-2BDA24D2-3694-46CA-9CF5-2EA46D0445DE}"
    run_ios_benchmark "$DEBUG_DIR" "$IOS_DEVICE_ID" "$FLOW_FILE"
    ;;
  android)
    DEBUG_DIR="$ROOT_DIR/.maestro-artifacts/android-$FLOW_KEY"
    ANDROID_DEVICE_ID="${MAESTRO_ANDROID_DEVICE_ID:-emulator-5554}"
    ensure_android_maestro_driver "$ANDROID_DEVICE_ID" "$DEBUG_DIR"
    JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true \
      maestro --platform android --device "$ANDROID_DEVICE_ID" test --no-reinstall-driver --debug-output "$DEBUG_DIR" "$FLOW_FILE"
    ;;
  *)
    echo "unsupported platform: $PLATFORM_NAME" >&2
    exit 1
    ;;
esac

print_latest_summary "$DEBUG_DIR"
