import { readFile, writeFile } from "node:fs/promises";
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const unit = await read("artifacts/art/unit-results.json");
const paths = {
  web: "artifacts/web-results.json",
  mobile: "artifacts/mobile-results.json",
  design: "artifacts/redesign/design-results.json",
  electron: "artifacts/electron-results.json",
};
const suites = {
  unit: {
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    status: unit.success ? "Passed" : "Failed",
  },
};
for (const [name, path] of Object.entries(paths)) {
  const r = await read(path);
  suites[name] = {
    passed: r.stats.expected,
    failed: r.stats.unexpected,
    flaky: r.stats.flaky,
    skipped: r.stats.skipped,
    status:
      r.stats.unexpected === 0 && r.stats.expected > 0 ? "Passed" : "Failed",
    evidence: path,
  };
}
const visual = await read("artifacts/art/visual-results.json");
if (
  !visual.completed ||
  Object.keys(visual.views).length !== 4 ||
  Object.keys(visual.animations).length !== 9
)
  throw Error("Incomplete visual run");
const result = {
  generatedAt: new Date().toISOString(),
  suites,
  totalPassed: Object.values(suites).reduce((a, s) => a + s.passed, 0),
  visual: {
    actions: Object.keys(visual.animations),
    views: Object.keys(visual.views),
    errors: visual.errors,
    performance: visual.scenes.planet.fps,
    contact: visual.scenes.readContact,
  },
  limits: [
    "Visual similarity and material quality require human approval",
    "SwiftShader FPS is not a real-device GPU benchmark",
    "Real iOS/Android and native Windows compositing are not tested",
  ],
};
await writeFile(
  "artifacts/art/test-report.json",
  JSON.stringify(result, null, 2) + "\n",
);
if (
  Object.values(suites).some((s) => s.status === "Failed") ||
  visual.errors.length
)
  throw Error("Art regression suite failed");
console.log(JSON.stringify(result, null, 2));
