import { readFile, writeFile } from "node:fs/promises";
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const unit = await read("artifacts/layout/unit-results.json");
const suites = {
  unit: {
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    status: unit.success ? "Passed" : "Failed",
  },
};
for (const [name, path] of Object.entries({
  web: "artifacts/web-results.json",
  mobile: "artifacts/mobile-results.json",
  design: "artifacts/layout/design-results.json",
  electron: "artifacts/electron-results.json",
})) {
  const r = await read(path);
  suites[name] = {
    passed: r.stats.expected,
    failed: r.stats.unexpected,
    flaky: r.stats.flaky,
    skipped: r.stats.skipped,
    evidence: path,
    status:
      r.stats.unexpected === 0 && r.stats.expected > 0 ? "Passed" : "Failed",
  };
}
const visual = await read("artifacts/layout/visual-results.json");
if (
  !visual.completed ||
  Object.keys(visual.views).length !== 6 ||
  visual.errors.length
)
  throw Error("Layout capture incomplete");
const report = {
  generatedAt: new Date().toISOString(),
  suites,
  totalPassed: Object.values(suites).reduce((a, s) => a + s.passed, 0),
  visual: {
    views: Object.keys(visual.views),
    errors: visual.errors,
    actorUncovered: Object.values(visual.views).every((v) => v.actorUncovered),
    overflow: Object.values(visual.views).some((v) => v.overflow),
  },
  limits: [
    "Real iOS/Android GPU and native keyboard not tested",
    "Native Windows compositing not tested",
    "Render deployment not checked",
  ],
};
await writeFile(
  "artifacts/layout/test-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
if (
  Object.values(suites).some((s) => s.status === "Failed") ||
  !report.visual.actorUncovered ||
  report.visual.overflow
)
  throw Error("Layout regression failed");
console.log(JSON.stringify(report, null, 2));
