#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function slugHeading(line) {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/`/g, "")
    .replace(/"/g, "")
    .replace(/[()]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function field(chunk, name) {
  const match = chunk.match(new RegExp(`${name}:\\s*"([^"]+)"`));

  if (match === null) {
    throw new Error(`Missing ${name} in manifest entry:\n${chunk}`);
  }

  return match[1];
}

function section(source, name) {
  const start = source.indexOf(`const ${name} = [`);

  if (start < 0) {
    throw new Error(`Missing manifest section ${name}`);
  }

  const end = source.indexOf("] as const", start);

  if (end < 0) {
    throw new Error(`Missing manifest section terminator for ${name}`);
  }

  return source.slice(start, end);
}

function parseEntries(source, sectionName, kind, reportPrefix) {
  const chunks = [
    ...section(source, sectionName).matchAll(/\n\s*\{[\s\S]*?\n\s*\},/g),
  ];

  return chunks.map(([chunk]) => ({
    apiSymbol: field(chunk, "apiSymbol"),
    docAnchor: field(chunk, "docAnchor"),
    kind,
    pairId: field(chunk, "pairId"),
    path: field(chunk, "path"),
    reportPrefix,
    routeName: field(chunk, "routeName"),
  }));
}

function screenFileFor(entry) {
  const folder =
    entry.kind === "use-case"
      ? "example/src/screens/examples/use-case"
      : "example/src/screens/examples/non-use-case";

  return `${folder}/${entry.routeName}Screen.tsx`;
}

const requiredApiFields = {
  "layout-diagnostics": [
    "boundaryMapUtf16Length",
    "driftKinds",
    "fallbackReason",
    "heightMetricSource",
    "layoutEngine",
    "lineDiagnosticCount",
    "normalizedRequest",
    "output",
    "width",
  ],
  "layout-lines": ["firstLine", "lineCount", "output", "width"],
  "layout-metrics": [
    "height",
    "lineCount",
    "maxLineWidth",
    "output",
    "paragraphCount",
    "precomputedCardHeight",
    "width",
  ],
  "layout-options": [
    "left",
    "objectHeight",
    "objectLineCount",
    "shapeSliceCount",
    "shorthandHeight",
    "whiteSpace",
    "width",
    "wordBreak",
  ],
  "layout-rich": [
    "boxFrameCount",
    "boxFrames",
    "height",
    "lineCount",
    "output",
    "width",
  ],
  "namespace-and-types": [
    "exportedTypes",
    "functionMatches",
    "namedHeight",
    "namespaceHeight",
    "routeCount",
    "sameMetrics",
  ],
  prepare: [
    "hasPrepared",
    "paragraphCount",
    "publicFields",
    "rawNativeIdExposed",
    "released",
    "releaseError",
    "statsTotalMs",
  ],
  "use-pretext-layout": [
    "enabled",
    "error",
    "height",
    "isPreparing",
    "layoutEngine",
    "layoutOutput",
    "lineCount",
    "output",
    "paragraphCount",
    "source",
    "statsTotalMs",
    "width",
  ],
};

const requiredNonUseCaseFields = {
  "layout-diagnostics": [
    "hiddenNodeCount",
    "layoutCallbackCount",
    "renderPassCount",
    "textLayoutCallbackCount",
  ],
  "layout-lines": ["callbackCount", "hiddenNodeCount", "renderPassCount"],
  "layout-metrics": ["callbackCount", "hiddenNodeCount", "renderPassCount"],
  "layout-options": ["callbackCount", "hiddenNodeCount", "renderPassCount"],
  "layout-rich": [
    "hiddenNodeCount",
    "layoutCallbackCount",
    "renderPassCount",
    "textLayoutCallbackCount",
  ],
  prepare: ["callbackCount", "hiddenNodeCount", "renderPassCount"],
  "use-pretext-layout": [
    "hiddenNodeCount",
    "layoutCallbackCount",
    "renderPassCount",
    "textLayoutCallbackCount",
  ],
};

const docs = read("docs/api.md");
const manifestSource = read(
  "example/src/screens/examples/apiExampleManifest.ts",
);
const navigationTypes = read("example/src/navigation/types.ts");
const app = read("example/src/App.tsx");
const exampleIndex = read(
  "example/src/screens/examples/ExampleIndexScreen.tsx",
);
const useCaseIndex = read(
  "example/src/screens/examples/use-case/ExampleUseCaseIndexScreen.tsx",
);
const nonUseCaseIndex = read(
  "example/src/screens/examples/non-use-case/ExampleNonUseCaseIndexScreen.tsx",
);

const docAnchors = new Set(
  docs
    .split("\n")
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map(slugHeading),
);
const entries = [
  ...parseEntries(
    manifestSource,
    "apiUseCaseEntries",
    "use-case",
    "API_EXAMPLE_REPORT",
  ),
  ...parseEntries(
    manifestSource,
    "nonUseCaseEntries",
    "non-use-case",
    "NON_USE_CASE_REPORT",
  ),
];
const errors = [];
const paths = new Set();
const routeNames = new Set();

function check(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

check(
  entries.length === 15,
  `Expected 15 API example entries, found ${entries.length}`,
);
check(
  entries.filter((entry) => entry.kind === "use-case").length === 8,
  "Expected 8 use-case examples",
);
check(
  entries.filter((entry) => entry.kind === "non-use-case").length === 7,
  "Expected 7 non-use-case examples",
);
check(
  exampleIndex.includes("ExampleUseCaseIndex") &&
    exampleIndex.includes("ExampleNonUseCaseIndex"),
  "ExampleIndex must link to both example catalogs",
);
check(
  useCaseIndex.includes("useCaseExamples") &&
    useCaseIndex.includes("examples.use-case.open."),
  "Use-case index must render cards from apiExampleManifest",
);
check(
  nonUseCaseIndex.includes("nonUseCaseExamples") &&
    nonUseCaseIndex.includes("examples.non-use-case.open."),
  "Non-use-case index must render cards from apiExampleManifest",
);

for (const entry of entries) {
  check(
    docAnchors.has(entry.docAnchor),
    `${entry.path} docAnchor is missing: ${entry.docAnchor}`,
  );
  check(!paths.has(entry.path), `Duplicate example path: ${entry.path}`);
  check(
    !routeNames.has(entry.routeName),
    `Duplicate example route: ${entry.routeName}`,
  );
  check(
    !entry.path.includes("none-use-case"),
    `${entry.path} must use non-use-case`,
  );
  check(
    navigationTypes.includes(`${entry.routeName}: undefined;`),
    `${entry.routeName} is missing from AppStackParamList`,
  );
  check(
    app.includes(`${entry.routeName}: "${entry.path}"`),
    `${entry.path} is missing from linking`,
  );
  check(
    app.includes(`name="${entry.routeName}"`),
    `${entry.routeName} is missing from Stack.Screen`,
  );

  paths.add(entry.path);
  routeNames.add(entry.routeName);

  const screenFile = screenFileFor(entry);
  check(exists(screenFile), `${screenFile} is missing`);

  if (exists(screenFile)) {
    const screen = read(screenFile);
    const reportMarker = `${entry.reportPrefix}::${entry.path}::`;
    const requiredFields =
      entry.kind === "use-case"
        ? requiredApiFields[entry.pairId]
        : requiredNonUseCaseFields[entry.pairId];

    check(
      screen.includes(reportMarker),
      `${screenFile} is missing ${reportMarker}`,
    );
    check(
      Array.isArray(requiredFields),
      `${entry.path} does not have required report field metadata`,
    );

    for (const requiredField of requiredFields ?? []) {
      check(
        screen.includes(requiredField),
        `${screenFile} report must expose ${requiredField}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("API example map verification failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  `API example map verified: ${entries.length} routes, ${docAnchors.size} docs anchors`,
);
