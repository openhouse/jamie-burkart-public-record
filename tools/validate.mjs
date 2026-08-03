import { loadRecords, validateModel } from "./lib.mjs";

const records = loadRecords();
const errors = validateModel(records);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${records.length} records, frontmatter, boundaries, canonical homes, and relative links.`);
}
