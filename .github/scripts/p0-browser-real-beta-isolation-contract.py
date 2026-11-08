#!/usr/bin/env python3
"""P0 / #796: synthetic-only contract for browser workflows using live Beta.

Reads only checked-in YAML text, extracts the actual P0 shell step, runs
negative/positive tests with fictional endpoints. Never contacts Supabase.
"""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

WORKFLOWS = (
    "experience-acceptance.yml",
    "browser-certification-orchestrator.yml",
    "mfa-browser-e2e.yml",
    "p6-performance.yml",
    "wcag22-aa-assurance.yml",
    "x3-e2e.yml",
    "x4-planner-e2e.yml",
    "x5-authoring-e2e.yml",
    "x5b-export-e2e.yml",
    "k1-knowledge-e2e.yml",
    "h1-human-task-e2e.yml",
)
MARKER = "- name: P0 - refuse non-isolated live services in automated certification"
ROOT = Path(__file__).resolve().parents[2]


def shell_guard(lines: list[str], at: int) -> str:
    line = lines[at]
    margin = len(line) - len(line.lstrip(" "))
    indent = " " * margin
    if line.strip() != MARKER:
        raise AssertionError("incorrect guard marker")
    if lines[at + 1] != indent + "  shell: bash":
        raise AssertionError("guard must explicitly use bash")
    if lines[at + 2] != indent + "  run: |":
        raise AssertionError("guard must run a literal shell block")
    prefix = indent + "    "
    body: list[str] = []
    for line in lines[at + 3 :]:
        if line.startswith(indent + "- "):
            break
        if line.strip() and not line.startswith(prefix):
            break
        body.append(line[len(prefix) :] if line.startswith(prefix) else "")
    script = "\n".join(body).strip()
    for required in (
        "set -euo pipefail",
        "reject_remote",
        "NEXT_PUBLIC_SUPABASE_URL",
        "E2E_BASE_URL",
        "P0_BROWSER_REAL_BETA_ISOLATION=PASS_LOCAL_ONLY",
    ):
        if required not in script:
            raise AssertionError("missing guard invariant: " + required)
    return script


def check_file(path: Path) -> tuple[int, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    job_sections = 0
    guards = []
    for i, line in enumerate(lines):
        if line.strip() != "steps:" or not line.startswith("    "):
            continue
        job_sections += 1
        space = len(line) - len(line.lstrip(" "))
        next_line = next(
            (item for item in lines[i + 1 :] if item.strip()),
            "",
        )
        if next_line != (" " * (space + 2) + MARKER):
            raise AssertionError(f"{path.name}: P0 must be FIRST job step")
        guard_index = i + 1
        while guard_index < len(lines) and not lines[guard_index].strip():
            guard_index += 1
        guards.append(shell_guard(lines, guard_index))
    if not job_sections or job_sections != len(guards):
        raise AssertionError(f"{path.name}: missing job guard")
    if len(set(guards)) != 1:
        raise AssertionError(f"{path.name}: guard drift across jobs")
    if "gnshgapmwyjamhmlikeg.supabase.co" not in "\n".join(lines) and \
            "docente-os-2026-27-beta.onrender.com" not in "\n".join(lines):
        raise AssertionError(f"{path.name}: expected historical real Beta binding not found")
    return job_sections, guards[0]


def assert_command(script: str, env: dict[str, str], expected: int) -> None:
    safe_env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin")}
    safe_env.update(env)
    run = subprocess.run(
        ["bash", "-c", script],
        env=safe_env, capture_output=True, text=True, timeout=5, check=False,
    )
    if (run.returncode == 0) != (expected == 0):
        raise AssertionError("guard accepted or rejected unexpected fictional case")
    if any(value in (run.stdout + run.stderr) for value in env.values()):
        raise AssertionError("guard leaked an input environment value")


def main() -> int:
    scripts: set[str] = set()
    total_jobs = 0
    for name in WORKFLOWS:
        jobs, script = check_file(ROOT / ".github/workflows" / name)
        total_jobs += jobs
        scripts.add(script)
    if len(scripts) != 1:
        raise AssertionError("P0 guard body drift across workflow files")
    script = next(iter(scripts))
    assert_command(script, {}, 0)
    assert_command(script, {
        "NEXT_PUBLIC_SUPABASE_URL": "http://127.0.0.1:54321",
        "E2E_BASE_URL": "http://127.0.0.1:3000",
    }, 0)
    assert_command(script, {
        "NEXT_PUBLIC_SUPABASE_URL": "https://fictional-real-supabase.example",
        "E2E_BASE_URL": "http://127.0.0.1:3000",
    }, 1)
    assert_command(script, {
        "NEXT_PUBLIC_SUPABASE_URL": "http://127.0.0.1:54321",
        "E2E_BASE_URL": "https://fictional-real-preview.example",
    }, 1)
    assert_command(script, {
        "NEXT_PUBLIC_SUPABASE_URL": "http://localhost.evil.example:54321",
    }, 1)
    print(f"P0_BROWSER_REAL_BETA_ISOLATION_CONTRACT=PASS workflows={len(WORKFLOWS)} jobs={total_jobs}")
    print("P0_REAL_BETA_BROWSER_TESTS=HOLD_UNTIL_ISOLATED_DATA_SOURCE")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError, subprocess.TimeoutExpired) as e:
        print("P0_BROWSER_REAL_BETA_ISOLATION_CONTRACT=FAIL: " + type(e).__name__, file=sys.stderr)
        raise SystemExit(1)
