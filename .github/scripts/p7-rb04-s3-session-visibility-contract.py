#!/usr/bin/env python3
"""Synthetic-only RB-04 contract for an MFA-bound Supabase Storage listing.

No network or database clients. No live mode. This models the observed
RLS predicates but DOES NOT prove the actual PostgreSQL/S3 authorization.
Never print object keys, identities, tokens or per-file metadata.
"""
from __future__ import annotations

from dataclasses import dataclass
import os
import sys

SOURCE = "p7-fictional-project"
BUCKET = "knowledge-assets"
SAFE_OPERATION = "ListObjectsV2"
FORBIDDEN_ENV = (
    "SUPABASE_ACCESS_TOKEN", "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL", "SUPABASE_S3_ACCESS_KEY_ID",
    "SUPABASE_S3_SECRET_ACCESS_KEY", "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "DATABASE_URL",
    "P7_REAL_DATABASE_URL", "P7_REAL_PGPASSWORD",
    "P7_REAL_BACKUP_APPROVED", "P7_REAL_AGE_RECIPIENT",
    "P7_RB04_USER_JWT",
)


class Hold(ValueError):
    """No authorized or sufficient evidence for RB-04 PASS."""


@dataclass(frozen=True)
class FictionalSession:
    project: str
    role: str
    aal: str
    memberships: frozenset[str]


@dataclass(frozen=True)
class FictionalObject:
    bucket: str
    key: str
    size: int


def fixtures() -> list[FictionalObject]:
    # Entirely imaginary identifiers, including identical basenames.
    return [
        FictionalObject(BUCKET, f"space-a/file-{i:02d}.pdf", 100 + i)
        for i in range(1, 5)
    ] + [
        FictionalObject(BUCKET, f"space-b/file-{i:02d}.txt", 200 + i)
        for i in range(1, 4)
    ] + [
        FictionalObject(BUCKET, "space-c/file-01.txt", 301),
        FictionalObject(BUCKET, "space-c/file-02.txt", 302),
    ]


def preflight(session: FictionalSession, operation: str) -> None:
    if operation != SAFE_OPERATION:
        raise Hold("operation_not_read_only_listing")
    if session.project != SOURCE or session.role != "authenticated":
        raise Hold("source_or_role_not_qualified")
    if session.aal != "aal2":
        raise Hold("mfa_aal2_required")


def visible_objects(
    session: FictionalSession, operation: str, objects: list[FictionalObject]
) -> list[FictionalObject]:
    preflight(session, operation)
    # Mimics the observed SELECT-permissive membership predicate
    # AND the ALL-restrictive aal2 predicate. Not a live RLS execution.
    return [
        obj for obj in objects
        if obj.bucket == BUCKET
        and obj.key.split("/", 1)[0] in session.memberships
    ]


def verify_pages(
    pages: list[dict], *, expected_count: int, expected_size: int
) -> dict[str, str | int]:
    """Check paginated, redacted listing against independent aggregate only.

    Even with a PASS here, equal counts/sizes do not prove the same object
    identities, real download rights, integrity or recoverability.
    """
    if expected_count < 1 or expected_size < 0 or not pages:
        raise Hold("invalid_independent_aggregate")
    seen: set[str] = set()
    count = 0
    total_size = 0
    for index, page in enumerate(pages):
        entries = page.get("Contents")
        if not isinstance(entries, list):
            raise Hold("invalid_listing")
        truncated = page.get("IsTruncated")
        if type(truncated) is not bool:
            raise Hold("incomplete_pagination")
        if index < len(pages) - 1 and not truncated:
            raise Hold("unexpected_page_boundary")
        if index == len(pages) - 1 and truncated:
            raise Hold("incomplete_pagination")
        for obj in entries:
            key, size = obj.get("Key"), obj.get("Size")
            if not isinstance(key, str) or not key or key in seen:
                raise Hold("duplicate_or_invalid_object")
            if type(size) is not int or size < 0:
                raise Hold("invalid_size")
            seen.add(key)
            count += 1
            total_size += size
    if count != expected_count or total_size != expected_size:
        raise Hold("aggregate_mismatch")
    return {"status": "SYNTHETIC_AGGREGATE_MATCH_ONLY", "count": count}


def pages_for(objects: list[FictionalObject], page_size: int = 3) -> list[dict]:
    return [
        {
            "Contents": [
                {"Key": item.key, "Size": item.size}
                for item in objects[i:i + page_size]
            ],
            "IsTruncated": i + page_size < len(objects),
        }
        for i in range(0, len(objects), page_size)
    ]


def rejected(label: str, fn) -> None:
    try:
        fn()
    except Hold:
        print(f"RB04_SYNTHETIC_REJECT_{label}=PASS")
    else:
        raise AssertionError(f"unsafe fictional case accepted: {label}")


def self_test() -> None:
    objects = fixtures()
    assert len(objects) == 9
    all_spaces = frozenset({"space-a", "space-b", "space-c"})
    complete = FictionalSession(SOURCE, "authenticated", "aal2", all_spaces)
    partial = FictionalSession(SOURCE, "authenticated", "aal2", frozenset({"space-a"}))
    low_mfa = FictionalSession(SOURCE, "authenticated", "aal1", all_spaces)
    stranger = FictionalSession(SOURCE, "authenticated", "aal2", frozenset())
    wrong = FictionalSession("other-fictional-project", "authenticated", "aal2", all_spaces)

    visible = visible_objects(complete, SAFE_OPERATION, objects)
    assert len(visible) == 9
    expected_size = sum(obj.size for obj in objects)
    result = verify_pages(
        pages_for(visible), expected_count=9, expected_size=expected_size
    )
    assert result == {"status": "SYNTHETIC_AGGREGATE_MATCH_ONLY", "count": 9}
    print("RB04_SYNTHETIC_AAL2_MEMBER_NINE_OBJECTS=PASS")
    print("RB04_SYNTHETIC_PAGINATION_AND_TOTAL_SIZE=PASS")

    rejected("AAL1", lambda: visible_objects(low_mfa, SAFE_OPERATION, objects))
    rejected("PROJECT", lambda: visible_objects(wrong, SAFE_OPERATION, objects))
    rejected("ANONYMOUS", lambda: visible_objects(
        FictionalSession(SOURCE, "anon", "aal2", all_spaces), SAFE_OPERATION, objects
    ))
    for operation in ("GetObject", "HeadObject", "PutObject", "DeleteObject", "ListBuckets"):
        rejected("OPERATION_" + operation.upper(), lambda op=operation:
                 visible_objects(complete, op, objects))

    rejected("NO_MEMBERSHIP", lambda: verify_pages(
        pages_for(visible_objects(stranger, SAFE_OPERATION, objects)),
        expected_count=9, expected_size=expected_size
    ))
    rejected("PARTIAL_MEMBERSHIP", lambda: verify_pages(
        pages_for(visible_objects(partial, SAFE_OPERATION, objects)),
        expected_count=9, expected_size=expected_size
    ))
    rejected("MISSING_PAGE", lambda: verify_pages(
        pages_for(visible)[:-1], expected_count=9, expected_size=expected_size
    ))
    rejected("ALTERED_SIZE", lambda: verify_pages(
        pages_for(visible), expected_count=9, expected_size=expected_size + 1
    ))
    duplicate = pages_for(visible)
    duplicate[1]["Contents"][0]["Key"] = duplicate[0]["Contents"][0]["Key"]
    rejected("DUPLICATE_KEY", lambda: verify_pages(
        duplicate, expected_count=9, expected_size=expected_size
    ))
    assert "file-" not in repr(result) and "space-" not in repr(result)
    print("RB04_SYNTHETIC_AGGREGATE_ONLY_NO_CONTENT_OR_IDENTITIES=PASS")
    print("RB04_REAL_SESSION_NOT_TESTED_RB02_AND_RB04_REMAIN_HOLD")


if __name__ == "__main__":
    if sys.argv[1:] != ["--self-test"]:
        raise SystemExit("RB04_SYNTHETIC_ONLY: use --self-test")
    if any(name in os.environ for name in FORBIDDEN_ENV):
        raise SystemExit("RB04_SYNTHETIC_BLOCKED: real credential variable present")
    if os.getenv("GITHUB_ACTIONS") == "true" and (
        os.getenv("GITHUB_EVENT_NAME") != "pull_request"
        or os.getenv("GITHUB_BASE_REF") != "main"
        or os.getenv("P7_READINESS_SYNTHETIC_ONLY") != "yes"
    ):
        raise SystemExit("RB04_SYNTHETIC_BLOCKED: unauthorized CI context")
    self_test()
