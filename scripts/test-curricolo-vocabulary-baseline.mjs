import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOKEN = /curriculum/i;
const TEXT_EXTENSIONS = new Set([
  ".css", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".sql",
  ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);
const EXCLUDED_DIRS = new Set([".git", ".next", "coverage", "dist", "node_modules", "out"]);
const SELF = "scripts/test-curricolo-vocabulary-baseline.mjs";

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
      continue;
    }
    const relative = path.relative(ROOT, absolute).split(path.sep).join("/");
    if (relative === SELF) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    files.push({ absolute, relative });
  }
  return files;
}

const findings = [];
for (const file of walk(ROOT)) {
  let content;
  try {
    content = fs.readFileSync(file.absolute, "utf8");
  } catch {
    continue;
  }
  content.split(/\r?\n/).forEach((line, index) => {
    if (TOKEN.test(line)) {
      findings.push({ path: file.relative, line: index + 1, text: line.trim() });
    }
  });
}

if (findings.length) {
  console.error(`TRAMA_TERM_01_DOCENTE_OS_BASELINE_RED ${findings.length}`);
  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line}: ${finding.text}`);
  }
  process.exit(1);
}

console.log("TRAMA_TERM_01_DOCENTE_OS_BASELINE_GREEN");
