import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(import.meta.dirname, "..");

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

export function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const data = {};
  for (const rawLine of match[1].split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf(":");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: source.slice(match[0].length), source, filePath };
}

export function loadRecords(root = repoRoot) {
  const library = path.join(root, "library");
  return walk(library)
    .filter((file) => file.endsWith(".md"))
    .map((file) => parseFrontmatter(readFileSync(file, "utf8"), file))
    .filter(Boolean)
    .sort((a, b) => a.data.canonical_path.localeCompare(b.data.canonical_path));
}

export function relativePath(file, root = repoRoot) {
  return path.relative(root, file).split(path.sep).join("/");
}

export function validateModel(records, root = repoRoot, options = {}) {
  const errors = [];
  const required = [
    "id", "title", "kind", "status", "visibility", "canonical_path",
    "subject", "record_date", "practice", "project", "place",
    "source_type", "source_home", "publication_state", "summary"
  ];
  const ids = new Set();
  const canonicalTargets = new Set();

  for (const record of records) {
    const { data, body, filePath } = record;
    const rel = relativePath(filePath, root);
    for (const key of required) {
      if (!data[key]) errors.push(`${rel}: missing ${key}`);
    }
    if (ids.has(data.id)) errors.push(`${rel}: duplicate id ${data.id}`);
    ids.add(data.id);
    if (data.visibility !== "public-safe") errors.push(`${rel}: visibility must be public-safe`);
    if (data.canonical_path !== rel) errors.push(`${rel}: canonical_path mismatch`);
    if (!/^record\.[a-z0-9.-]+$/.test(data.id ?? "")) errors.push(`${rel}: invalid stable id`);
    if (!/^(canonical-reference|public-source-record|public-coverage-gap)$/.test(data.kind ?? "")) {
      errors.push(`${rel}: invalid kind`);
    }
    if (/\/(Users|Volumes|private|tmp)\//.test(record.source)) errors.push(`${rel}: local absolute path leaked`);
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(record.source)) errors.push(`${rel}: email address leaked`);
    if (/\b(?:iMessage|WhatsApp|private transcript body|raw correspondence)\b/i.test(body)) {
      errors.push(`${rel}: protected communication content class named in record body`);
    }
    if (!/## Evidence boundary\n/.test(body)) errors.push(`${rel}: missing evidence boundary`);
    if (/publication-approved|portfolio-approved/.test(record.source)) errors.push(`${rel}: unauthorized approval state`);
    if (data.photo_state && data.photo_state !== "absent-until-human-approved") {
      errors.push(`${rel}: photograph state must fail closed`);
    }

    if (data.kind === "canonical-reference") {
      for (const key of ["canonical_repository", "canonical_commit", "canonical_record_path", "canonical_record_url", "primary_source_url", "text_state"]) {
        if (!data[key]) errors.push(`${rel}: canonical reference missing ${key}`);
      }
      if (!/^[0-9a-f]{40}$/.test(data.canonical_commit ?? "")) errors.push(`${rel}: canonical commit is not pinned`);
      const target = `${data.canonical_repository}:${data.canonical_record_path}`;
      if (canonicalTargets.has(target)) errors.push(`${rel}: duplicated canonical source target`);
      canonicalTargets.add(target);
      if (data.text_state !== "reference-only-no-duplicated-body") errors.push(`${rel}: canonical text must remain reference-only`);
      if (!/github\.com\/openhouse\/commercial-rent-stabilization-public-support\/blob\/[0-9a-f]{40}\//.test(data.canonical_record_url ?? "")) {
        errors.push(`${rel}: canonical URL must be content-addressed`);
      }
    }

    if (data.kind === "public-coverage-gap") {
      if (data.occurrence_state !== "not-established-by-public-source") {
        errors.push(`${rel}: coverage gap cannot establish occurrence`);
      }
      if (data.publication_state !== "human-review-required") {
        errors.push(`${rel}: coverage gap must remain human-review-required`);
      }
    }

    if (data.id === "record.statement.2026-08-15-cultural-space-rent-stabilization-story") {
      const expected = {
        canonical_commit: "ea5497dd910f3402c01e8b560b149d6674f951cc",
        canonical_source_sha256: "24808b127cd7af7bf0e804db0e27ec59b82d57d96ebf62a2f1e617ed6845caef",
        media_state: "canonical-external-checksum-bound",
        transcript_state: "complete-editorially-reviewed-diarized-audio-caption-and-source-checked",
        human_listening_approval: "pending-separate-gate",
        account_authorship_scope: "coalition-account-publication-individual-editorial-authorship-not-established"
      };
      for (const [key, value] of Object.entries(expected)) {
        if (data[key] !== value) errors.push(`${rel}: Story ${key} boundary drifted`);
      }
      if (!/tagged\s+accounts and sponsor acknowledgements establish endorsement/.test(body)) {
        errors.push(`${rel}: Story tag and sponsor endorsement boundary missing`);
      }
      const expectedTranscriptUrl = `https://github.com/openhouse/commercial-rent-stabilization-public-support/blob/${expected.canonical_commit}/sources/instagram/2026-08-15-nycartc-story-3964470891412306511/transcript.reviewed.md`;
      if (data.reviewed_transcript_url !== expectedTranscriptUrl) {
        errors.push(`${rel}: Story reviewed transcript reference drifted`);
      }
      if (!/Final human\s+listening\/approval remains separate/.test(body)) {
        errors.push(`${rel}: Story final human listening gate missing`);
      }
    }
  }

  if (!options.skipLinks) {
    for (const file of walk(root).filter((item) => item.endsWith(".md") && !item.includes("/.git/"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^(https?:|mailto:)/.test(target)) continue;
        const resolved = path.resolve(path.dirname(file), decodeURI(target));
        if (!existsSync(resolved)) errors.push(`${relativePath(file, root)}: broken relative link ${match[1]}`);
      }
    }
  }

  return errors;
}

export function recordForManifest(record) {
  const { data, source } = record;
  return {
    id: data.id,
    title: data.title,
    kind: data.kind,
    status: data.status,
    canonical_path: data.canonical_path,
    record_date: data.record_date,
    practice: data.practice,
    project: data.project,
    place: data.place,
    source_type: data.source_type,
    source_home: data.source_home,
    publication_state: data.publication_state,
    summary: data.summary,
    canonical_repository: data.canonical_repository || null,
    canonical_commit: data.canonical_commit || null,
    canonical_record_path: data.canonical_record_path || null,
    canonical_record_url: data.canonical_record_url || null,
    primary_source_url: data.primary_source_url || null,
    sha256: sha256(source)
  };
}

export function candidateFingerprint(records) {
  return sha256(records.map((record) => `${record.data.canonical_path}\0${sha256(record.source)}`).join("\n"));
}
