#!/usr/bin/env node
// check_stale_data.mjs -- warn (exit 0) on any data record whose
// `last_verified` is older than 90 days. v0.1 does not block the build
// on stale data; the citation gate that does block lands in spec 0003.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const libPath = resolve(here, "..", "src", "lib", "bill_delta.ts");

const src = readFileSync(libPath, "utf8");

// extract every `last_verified: "YYYY-MM-DD"` literal in the file.
const matches = [...src.matchAll(/last_verified:\s*"(\d{4}-\d{2}-\d{2})"/g)];
if (matches.length === 0) {
  console.error("ERROR: no last_verified fields found in bill_delta.ts");
  process.exit(2);
}

const today = new Date();
const STALE_DAYS = 90;
let stale = 0;
for (const [, iso] of matches) {
  const verified = new Date(iso + "T00:00:00Z");
  const ageDays = (today.getTime() - verified.getTime()) / 86_400_000;
  if (ageDays > STALE_DAYS) {
    console.warn(
      `warn: last_verified=${iso} is ${Math.floor(ageDays)} days old (>${STALE_DAYS}d).`
    );
    stale++;
  }
}

if (stale === 0) {
  console.log(`ok: ${matches.length} last_verified rows all within ${STALE_DAYS} days.`);
} else {
  console.warn(`warn: ${stale} of ${matches.length} rows are stale (>${STALE_DAYS}d).`);
}
process.exit(0);
