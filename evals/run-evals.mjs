import { loadRecords, validateModel } from "../tools/lib.mjs";

const baseline = loadRecords();
const clone = () => structuredClone(baseline);

function validateWowListProductFit(records) {
  const errors = [];
  const record = records.find((item) => item.data.id === "record.project.wow-list-product-leadership");
  if (!record) return ["missing WOW List Senior Product Manager fit record"];

  for (const required of [
    "Job ID 782366",
    "Richard Caceres",
    "## Demonstrated product practice",
    "## Evidence-backed requirement map",
    "## Explicit gaps and human gates",
    "civil-service minimum qualifications",
    "WCAG 2.1 AA",
    "does not guarantee"
  ]) {
    if (!record.source.includes(required)) errors.push(`WOW List product-fit record is missing ${required}`);
  }

  for (const forbidden of [
    "solely built WOW List",
    "meets the civil-service minimum qualifications",
    "fully WCAG 2.1 AA compliant",
    "guaranteed to be awarded"
  ]) {
    if (record.source.includes(forbidden)) errors.push(`WOW List product-fit record overclaims ${forbidden}`);
  }
  return errors;
}

function validateWowListSocialPractice(records) {
  const errors = [];
  const record = records.find((item) => item.data.id === "record.practice.wow-list-relational-curation");
  if (!record) return ["missing WOW List relational-curation record"];

  for (const required of [
    "## Central finding",
    "## Practice and product-affordance map",
    "## How participation moved",
    "## Power, limits, and unanswered questions",
    "## Source notes",
    "Richard Caceres",
    "guest writers",
    "intended practice is not uniform experience",
    "visibility is not consent",
    "https://www.youtube.com/watch?v=nQg47LtixPI",
    "https://x.com/wowlist/status/433671630837919744",
    "https://x.com/wowlist/status/771457416298921985",
    "https://www.sbdiy.org/"
  ]) {
    if (!record.source.includes(required)) errors.push(`WOW List social-practice record is missing ${required}`);
  }

  for (const forbidden of [
    "Jamie solely created WOW List",
    "every participant experienced",
    "public visibility is consent",
    "the social practice caused community impact",
    "private repository authorizes publication"
  ]) {
    if (record.source.toLowerCase().includes(forbidden.toLowerCase())) errors.push(`WOW List social-practice record overclaims ${forbidden}`);
  }
  return errors;
}

function validateSundayDinnerWowListNycacSynergy(records) {
  const errors = [];
  const record = records.find((item) => item.data.id === "record.practice.sunday-dinner-wow-list-nycac-synergy");
  if (!record) return ["missing Sunday Dinner–WOW List–NYCAC synergy record"];

  if (/^title:\s.*\bWildlist\b/im.test(record.source.split("---", 3)[1] ?? "")) {
    errors.push("cross-project synergy record uses Wildlist as the canonical project name");
  }

  for (const required of [
    "## Central finding",
    "## Three containers",
    "## The reusable social-technical pattern",
    "## What changed across the transitions",
    "## Boundaries and open questions",
    "## Source notes",
    "continuity is not inevitability",
    "does not establish that WOW List caused NYC Artist Coalition",
    "Richard Caceres",
    "collective formation",
    "https://x.com/wowlist/status/433671630837919744",
    "https://www.youtube.com/watch?v=nQg47LtixPI",
    "https://www.facebook.com/nycartistcoalition/",
    "https://www.callscript.org/"
  ]) {
    if (!record.source.includes(required)) errors.push(`cross-project synergy record is missing ${required}`);
  }

  for (const forbidden of [
    "WOW List therefore caused NYC Artist Coalition",
    "NYCAC was the inevitable result",
    "Jamie solely created this lineage",
    "private evidence authorizes publication"
  ]) {
    if (record.source.includes(forbidden)) errors.push(`cross-project synergy record overclaims ${forbidden}`);
  }
  return errors;
}

function validateRecomposableProjectSystem(records) {
  const errors = [];
  const record = records.find((item) => item.data.id === "record.practice.recomposable-civic-cultural-systems");
  if (!record) return ["missing recomposable civic-cultural systems record"];

  for (const required of [
    "## Central finding",
    "## Evidence tiers",
    "## Component model",
    "## Documented artifact linkages",
    "## Project-to-component matrix",
    "## How recomposition operates in community practice",
    "## When not to reuse",
    "## Boundaries and open questions",
    "## Source notes",
    "KC Spaces Fund",
    "KC Safer Spaces Fund",
    "KC Town Hall",
    "196 Artists Residency",
    "adaptation is not duplication",
    "structural resemblance does not establish historical transmission",
    "collective credit"
  ]) {
    if (!record.source.includes(required)) errors.push(`recomposable-system record is missing ${required}`);
  }

  for (const forbidden of [
    "All component similarities prove direct historical transmission",
    "Every project used the same blueprint",
    "Jamie solely authored this system",
    "repository access authorizes publication"
  ]) {
    if (record.source.includes(forbidden)) errors.push(`recomposable-system record overclaims ${forbidden}`);
  }

  return errors;
}

const validateCandidate = (records) => [
  ...validateModel(records, undefined, { skipLinks: true }),
  ...validateWowListProductFit(records),
  ...validateWowListSocialPractice(records),
  ...validateSundayDinnerWowListNycacSynergy(records),
  ...validateRecomposableProjectSystem(records)
];

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
  ["photo auto-approved", (records) => { records[0].data.photo_state = "publication-approved"; }],
  ["WOW List product-fit loses collective credit", (records) => {
    const r = records.find((item) => item.data.id === "record.project.wow-list-product-leadership");
    r.source = r.source.replaceAll("Richard Caceres", "a collaborator");
  }],
  ["WOW List product-fit asserts civil-service eligibility", (records) => {
    const r = records.find((item) => item.data.id === "record.project.wow-list-product-leadership");
    r.source += "\nJamie meets the civil-service minimum qualifications.\n";
  }],
  ["WOW List product-fit asserts accessibility compliance", (records) => {
    const r = records.find((item) => item.data.id === "record.project.wow-list-product-leadership");
    r.source += "\nWOW List was fully WCAG 2.1 AA compliant.\n";
  }],
  ["WOW List social-practice loses collective credit", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.wow-list-relational-curation");
    r.source = r.source.replaceAll("Richard Caceres", "a collaborator");
  }],
  ["WOW List social-practice turns guidance into uniform experience", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.wow-list-relational-curation");
    r.source += "\nEvery participant experienced the intended practice.\n";
  }],
  ["WOW List social-practice turns visibility into consent", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.wow-list-relational-curation");
    r.source += "\nPublic visibility is consent.\n";
  }],
  ["WOW List social-practice loses source support", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.wow-list-relational-curation");
    r.source = r.source.replaceAll("https://www.youtube.com/watch?v=nQg47LtixPI", "source-withheld");
  }],
  ["cross-project synergy asserts causation", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.sunday-dinner-wow-list-nycac-synergy");
    r.source += "\nWOW List therefore caused NYC Artist Coalition.\n";
  }],
  ["cross-project synergy asserts inevitability", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.sunday-dinner-wow-list-nycac-synergy");
    r.source += "\nNYCAC was the inevitable result.\n";
  }],
  ["cross-project synergy loses collective credit", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.sunday-dinner-wow-list-nycac-synergy");
    r.source = r.source.replaceAll("Richard Caceres", "a collaborator");
  }],
  ["cross-project synergy loses civic source", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.sunday-dinner-wow-list-nycac-synergy");
    r.source = r.source.replaceAll("https://www.callscript.org/", "source-withheld");
  }],
  ["Wildlist search term replaces the canonical WOW List name", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.sunday-dinner-wow-list-nycac-synergy");
    r.source = r.source.replace(
      "title: Sunday Dinner, WOW List, and NYC Artist Coalition synergy",
      "title: Sunday Dinner, Wildlist, and NYC Artist Coalition synergy"
    );
  }],
  ["recomposable project system promotes resemblance to lineage", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.recomposable-civic-cultural-systems");
    r.source += "\nAll component similarities prove direct historical transmission.\n";
  }],
  ["recomposable project system loses its stop rule", (records) => {
    const r = records.find((item) => item.data.id === "record.practice.recomposable-civic-cultural-systems");
    r.source = r.source.replace("## When not to reuse", "## Optional reuse");
  }]
];

const baselineErrors = validateCandidate(baseline);
if (baselineErrors.length) {
  console.error(`Baseline failed:\n${baselineErrors.join("\n")}`);
  process.exit(1);
}

const results = [];
for (const [name, mutate] of cases) {
  const candidate = clone();
  mutate(candidate);
  const detected = validateCandidate(candidate).length > 0;
  results.push({ name, detected });
}

const missed = results.filter((result) => !result.detected);
console.log(`${results.length - missed.length}/${results.length} adversarial mutations detected.`);
for (const result of results) console.log(`${result.detected ? "PASS" : "MISS"} ${result.name}`);
if (missed.length) process.exitCode = 1;
