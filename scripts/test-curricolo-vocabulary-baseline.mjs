import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REGISTRY_PATH = "docs/governance/TRAMA_TERM_01_DOS_VOCABULARY.json";
const SELF_PATHS = new Set([
  REGISTRY_PATH,
  "scripts/test-curricolo-vocabulary-baseline.mjs",
  "scripts/test-curricolo-vocabulary-guard.mjs",
  "scripts/validate-curricolo-vocabulary.mjs",
]);
const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));

function grep(ref = null) {
  const args = ["grep", "-n", "-I", "-i", "-E", "curriculum|curricular"];
  if (ref) args.push(ref);
  args.push("--", ".");
  try {
    const output = execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => {
      const withoutRef = ref && line.startsWith(`${ref}:`) ? line.slice(ref.length + 1) : line;
      const filePath = withoutRef.split(":", 1)[0];
      return !SELF_PATHS.has(filePath);
    });
  } catch (error) {
    if (error && typeof error === "object" && error.status === 1) return [];
    throw error;
  }
}

function pathOf(line, ref = null) {
  const normalized = ref && line.startsWith(`${ref}:`) ? line.slice(ref.length + 1) : line;
  return normalized.split(":", 1)[0];
}

function scopeFor(filePath) {
  if (filePath.startsWith("product/src/")) return "product-runtime";
  if (filePath.startsWith("src/")) return "legacy-runtime";
  if (filePath.startsWith("api/")) return "api-contract";
  if (filePath.startsWith("supabase/") || filePath.includes("migration")) return "persistence";
  if (filePath.startsWith("docs/")) return "docs-governance-history";
  if (filePath.startsWith("tests/") || filePath.includes("test")) return "tests";
  if (filePath.startsWith("scripts/")) return "tooling";
  return "other";
}

function summarize(lines, ref = null) {
  const counts = {};
  for (const line of lines) {
    const scope = scopeFor(pathOf(line, ref));
    counts[scope] = (counts[scope] ?? 0) + 1;
  }
  return counts;
}

assert.equal(registry.baselineRef, "a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2");
const baseline = grep(registry.baselineRef);
const current = grep();
assert.ok(baseline.length > 0, "TERM-01 baseline must capture the known legacy vocabulary debt");
assert.ok(
  current.length <= baseline.length,
  `TERM-01 legacy vocabulary debt increased: baseline=${baseline.length} current=${current.length}`,
);

console.log("TRAMA_TERM_01_DOCENTE_OS_BASELINE_PASS");
console.log(JSON.stringify({
  baselineRef: registry.baselineRef,
  baselineCount: baseline.length,
  currentCount: current.length,
  removedCount: baseline.length - current.length,
  baselineByScope: summarize(baseline, registry.baselineRef),
  currentByScope: summarize(current),
}, null, 2));
