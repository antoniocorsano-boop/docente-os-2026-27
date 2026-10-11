import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOCABULARY_REGISTRY_PATH = "docs/governance/TRAMA_TERM_01_DOS_VOCABULARY.json";
const SELF_EXEMPT_PATHS = new Set([
  VOCABULARY_REGISTRY_PATH,
  "scripts/test-curricolo-vocabulary-guard.mjs",
  "scripts/test-curricolo-vocabulary-baseline.mjs",
]);

const assertNonEmptyString = (value, label) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vocabulary registry ${label} must be a non-empty string.`);
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function validateVocabularyRegistry(registry) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new Error("Vocabulary registry must be an object.");
  }
  if (registry.canonicalTerm !== "curricolo") {
    throw new Error("Vocabulary registry canonicalTerm must be curricolo.");
  }
  assertNonEmptyString(registry.baselineRef, "baselineRef");
  if (!Array.isArray(registry.legacyTokens) || registry.legacyTokens.length === 0) {
    throw new Error("Vocabulary registry legacyTokens must be a non-empty array.");
  }
  registry.legacyTokens.forEach((token, index) => assertNonEmptyString(token, `legacyTokens ${index}`));
  if (!Array.isArray(registry.exceptions)) {
    throw new Error("Vocabulary registry exceptions must be an array.");
  }
  const seen = new Set();
  for (const [index, exception] of registry.exceptions.entries()) {
    if (!exception || typeof exception !== "object" || Array.isArray(exception)) {
      throw new Error(`Vocabulary registry exception ${index} must be an object.`);
    }
    assertNonEmptyString(exception.path, `exception ${index} path`);
    assertNonEmptyString(exception.contains, `exception ${index} contains`);
    assertNonEmptyString(exception.reason, `exception ${index} reason`);
    const key = `${exception.path}\u0000${exception.contains.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Vocabulary registry duplicate exception: ${exception.path} :: ${exception.contains}.`);
    seen.add(key);
  }
  return registry;
}

const lineHasLegacy = (line, registry) => registry.legacyTokens.some((token) =>
  new RegExp(escapeRegExp(token), "i").test(line));

const stripAllowedFragments = (line, registry, filePath) => {
  let residual = line;
  for (const exception of registry.exceptions) {
    if (exception.path !== filePath) continue;
    residual = residual.replace(new RegExp(escapeRegExp(exception.contains), "gi"), "");
  }
  return residual;
};

export function validateAddedVocabulary(diffText, registryInput, filePath) {
  const registry = validateVocabularyRegistry(registryInput);
  if (SELF_EXEMPT_PATHS.has(filePath)) return [];
  const violations = [];
  diffText.split(/\r?\n/).forEach((line, index) => {
    if (!line.startsWith("+") || line.startsWith("+++")) return;
    const added = line.slice(1);
    if (!lineHasLegacy(added, registry)) return;
    const residual = stripAllowedFragments(added, registry, filePath);
    if (!lineHasLegacy(residual, registry)) return;
    violations.push({ path: filePath, diffLine: index + 1, text: added });
  });
  return violations;
}

export function validateUnifiedDiff(diffText, registryInput) {
  const registry = validateVocabularyRegistry(registryInput);
  const violations = [];
  let currentPath = null;
  let additions = [];
  const flush = () => {
    if (currentPath && additions.length) {
      violations.push(...validateAddedVocabulary(additions.join("\n"), registry, currentPath));
    }
    additions = [];
  };
  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      flush();
      const marker = line.slice(4).trim();
      currentPath = marker === "/dev/null" ? null : marker.replace(/^b\//, "");
      continue;
    }
    if (currentPath && line.startsWith("+") && !line.startsWith("+++")) additions.push(line);
  }
  flush();
  return violations;
}

const loadRegistry = () => JSON.parse(readFileSync(VOCABULARY_REGISTRY_PATH, "utf8"));

const buildDiff = (baseSha, headSha) => {
  assertNonEmptyString(baseSha, "base SHA");
  assertNonEmptyString(headSha, "head SHA");
  const args = /^0+$/.test(baseSha)
    ? ["show", "--format=", "--unified=0", "--no-ext-diff", headSha, "--"]
    : ["diff", "--unified=0", "--no-ext-diff", `${baseSha}...${headSha}`, "--"];
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
};

export function runVocabularyGuard(baseSha, headSha) {
  const registry = validateVocabularyRegistry(loadRegistry());
  const violations = validateUnifiedDiff(buildDiff(baseSha, headSha), registry);
  if (violations.length) {
    console.error("TRAMA_TERM_01_DOCENTE_OS_VOCABULARY_FAIL");
    violations.forEach((violation) => console.error(`- ${violation.path}: ${violation.text.trim()}`));
    return 1;
  }
  console.log(`TRAMA_TERM_01_DOCENTE_OS_VOCABULARY_PASS ${headSha}`);
  return 0;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const [baseSha, headSha] = process.argv.slice(2);
  try {
    process.exitCode = runVocabularyGuard(baseSha, headSha);
  } catch (error) {
    console.error("TRAMA_TERM_01_DOCENTE_OS_VOCABULARY_ERROR");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
