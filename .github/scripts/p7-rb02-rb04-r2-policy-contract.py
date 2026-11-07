#!/usr/bin/env python3
"""P7 RB-02/RB-04: R2 non-secret policy contract, synthetic fixtures ONLY.

Does not connect to Cloudflare, examine an actual token, or attest privacy approval.
All fixture approvals are invented for negative-test coverage, never live evidence.
"""
from __future__ import annotations

from copy import deepcopy
import os
from pathlib import Path
import sys

BUCKET = "docente-os-backup-eu"
PRODUCTION_PREFIX = "production/"
REHEARSAL_PREFIX = "rehearsal/"
EXPECTED_JURISDICTION = "eu"
REAL_CREDENTIALS = (
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_R2_TOKEN",
    "P7_REAL_DATABASE_URL", "P7_REAL_PGPASSWORD", "P7_REAL_BACKUP_APPROVED",
    "SUPABASE_SERVICE_ROLE_KEY", "PGPASSWORD",
)


class PolicyRejected(ValueError):
    pass


def check(expected: dict) -> None:
    """Validate a NON-LIVE, fictional policy claim. Never call to qualify reality."""
    if expected.get("fixture_type") != "P7_R2_SYNTHETIC_POLICY_ONLY":
        raise PolicyRejected("not an explicit synthetic fixture")
    if expected.get("bucket") != BUCKET:
        raise PolicyRejected("bucket mismatch")
    if expected.get("jurisdiction") != EXPECTED_JURISDICTION:
        raise PolicyRejected("EU jurisdiction missing")
    if expected.get("public_access") is not False:
        raise PolicyRejected("public URL/domain status unacceptable")

    lock = expected.get("bucket_lock", {})
    if (lock.get("enabled") is not True
            or lock.get("prefix") != PRODUCTION_PREFIX
            or lock.get("days") != 90):
        raise PolicyRejected("required 90-day lock not attested")

    lifecycle = expected.get("lifecycle", {})
    # A 91-day illustrative TTL gives a one-day margin after a 90-day lock.
    # There is NO decision to activate this rule in Cloudflare.
    if (lifecycle.get("enabled") is not True
            or lifecycle.get("prefix") != PRODUCTION_PREFIX
            or not isinstance(lifecycle.get("days"), int)
            or isinstance(lifecycle["days"], bool)
            or lifecycle["days"] <= lock["days"]):
        raise PolicyRejected("expiration not strictly later than lock")

    cred = expected.get("object_access", {})
    # R2 S3 object tokens can be restricted by bucket; no asserted prefix-level ACL.
    if (cred.get("permission") != "Object Read & Write"
            or cred.get("buckets") != [BUCKET]
            or cred.get("account_admin") is not False
            or cred.get("secret_in_repo") is not False):
        raise PolicyRejected("R2 access not bucket-scoped object-only")

    source = expected.get("rehearsal_isolation", {})
    if (source.get("prefix") != REHEARSAL_PREFIX
            or source.get("allow_production_export") is not False
            or source.get("real_data_in_pr") is not False):
        raise PolicyRejected("synthetic/reality isolation missing")

    authorization = expected.get("privacy_review", {})
    if (authorization.get("decision_recorded") is not True
            or authorization.get("retention_approved") is not True
            or authorization.get("storage_objects_approved") is not True):
        raise PolicyRejected("human privacy decision missing")


def expect_rejected(claims: dict, marker: str) -> None:
    try:
        check(claims)
    except PolicyRejected:
        print(f"RB02_RB04_REJECT_{marker}=PASS")
    else:
        raise AssertionError(f"unsafe scenario accepted: {marker}")


def main() -> int:
    if sys.argv[1:] != ["--self-test"]:
        print("RB02_RB04_SYNTHETIC_ONLY: use --self-test", file=sys.stderr)
        return 2
    if any(key in os.environ for key in REAL_CREDENTIALS):
        print("RB02_RB04_BLOCKED: unexpected secret/activation flag", file=sys.stderr)
        return 1
    if os.environ.get("GITHUB_ACTIONS") == "true" and (
        os.environ.get("GITHUB_EVENT_NAME") != "pull_request"
        or os.environ.get("GITHUB_BASE_REF") != "main"
        or os.environ.get("P7_READINESS_SYNTHETIC_ONLY") != "yes"
    ):
        print("RB02_RB04_BLOCKED: untrusted CI context", file=sys.stderr)
        return 1

    # All values in this example are imaginary, including the human approvals.
    example = {
        "fixture_type": "P7_R2_SYNTHETIC_POLICY_ONLY",
        "bucket": BUCKET,
        "jurisdiction": EXPECTED_JURISDICTION,
        "public_access": False,
        "bucket_lock": {"enabled": True, "prefix": PRODUCTION_PREFIX, "days": 90},
        "lifecycle": {"enabled": True, "prefix": PRODUCTION_PREFIX, "days": 91},
        "object_access": {
            "permission": "Object Read & Write",
            "buckets": [BUCKET],
            "account_admin": False,
            "secret_in_repo": False,
        },
        "rehearsal_isolation": {
            "prefix": REHEARSAL_PREFIX,
            "allow_production_export": False,
            "real_data_in_pr": False,
        },
        "privacy_review": {
            "decision_recorded": True,
            "retention_approved": True,
            "storage_objects_approved": True,
        },
    }

    check(example)
    print("RB02_RB04_SYNTHETIC_VALID_POLICY=PASS")

    cases = [
        ("MISSING_LIFECYCLE", ("lifecycle", "enabled"), False),
        ("EARLY_LIFECYCLE", ("lifecycle", "days"), 30),
        ("EXACT_LOCK_EXPIRATION", ("lifecycle", "days"), 90),
        ("GLOBAL_LIFECYCLE", ("lifecycle", "prefix"), ""),
        ("DISABLED_LOCK", ("bucket_lock", "enabled"), False),
        ("WRONG_LOCK_PREFIX", ("bucket_lock", "prefix"), REHEARSAL_PREFIX),
        ("WRONG_REGION", ("jurisdiction",), "default"),
        ("PUBLIC_BUCKET", ("public_access",), True),
        ("WRONG_BUCKET", ("bucket",), "other-bucket"),
        ("ADMIN_TOKEN", ("object_access", "permission"), "Admin Read & Write"),
        ("ALL_BUCKETS", ("object_access", "buckets"), ["*"]),
        ("SECRET_IN_REPO", ("object_access", "secret_in_repo"), True),
        ("REHEARSAL_PRODUCTION", ("rehearsal_isolation", "prefix"), PRODUCTION_PREFIX),
        ("PR_REAL_EXPORT", ("rehearsal_isolation", "real_data_in_pr"), True),
        ("NO_PRIVACY_DECISION", ("privacy_review", "decision_recorded"), False),
        ("NO_RETENTION_APPROVAL", ("privacy_review", "retention_approved"), False),
        ("NO_STORAGE_APPROVAL", ("privacy_review", "storage_objects_approved"), False),
    ]
    for label, keys, value in cases:
        altered = deepcopy(example)
        target = altered
        for key in keys[:-1]:
            target = target[key]
        target[keys[-1]] = value
        expect_rejected(altered, label)

    # Existing main-branch synthetic R2 script must remain isolated.
    root = Path(__file__).resolve().parents[2]
    source = (root / ".github/scripts/p7-db-r2-main-synthetic-rehearsal.sh").read_text()
    workflow = (root / ".github/workflows/p7-db-r2-main-certification.yml").read_text()
    if 'R2_KEY="rehearsal/' not in source or 'test "$R2_BACKUP_BUCKET" = "docente-os-backup-eu"' not in source:
        raise AssertionError("main rehearsal has no hardcoded safe prefix/bucket")
    if "refs/heads/main" not in workflow or "workflow_dispatch" not in workflow:
        raise AssertionError("main rehearsal execution restrictions missing")
    print("RB02_RB04_MAIN_REHEARSAL_STATIC_BOUNDARY=PASS")
    print("RB02_RB04_POLICY_CONTRACT_PASS / ACTUAL_R2_AND_PRIVACY_NOT_ATTESTED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, PolicyRejected, OSError) as exc:
        print(f"RB02_RB04_POLICY_CONTRACT_FAIL: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
