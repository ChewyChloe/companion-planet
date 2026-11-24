import { readFile, writeFile } from "node:fs/promises";
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const previous = await read(
  "artifacts/interaction/regression-web-results.json",
);
const interaction = await read(
  "artifacts/interaction/interaction-results.json",
);
const mobile = await read("artifacts/mobile-results.json");
const design = await read("artifacts/layout/design-results.json");
const electron = await read("artifacts/electron-results.json");
const unit = await read("artifacts/interaction/unit-results.json");
const visual = await read("artifacts/interaction/visual-results.json");
function cases(result) {
  const list = [];
  const visit = (s) => {
    for (const spec of s.specs || [])
      for (const t of spec.tests || [])
        list.push({
          file: spec.file,
          title: spec.title,
          project: t.projectName,
          passed: t.results.at(-1)?.status === "passed",
        });
    for (const child of s.suites || []) visit(child);
  };
  visit(result);
  return list;
}
const tests = [
  ...cases(previous).filter((t) => t.file.endsWith("web.spec.ts")),
  ...cases(interaction),
  ...cases(mobile),
  ...cases(design),
  ...cases(electron),
];
const report = {
  generatedAt: new Date().toISOString(),
  unit: { passed: unit.numPassedTests, failed: unit.numFailedTests },
  browserAndDesktop: tests,
  totalPassed: unit.numPassedTests + tests.filter((t) => t.passed).length,
  totalFailed: unit.numFailedTests + tests.filter((t) => !t.passed).length,
  visual: { residents: visual.residents.length, errors: visual.errors },
  humanReview: [
    "Reference fidelity and aesthetic quality",
    "Physical iOS/Android",
    "Windows native dragging and compositing",
  ],
  nativeTestNote:
    "Real Electron preload IPC/window movement with controlled cursor; browser and CDP touch validate pointer handling.",
};
await writeFile(
  "artifacts/interaction/test-report.json",
  JSON.stringify(report, null, 2),
);
if (
  report.totalPassed !== 56 ||
  report.totalFailed ||
  report.visual.errors.length ||
  report.visual.residents !== 9
)
  throw Error("QA incomplete");
console.log(`${report.totalPassed} passed; nine real 3D residents captured.`);
