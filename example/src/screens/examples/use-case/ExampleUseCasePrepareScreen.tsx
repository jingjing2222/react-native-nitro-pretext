import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  layout,
  prepare,
  type PretextPrepared,
  type PretextStyle,
} from "react-native-nitro-pretext";

const PREPARE_TEXT = [
  "Pretext prepares native paragraph state before visible text renders.",
  "The returned object exposes paragraphCount, stats, and release().",
  "The native id stays hidden so callers cannot retain stale native state.",
] as const;

const PREPARE_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
  locale: "en-US",
  textDirection: "auto",
};

const PREPARE_WIDTH = 300;

type PreparedState = {
  error: string | null;
  prepared: PretextPrepared | null;
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatMs(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(2)} ms`;
}

export function ExampleUseCasePrepareScreen() {
  const insets = useSafeAreaInsets();
  const preparedRef = useRef<PretextPrepared | null>(null);
  const [cycle, setCycle] = useState(0);
  const [released, setReleased] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [preparedState, setPreparedState] = useState<PreparedState>({
    error: null,
    prepared: null,
  });

  useEffect(() => {
    let prepared: PretextPrepared | null = null;

    try {
      prepared = prepare(PREPARE_TEXT, PREPARE_STYLE);
      preparedRef.current = prepared;
      setPreparedState({ error: null, prepared });
      setReleased(false);
      setReleaseError(null);
    } catch (error) {
      setPreparedState({ error: describeError(error), prepared: null });
      setReleased(false);
      setReleaseError(null);
    }

    return () => {
      prepared?.release();
      if (preparedRef.current === prepared) {
        preparedRef.current = null;
      }
    };
  }, [cycle]);

  const metrics = useMemo(() => {
    if (preparedState.prepared === null || released) {
      return null;
    }

    try {
      return layout(preparedState.prepared, PREPARE_WIDTH);
    } catch {
      return null;
    }
  }, [preparedState.prepared, released]);

  const releasePrepared = useCallback(() => {
    const prepared = preparedRef.current;

    if (prepared === null) {
      return;
    }

    prepared.release();
    setReleased(true);

    try {
      layout(prepared, PREPARE_WIDTH);
      setReleaseError("layout() unexpectedly succeeded after release().");
    } catch (error) {
      setReleaseError(describeError(error));
    }
  }, []);

  const prepareAgain = useCallback(() => {
    preparedRef.current?.release();
    preparedRef.current = null;
    setCycle((value) => value + 1);
  }, []);

  const publicFields = preparedState.prepared
    ? Object.keys(preparedState.prepared)
    : [];
  const rawNativeIdExposed = preparedState.prepared
    ? Object.prototype.hasOwnProperty.call(preparedState.prepared, "id")
    : false;
  const report = `API_EXAMPLE_REPORT::examples/use-case/prepare::${JSON.stringify(
    {
      hasPrepared: preparedState.prepared !== null,
      paragraphCount: preparedState.prepared?.paragraphCount ?? 0,
      publicFields,
      rawNativeIdExposed,
      released,
      releaseError,
      statsTotalMs: preparedState.prepared?.stats.totalMs ?? null,
    },
  )}`;

  return (
    <View style={localStyles.screen}>
      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          { paddingBottom: 56 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.header}>
          <Text style={localStyles.route}>examples/use-case/prepare</Text>
          <Text style={localStyles.title}>prepare() lifecycle</Text>
          <Text style={localStyles.description}>
            Prepare native paragraph state once, layout it by width, and release
            it when the owner is done.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const prepared = prepare(text, style);
const metrics = layout(prepared, { width: 300 });
prepared.release();`}
          </Text>
        </View>

        {preparedState.error ? (
          <View style={localStyles.panel}>
            <Text style={localStyles.panelTitle}>Prepare error</Text>
            <Text style={localStyles.body}>{preparedState.error}</Text>
          </View>
        ) : null}

        <View style={localStyles.grid}>
          <Stat
            label="paragraphCount"
            value={preparedState.prepared?.paragraphCount ?? "-"}
          />
          <Stat
            label="stats.totalMs"
            value={formatMs(preparedState.prepared?.stats.totalMs)}
          />
          <Stat
            label="layout height"
            value={metrics ? `${Math.round(metrics.height)} px` : "-"}
          />
          <Stat label="lineCount" value={metrics?.lineCount ?? "-"} />
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Public object</Text>
          <Text style={localStyles.body}>
            Fields: {publicFields.length > 0 ? publicFields.join(", ") : "-"}
          </Text>
          <Text style={localStyles.body}>
            Native id exposed: {rawNativeIdExposed ? "yes" : "no"}
          </Text>
        </View>

        <View style={localStyles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={released || preparedState.prepared === null}
            onPress={releasePrepared}
            style={({ pressed }) => [
              localStyles.button,
              (pressed || released || preparedState.prepared === null) &&
                localStyles.buttonDimmed,
            ]}
            testID="examples.use-case.prepare.release"
          >
            <Text style={localStyles.buttonText}>Release prepared</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={prepareAgain}
            style={({ pressed }) => [
              localStyles.secondaryButton,
              pressed && localStyles.buttonDimmed,
            ]}
            testID="examples.use-case.prepare.again"
          >
            <Text style={localStyles.secondaryButtonText}>Prepare again</Text>
          </Pressable>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>After release</Text>
          <Text style={localStyles.body}>
            {releaseError ??
              "Tap release to confirm layout() refuses released native state."}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Automation report</Text>
          <Text selectable style={localStyles.code}>
            {report}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={localStyles.stat}>
      <Text style={localStyles.statLabel}>{label}</Text>
      <Text style={localStyles.statValue}>{value}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  body: {
    color: "#4f5b57",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#1f2725",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  buttonDimmed: {
    opacity: 0.56,
  },
  buttonText: {
    color: "#fffaf0",
    fontSize: 14,
    fontWeight: "800",
  },
  code: {
    backgroundColor: "#1f2725",
    borderRadius: 6,
    color: "#f5efe4",
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 16,
    padding: 12,
  },
  content: {
    gap: 12,
    padding: 20,
  },
  description: {
    color: "#4f5b57",
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  panel: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: {
    color: "#1f2725",
    fontSize: 15,
    fontWeight: "800",
  },
  route: {
    color: "#63706b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  screen: {
    backgroundColor: "#f3eee5",
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#1f2725",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#1f2725",
    fontSize: 14,
    fontWeight: "800",
  },
  stat: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    padding: 12,
  },
  statLabel: {
    color: "#63706b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#1f2725",
    fontSize: 18,
    fontWeight: "900",
  },
  title: {
    color: "#1f2725",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
  },
});
