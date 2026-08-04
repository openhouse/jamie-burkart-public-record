import { loadRecords, validateModel } from "../tools/lib.mjs";

const baseline = loadRecords();
const clone = () => structuredClone(baseline);
const cases = [
  ["duplicate stable ID", (records) => { records[1].data.id = records[0].data.id; }],
  ["private visibility", (records) => { records[0].data.visibility = "private"; }],
  ["local archive path", (records) => { records[0].source += "\n/Users/example/private\n"; }],
  ["email leakage", (records) => { records[0].source += "\nperson@example.com\n"; }],
  ["missing evidence boundary", (records) => { records[0].body = records[0].body.replace("## Evidence boundary\n", "## Context\n"); }],
  ["unauthorized publication approval", (records) => { records[0].source += "\npublication-approved\n"; }],
  ["unpinned canonical commit", (records) => { const r = records.find((x) => x.data.kind === "canonical-reference"); r.data.canonical_commit = "main"; }],
  ["duplicated canonical source", (records) => { const refs = records.filter((x) => x.data.kind === "canonical-reference"); refs[1].data.canonical_record_path = refs[0].data.canonical_record_path; }],
  ["duplicated statement body", (records) => { const r = records.find((x) => x.data.kind === "canonical-reference"); r.data.text_state = "copied-full-text"; }],
  ["coverage gap asserted as occurrence", (records) => { const r = records.find((x) => x.data.kind === "public-coverage-gap"); r.data.occurrence_state = "occurred"; }],
  ["coverage gap marked public", (records) => { const r = records.find((x) => x.data.kind === "public-coverage-gap"); r.data.publication_state = "public-source-already-published"; }],
  ["photo auto-approved", (records) => { records[0].data.photo_state = "publication-approved"; }]
];

const baselineErrors = validateModel(baseline, undefined, { skipLinks: true });
if (baselineErrors.length) {
  console.error(`Baseline failed:\n${baselineErrors.join("\n")}`);
  process.exit(1);
}

const results = [];
for (const [name, mutate] of cases) {
  const candidate = clone();
  mutate(candidate);
  const detected = validateModel(candidate, undefined, { skipLinks: true }).length > 0;
  results.push({ name, detected });
}

const missed = results.filter((result) => !result.detected);
console.log(`${results.length - missed.length}/${results.length} adversarial mutations detected.`);
for (const result of results) console.log(`${result.detected ? "PASS" : "MISS"} ${result.name}`);
if (missed.length) process.exitCode = 1;
