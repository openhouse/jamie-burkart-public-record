import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { candidateFingerprint, loadRecords, recordForManifest, repoRoot, sha256 } from "./lib.mjs";

const records = loadRecords();
const entries = records.map(recordForManifest);
const generatedAt = "2026-08-03";

function write(relative, value) {
  const destination = path.join(repoRoot, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, value);
}

const catalog = {
  schema_version: "1.0.0",
  generated_at: generatedAt,
  record_count: entries.length,
  candidate_fingerprint: candidateFingerprint(records),
  records: entries
};

write("catalog/records.json", `${JSON.stringify(catalog, null, 2)}\n`);

const table = entries.map((entry) =>
  `| ${entry.record_date} | [${entry.title}](../${entry.canonical_path}) | ${entry.kind} | ${entry.publication_state} |`
).join("\n");
write("catalog/INDEX.md", `# Record catalog\n\n| Date | Record | Kind | Publication state |\n| --- | --- | --- | --- |\n${table}\n`);

const dimensions = {
  practices: "practice",
  projects: "project",
  places: "place",
  years: "record_date",
  "source-types": "source_type"
};
for (const [name, field] of Object.entries(dimensions)) {
  const groups = new Map();
  for (const entry of entries) {
    const key = field === "record_date" ? entry.record_date.slice(0, 4) : entry[field];
    const values = groups.get(key) ?? [];
    values.push(entry);
    groups.set(key, values);
  }
  const sections = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => {
    const links = values.map((entry) => `- [${entry.title}](../${entry.canonical_path}) — ${entry.summary}`).join("\n");
    return `## ${key}\n\n${links}`;
  }).join("\n\n");
  write(`browse/${name}.md`, `# Browse by ${name.replace("-", " ")}\n\nGenerated from canonical records.\n\n${sections}\n`);
}

const manifest = {
  schema_version: "1.0.0",
  generated_at: generatedAt,
  repository: "openhouse/jamie-burkart-public-record",
  visibility_state: "private-public-safe-implementation-candidate",
  publication_authority: "Jamie Burkart",
  public_release_authorized: false,
  canonical_home_rule: "one-record-one-home-link-do-not-duplicate",
  source_body_policy: "public-source-bodies-remain-in-their-canonical-editions",
  private_source_dependency: false,
  photo_policy: "no-photo-pixels-or-identifiers; publication-review-required",
  record_count: entries.length,
  candidate_fingerprint: candidateFingerprint(records),
  records_digest: sha256(JSON.stringify(entries)),
  records: entries
};
write("manifests/public-knowledge-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ${entries.length} records; candidate ${manifest.candidate_fingerprint}`);
