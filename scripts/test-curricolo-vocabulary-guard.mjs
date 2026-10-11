import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VOCABULARY_REGISTRY_PATH,
  validateAddedVocabulary,
  validateUnifiedDiff,
  validateVocabularyRegistry,
} from "./validate-curricolo-vocabulary.mjs";

const registry = {
  schemaVersion: 1,
  canonicalTerm: "curricolo",
  baselineRef: "a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2",
  legacyTokens: ["curriculum", "curricular"],
  exceptions: [],
};

assert.equal(
  validateAddedVocabulary("+Curriculum operativo", registry, "product/src/current.ts").length,
  1,
  "new curriculum vocabulary must be rejected case-insensitively",
);
assert.equal(
  validateAddedVocabulary("+curricular authority", registry, "docs/current.md").length,
  1,
  "new curricular vocabulary must also be rejected",
);
assert.equal(
  validateAddedVocabulary("-old curriculum wording", registry, "docs/current.md").length,
  0,
  "deletions must always be allowed",
);
assert.equal(
  validateAddedVocabulary("+curricolo di istituto", registry, "product/src/current.ts").length,
  0,
  "canonical vocabulary must pass",
);

const compatibilityRegistry = {
  ...registry,
  exceptions: [{
    path: "src/contracts/legacy.ts",
    contains: "curriculumVersionRef",
    reason: "Published v1 wire field must remain stable until a separately governed contract transition.",
  }],
};
assert.equal(
  validateAddedVocabulary("+const ref = payload.curriculumVersionRef;", compatibilityRegistry, "src/contracts/legacy.ts").length,
  0,
  "an exact path + fragment compatibility exception must pass",
);
assert.equal(
  validateAddedVocabulary("+const ref = payload.curriculumVersionRef;", compatibilityRegistry, "src/other.ts").length,
  1,
  "an exception must not leak to another path",
);
assert.throws(
  () => validateVocabularyRegistry({
    ...registry,
    exceptions: [{ path: "src/contracts/legacy.ts", contains: "curriculumVersionRef", reason: "" }],
  }),
  /reason/,
  "every exception must carry a non-empty reason",
);

const unified = [
  "diff --git a/docs/a.md b/docs/a.md",
  "--- a/docs/a.md",
  "+++ b/docs/a.md",
  "@@ -0,0 +1 @@",
  "+curricolo di istituto",
  "diff --git a/docs/b.md b/docs/b.md",
  "--- a/docs/b.md",
  "+++ b/docs/b.md",
  "@@ -0,0 +1 @@",
  "+national curricular wording",
].join("\n");
const violations = validateUnifiedDiff(unified, registry);
assert.equal(violations.length, 1);
assert.equal(violations[0].path, "docs/b.md");

assert.equal(
  validateAddedVocabulary(
    "+\"legacyTokens\": [\"curriculum\", \"curricular\"]",
    registry,
    VOCABULARY_REGISTRY_PATH,
  ).length,
  0,
  "the machine-readable registry must be able to declare the vocabulary it governs",
);

const workflow = fs.readFileSync(".github/workflows/trama-term-01-curricolo-vocabulary.yml", "utf8");
assert.match(workflow, /pull_request:/, "guard must run on pull requests");
assert.match(workflow, /push:/, "guard must run on pushes");
assert.match(workflow, /develop/, "push guard must cover develop");
assert.match(workflow, /main/, "push guard must cover main");
assert.match(workflow, /fetch-depth:\s*0/, "guard needs complete git history");
assert.match(workflow, /github\.event\.pull_request\.base\.sha/, "PR guard must use the PR base SHA");
assert.match(workflow, /github\.event\.pull_request\.head\.sha/, "PR guard must use the PR head SHA");
assert.match(workflow, /github\.event\.before/, "push guard must use the pre-push SHA");
assert.match(workflow, /github\.sha/, "push guard must use the pushed head SHA");

console.log("TRAMA_TERM_01_DOCENTE_OS_GUARD_TEST_PASS");
