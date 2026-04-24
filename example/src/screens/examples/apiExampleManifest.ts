import type { AppStackParamList } from "../../navigation/types";

type RouteName = keyof AppStackParamList;

export type ApiExampleManifestEntry = {
  apiSymbol: string;
  coveredDocSections: string[];
  docAnchor: string;
  kind: "use-case" | "none-use-case";
  pairId: string;
  path: string;
  reportPrefix: "API_EXAMPLE_REPORT" | "NONE_USE_CASE_REPORT";
  routeName: RouteName;
  shortDescription: string;
  title: string;
};

const apiUseCaseEntries = [
  {
    apiSymbol: "prepare",
    coveredDocSections: ["prepare(text, style)", "PretextPrepared"],
    docAnchor: "preparetext-style",
    pairId: "prepare",
    path: "examples/use-case/prepare",
    routeName: "ExampleUseCasePrepare",
    shortDescription:
      "Prepare native paragraph state, inspect stats, release it safely.",
    title: "prepare() lifecycle",
  },
  {
    apiSymbol: "layout:metrics",
    coveredDocSections: [
      "layout(prepared, widthOrOptions)",
      'output: "metrics"',
    ],
    docAnchor: "output-metrics",
    pairId: "layout-metrics",
    path: "examples/use-case/layout-metrics",
    routeName: "ExampleUseCaseLayoutMetrics",
    shortDescription:
      "Calculate height, line count, and max line width before visible render.",
    title: "layout() metrics",
  },
  {
    apiSymbol: "layout:options",
    coveredDocSections: [
      "PretextLayoutOptions",
      "shapeSlices",
      "whiteSpace",
      "wordBreak",
    ],
    docAnchor: "layoutprepared-widthoroptions",
    pairId: "layout-options",
    path: "examples/use-case/layout-options",
    routeName: "ExampleUseCaseLayoutOptions",
    shortDescription:
      "Compare width shorthand with object requests and layout rule controls.",
    title: "layout() options",
  },
  {
    apiSymbol: "layout:lines",
    coveredDocSections: ['output: "lines"', "ParagraphLineRange"],
    docAnchor: "output-lines",
    pairId: "layout-lines",
    path: "examples/use-case/layout-lines",
    routeName: "ExampleUseCaseLayoutLines",
    shortDescription: "Inspect UTF-16 line ranges and native line geometry.",
    title: "layout() lines",
  },
  {
    apiSymbol: "layout:diagnostics",
    coveredDocSections: ['output: "diagnostics"', "ParagraphLayoutDiagnostics"],
    docAnchor: "output-diagnostics",
    pairId: "layout-diagnostics",
    path: "examples/use-case/layout-diagnostics",
    routeName: "ExampleUseCaseDiagnostics",
    shortDescription:
      "Read engine, request, drift, boundary, and line diagnostics.",
    title: "layout() diagnostics",
  },
  {
    apiSymbol: "layout:rich",
    coveredDocSections: ['output: "rich"', "InlineSegment", "InlineBoxFrame"],
    docAnchor: "output-rich",
    pairId: "layout-rich",
    path: "examples/use-case/layout-rich",
    routeName: "ExampleUseCaseLayoutRich",
    shortDescription:
      "Use inline box segments and consume returned box frames.",
    title: "layout() rich inline boxes",
  },
  {
    apiSymbol: "usePretextLayout",
    coveredDocSections: ["usePretextLayout(options)"],
    docAnchor: "usepretextlayoutoptions",
    pairId: "use-pretext-layout",
    path: "examples/use-case/use-pretext-layout",
    routeName: "ExampleUseCaseHook",
    shortDescription:
      "Let React own prepare, layout, error, and release lifecycle.",
    title: "usePretextLayout() hook",
  },
  {
    apiSymbol: "Pretext",
    coveredDocSections: ["Pretext", "Types"],
    docAnchor: "pretext",
    pairId: "namespace-and-types",
    path: "examples/use-case/namespace-and-types",
    routeName: "ExampleUseCaseNamespaceAndTypes",
    shortDescription:
      "Compare named exports with namespace calls and type helpers.",
    title: "Pretext namespace and types",
  },
] as const satisfies Omit<ApiExampleManifestEntry, "kind" | "reportPrefix">[];

const noneUseCaseEntries = [
  {
    apiSymbol: "rn-only:prepare",
    coveredDocSections: ["prepare(text, style)", "PretextPrepared"],
    docAnchor: "preparetext-style",
    pairId: "prepare",
    path: "examples/none-use-case/prepare",
    routeName: "ExampleNoneUseCasePrepare",
    shortDescription:
      "Show the hidden measurement cache you build without prepare().",
    title: "RN-only prepare workaround",
  },
  {
    apiSymbol: "rn-only:layout-metrics",
    coveredDocSections: ['output: "metrics"'],
    docAnchor: "output-metrics",
    pairId: "layout-metrics",
    path: "examples/none-use-case/layout-metrics",
    routeName: "ExampleNoneUseCaseLayoutMetrics",
    shortDescription:
      "Measure height with hidden Text before visible cards can render.",
    title: "RN-only metrics workaround",
  },
  {
    apiSymbol: "rn-only:layout-options",
    coveredDocSections: ["PretextLayoutOptions"],
    docAnchor: "layoutprepared-widthoroptions",
    pairId: "layout-options",
    path: "examples/none-use-case/layout-options",
    routeName: "ExampleNoneUseCaseLayoutOptions",
    shortDescription:
      "Show why shape and break rules become caller-managed state.",
    title: "RN-only options workaround",
  },
  {
    apiSymbol: "rn-only:layout-lines",
    coveredDocSections: ['output: "lines"'],
    docAnchor: "output-lines",
    pairId: "layout-lines",
    path: "examples/none-use-case/layout-lines",
    routeName: "ExampleNoneUseCaseLayoutLines",
    shortDescription:
      "Use onTextLayout and expose missing native line geometry.",
    title: "RN-only lines workaround",
  },
  {
    apiSymbol: "rn-only:diagnostics",
    coveredDocSections: ['output: "diagnostics"'],
    docAnchor: "output-diagnostics",
    pairId: "layout-diagnostics",
    path: "examples/none-use-case/layout-diagnostics",
    routeName: "ExampleNoneUseCaseDiagnostics",
    shortDescription:
      "Show the engine and drift signals RN callbacks do not report.",
    title: "RN-only diagnostics gap",
  },
  {
    apiSymbol: "rn-only:rich",
    coveredDocSections: ['output: "rich"', "InlineBoxFrame"],
    docAnchor: "output-rich",
    pairId: "layout-rich",
    path: "examples/none-use-case/layout-rich",
    routeName: "ExampleNoneUseCaseLayoutRich",
    shortDescription:
      "Use nested Text and show the missing inline box frame contract.",
    title: "RN-only rich inline gap",
  },
  {
    apiSymbol: "rn-only:hook",
    coveredDocSections: ["usePretextLayout(options)"],
    docAnchor: "usepretextlayoutoptions",
    pairId: "use-pretext-layout",
    path: "examples/none-use-case/use-pretext-layout",
    routeName: "ExampleNoneUseCaseHook",
    shortDescription:
      "Show the custom hook lifecycle required around hidden measurement.",
    title: "RN-only hook workaround",
  },
] as const satisfies Omit<ApiExampleManifestEntry, "kind" | "reportPrefix">[];

export const apiExampleManifest: ApiExampleManifestEntry[] = [
  ...apiUseCaseEntries.map((entry) => ({
    ...entry,
    kind: "use-case" as const,
    reportPrefix: "API_EXAMPLE_REPORT" as const,
  })),
  ...noneUseCaseEntries.map((entry) => ({
    ...entry,
    kind: "none-use-case" as const,
    reportPrefix: "NONE_USE_CASE_REPORT" as const,
  })),
];

export const useCaseExamples = apiExampleManifest.filter(
  (entry) => entry.kind === "use-case",
);

export const noneUseCaseExamples = apiExampleManifest.filter(
  (entry) => entry.kind === "none-use-case",
);
