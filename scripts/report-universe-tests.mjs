import { readFile, writeFile } from "node:fs/promises";
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
function cases(r) {
  const result = [];
  function visit(s) {
    for (const spec of s.specs || [])
      for (const t of spec.tests || [])
        result.push({
          file: spec.file,
          title: spec.title,
          project: t.projectName,
          passed: t.results.at(-1)?.status === "passed",
        });
    for (const c of s.suites || []) visit(c);
  }
  visit(r);
  return result;
}
const unit = await read("artifacts/universe/unit-results.json"),
  first = await read("artifacts/universe/browser-results-initial.json");
const latest = new Map(
  cases(first).map((t) => [`${t.file}:${t.title}:${t.project}`, t]),
);
try {
  for (const t of cases(
    await read("artifacts/universe/browser-results-retry.json"),
  ))
    latest.set(`${t.file}:${t.title}:${t.project}`, t);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
try {
  for (const t of cases(
    await read("artifacts/universe/browser-results-gesture.json"),
  ))
    latest.set(`${t.file}:${t.title}:${t.project}`, t);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const mobileBaseline = await read(
  "artifacts/universe/mobile-initial-cases.json",
);
const mobileLatest = new Map(
  mobileBaseline.cases.map((t) => [`${t.file}:${t.title}:${t.project}`, t]),
);
for (const t of cases(
  await read("artifacts/universe/mobile-results-retry.json"),
))
  mobileLatest.set(`${t.file}:${t.title}:${t.project}`, t);
const browser = [...latest.values()],
  mobile = [...mobileLatest.values()],
  design = cases(await read("artifacts/layout/design-results.json")),
  native = cases(await read("artifacts/electron-results.json"));
const world = await read("artifacts/universe/visual-results.json"),
  characters = await read("artifacts/interaction/visual-results.json");
const tests = [...browser, ...mobile, ...design, ...native];
const report = {
  generatedAt: new Date().toISOString(),
  brand: "同頻星球",
  unit: { passed: unit.numPassedTests, failed: unit.numFailedTests },
  tests,
  totalPassed: unit.numPassedTests + tests.filter((t) => t.passed).length,
  totalFailed: unit.numFailedTests + tests.filter((t) => !t.passed).length,
  worlds: world.worlds.length,
  worldStateRetained: world.worldStateRetained,
  characterViews: characters.residents.length,
  characterAngles: characters.nebulaAngles || [],
  renderErrors: [...world.errors, ...characters.errors],
  visualQuality: "Needs Human Review",
  hardwarePerformance: "Not Tested",
  note: "Latest result per executed test after timeout and gesture/hit-test corrections. Mobile baseline parsed from archived raw runner log and overridden by the raw retry JSON; no skipped cases or duplicated counts. Native IPC uses a controlled cursor; no Windows hardware claim.",
};
await writeFile(
  "artifacts/universe/test-report.json",
  JSON.stringify(report, null, 2),
);
if (
  report.totalPassed !== 67 ||
  report.totalFailed ||
  report.renderErrors.length ||
  report.worlds !== 4 ||
  report.characterViews !== 9 ||
  report.characterAngles.length !== 4 ||
  !report.worldStateRetained
)
  throw Error("Incomplete verification");
console.log(
  `${report.totalPassed} passed; 4 worlds and 9 character views verified.`,
);
