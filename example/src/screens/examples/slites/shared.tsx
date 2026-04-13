import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { styles } from "../../../benchmark/constants";

export const SLITE_BODY_TEXT =
  "Prepared paragraph state turns one measured paragraph into a reusable layout input. The point is not just rendering text faster. The point is being able to know heights before mount, route the same text around geometry, and feed the same paragraph into different renderer paths without asking React Native Text to rediscover line breaks every time.";

export const DYNAMIC_LAYOUT_TEXT =
  "The editorial spread wants a live obstacle in the top-right corner. Plain Text has to stay narrow for every line or move the whole block below the obstacle. Prepared paragraph layout can narrow only the first few line bands, then return to full width once the geometry clears, so the copy fills the page instead of leaving a dead column under the artwork.";

export const BUBBLE_MESSAGES = [
  "Same line count, less wasted bubble area.",
  "폭은 줄이고 줄 수는 그대로 유지하고 싶다. 이게 pretext bubbles 데모의 핵심이다.",
  "Prepared metrics let the UI search for the tightest width that still keeps the paragraph on the same wrapped lines.",
  "Regular Text can render the paragraph, but it does not give you the answer before you render and inspect the lines.",
];

export const ACCORDION_ITEMS = [
  {
    id: "shipping",
    title: "Shipping Notes",
    text: "Mina cut the release note to three crisp lines, then realized the support caveat still needed one more sentence before it could ship without surprises.",
  },
  {
    id: "ops",
    title: "Ops Checklist",
    text: "Restart the worker, verify the queue drains, and only then mark the incident quiet. If the backlog grows again, page the same owner instead of opening a new thread.",
  },
  {
    id: "research",
    title: "Research Memo",
    text: "The bug looked like DOM churn, then like pooling, then like rendering pressure, until the repro was stripped down enough to show the real limit. That changed the fix completely: simplify the surface, keep virtualization honest, and stop hiding the worst-case path behind caches that only make the common frame look cheaper.",
  },
];

export const RICH_NOTE_BASELINE_SEGMENTS = [
  { text: "Ship ", kind: "body" },
  { text: "@maya", kind: "handle" },
  { text: "'s rich note once the review turns ", kind: "body" },
  { text: "green", kind: "accent" },
  { text: ". Keep ", kind: "body" },
  { text: "layoutNextLine()", kind: "code" },
  { text: " public and route feedback to design sync.", kind: "body" },
] as const;

export function SliteCard({
  children,
  description,
  eyebrow,
  title,
}: {
  children?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={sliteStyles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.summaryLabel}>{title}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
      {children}
    </View>
  );
}

export function KeyStatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryMetricRow}>
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={styles.summaryMetricValue}>{value}</Text>
    </View>
  );
}

export function SurfaceSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{title}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
      <View style={sliteStyles.surfaceBody}>{children}</View>
    </View>
  );
}

export function SurfaceLabel({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <View style={sliteStyles.surfaceHeader}>
      <Text style={sliteStyles.surfaceTitle}>{title}</Text>
      <Text style={sliteStyles.surfaceSubtitle}>{subtitle}</Text>
    </View>
  );
}

export const sliteStyles = StyleSheet.create({
  accordionBody: {
    overflow: "hidden",
  },
  accordionCopy: {
    color: "#22211f",
    fontSize: 15,
    lineHeight: 23,
  },
  accordionToggle: {
    gap: 4,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#efe6d7",
  },
  badgeText: {
    color: "#5b665f",
    fontSize: 12,
    fontWeight: "700",
  },
  bubbleBaseline: {
    alignSelf: "flex-start",
    backgroundColor: "#f1e7d9",
    borderRadius: 20,
    color: "#221f1c",
    fontSize: 15,
    lineHeight: 22,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubblePrepared: {
    alignSelf: "flex-start",
    backgroundColor: "#dceee6",
    borderRadius: 20,
    color: "#182523",
    fontSize: 15,
    lineHeight: 22,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleStack: {
    gap: 10,
  },
  dynamicCanvas: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e6ddcd",
    minHeight: 340,
    overflow: "hidden",
    padding: 18,
    position: "relative",
  },
  dynamicObstacle: {
    alignItems: "center",
    backgroundColor: "#d66c3d",
    borderRadius: 20,
    height: 112,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    top: 18,
    width: 112,
  },
  dynamicObstacleText: {
    color: "#fff9ef",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  eyebrow: {
    color: "#8a7d66",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  richBaselineText: {
    color: "#22211f",
    fontSize: 17,
    lineHeight: 28,
  },
  richCodeText: {
    backgroundColor: "#efe6d7",
    borderRadius: 8,
    color: "#6b4b2b",
    fontSize: 15,
    fontWeight: "700",
  },
  richHandleText: {
    color: "#0d6b71",
    fontSize: 18,
    fontWeight: "800",
  },
  richAccentText: {
    color: "#0f7c50",
    fontWeight: "800",
  },
  surfaceBody: {
    gap: 14,
  },
  surfaceHeader: {
    gap: 4,
  },
  surfaceSubtitle: {
    color: "#6e6454",
    fontSize: 13,
    lineHeight: 19,
  },
  surfaceTitle: {
    color: "#1f2725",
    fontSize: 16,
    fontWeight: "800",
  },
  twoUpStack: {
    gap: 16,
  },
});
