#!/usr/bin/env python3
"""RB-04/RB-05 fictional-source authorization and Storage-byte reconciliation.

This module has no network/database clients and uses hardcoded synthetic fixtures
ONLY. A PASS does not qualify real Supabase credentials, dumps or restore.
"""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json
import os
import sys

PROJECT = "p7-fictional-project"
SNAPSHOT = "p7-fictional-snapshot-001"
COMPONENTS = (
    "roles", "schema", "data", "auth_users", "storage_metadata",
    "migration_history",
)
EXPECTED_DB_SCOPES = (
    "read:public", "read:private", "read:auth", "read:storage",
    "read:migrations",
)
REAL_CREDENTIALS = (
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_DB_URL",
    "SUPABASE_URL", "SUPABASE_S3_ACCESS_KEY_ID", "SUPABASE_S3_SECRET_ACCESS_KEY",
    "PGPASSWORD", "DATABASE_URL", "P7_REAL_DATABASE_URL",
    "P7_REAL_PGPASSWORD", "P7_REAL_BACKUP_APPROVED", "P7_REAL_AGE_RECIPIENT",
)


class IncompleteRecovery(ValueError):
    pass


def digest(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def receipt(plan: dict) -> str:
    return digest(json.dumps(plan, sort_keys=True, separators=(",", ":")).encode())


def make_fixture() -> tuple[dict, dict, dict]:
    db = {
        component: ("P7-FICTIONAL-" + component + "\n").encode()
        for component in COMPONENTS
    }
    # The SAME object key in DIFFERENT buckets must never collide.
    objects = {
        ("fictional-private", "shared-name.txt"): b"private contents\n",
        ("fictional-secondary", "shared-name.txt"): b"other bucket contents\n",
        ("fictional-private", "zero-bytes.txt"): b"",
        ("fictional-private", "nested/binary.bin"): bytes(range(128)) + b"\x00\xff",
    }
    plan = {
        "contract": "P7-RB04-RB05-FICTIONAL-ONLY-v1",
        "context": "pull_request_synthetic",
        "real_export_authorized": False,
        "source_project": PROJECT,
        "snapshot": SNAPSHOT,
        # Hypothetical scope declaration: NOT a real Supabase role or grant.
        "source_credentials": {
            "database": {
                "project": PROJECT, "role": "fictional_backup_reader",
                "declared_scopes": list(EXPECTED_DB_SCOPES),
                "superuser": False, "can_write": False,
                "location": "protected_runtime",
            },
            "storage": {
                "project": PROJECT, "role": "fictional_storage_reader",
                "declared_scopes": ["read:buckets", "read:objects"],
                "can_write": False, "location": "protected_runtime",
            },
        },
        "database": {
            "project": PROJECT, "snapshot": SNAPSHOT,
            "components": {
                name: {"size": len(data), "sha256": digest(data)}
                for name, data in db.items()
            },
        },
        "storage": {
            "project": PROJECT, "snapshot": SNAPSHOT,
            "objects": [
                {"bucket": bucket, "key": key, "size": len(data), "sha256": digest(data)}
                for (bucket, key), data in sorted(objects.items())
            ],
        },
        # In reality, this requires a separately qualified write-quiescence
        # and snapshot protocol across PostgreSQL and Storage.
        "consistency": {"mode": "fictional_writes_paused", "attested": True},
    }
    return plan, db, objects


def safe_object_key(key: object) -> bool:
    if not isinstance(key, str) or not key or key.startswith("/") or "\\" in key:
        return False
    if "\x00" in key or any(segment in ("", ".", "..") for segment in key.split("/")):
        return False
    return True


def verify(plan: dict, db_bytes: dict, storage_bytes: dict, independent_receipt: str) -> None:
    try:
        if receipt(plan) != independent_receipt:
            raise IncompleteRecovery("manifest receipt does not match")
        if plan["contract"] != "P7-RB04-RB05-FICTIONAL-ONLY-v1":
            raise IncompleteRecovery("unexpected format")
        if plan["context"] != "pull_request_synthetic" or plan["real_export_authorized"] is not False:
            raise IncompleteRecovery("unsafe execution context")
        if plan["source_project"] != PROJECT or plan["snapshot"] != SNAPSHOT:
            raise IncompleteRecovery("unexpected synthetic source or snapshot")
        if plan["consistency"] != {"mode": "fictional_writes_paused", "attested": True}:
            raise IncompleteRecovery("snapshot consistency not attested")

        creds = plan["source_credentials"]
        database_cred, storage_cred = creds["database"], creds["storage"]
        if (
            database_cred["project"] != PROJECT
            or database_cred["role"] != "fictional_backup_reader"
            or database_cred["declared_scopes"] != list(EXPECTED_DB_SCOPES)
            or database_cred["superuser"] is not False
            or database_cred["can_write"] is not False
            or database_cred["location"] != "protected_runtime"
        ):
            raise IncompleteRecovery("database provenance or scope not qualified")
        if (
            storage_cred["project"] != PROJECT
            or storage_cred["role"] != "fictional_storage_reader"
            or storage_cred["declared_scopes"] != ["read:buckets", "read:objects"]
            or storage_cred["can_write"] is not False
            or storage_cred["location"] != "protected_runtime"
        ):
            raise IncompleteRecovery("storage provenance or scope not qualified")

        db = plan["database"]
        if db["project"] != PROJECT or db["snapshot"] != SNAPSHOT:
            raise IncompleteRecovery("database from different source")
        listed = db["components"]
        if set(listed) != set(COMPONENTS) or set(db_bytes) != set(COMPONENTS):
            raise IncompleteRecovery("roles, schema, data, Auth, metadata or migrations missing")
        for component in COMPONENTS:
            blob = db_bytes[component]
            if not isinstance(blob, bytes):
                raise IncompleteRecovery("database component is not bytes")
            if listed[component] != {"size": len(blob), "sha256": digest(blob)}:
                raise IncompleteRecovery("database component hash or size mismatch")

        storage = plan["storage"]
        if storage["project"] != PROJECT or storage["snapshot"] != SNAPSHOT:
            raise IncompleteRecovery("storage from different source or snapshot")
        declared: dict[tuple[str, str], tuple[int, str]] = {}
        for item in storage["objects"]:
            bucket, key = item["bucket"], item["key"]
            if not isinstance(bucket, str) or not bucket or "/" in bucket or not safe_object_key(key):
                raise IncompleteRecovery("invalid Storage object key")
            pair = (bucket, key)
            if pair in declared:
                raise IncompleteRecovery("duplicate Storage object entry")
            declared[pair] = item["size"], item["sha256"]
        if set(declared) != set(storage_bytes):
            raise IncompleteRecovery("Storage byte set is missing or has extras")
        for pair, (size, checksum) in declared.items():
            content = storage_bytes[pair]
            if not isinstance(content, bytes) or len(content) != size or digest(content) != checksum:
                raise IncompleteRecovery("Storage content damaged or mismatched")
    except (KeyError, IndexError, AttributeError, TypeError) as exc:
        raise IncompleteRecovery("invalid manifest or fixture shape") from exc


def rejected(label: str, plan: dict, db: dict, objects: dict, proof: str | None = None) -> None:
    try:
        verify(plan, db, objects, proof if proof is not None else receipt(plan))
    except IncompleteRecovery:
        print(f"RB04_RB05_REJECT_{label}=PASS")
    else:
        raise AssertionError(f"unsafe fixture accepted: {label}")


def main() -> int:
    if sys.argv[1:] != ["--self-test"]:
        print("RB04_RB05_FICTIONAL_ONLY: only --self-test is allowed", file=sys.stderr)
        return 2
    if any(name in os.environ for name in REAL_CREDENTIALS):
        print("RB04_RB05_BLOCKED: credential or real activation variable present", file=sys.stderr)
        return 1
    if os.environ.get("GITHUB_ACTIONS") == "true" and (
        os.environ.get("GITHUB_EVENT_NAME") != "pull_request"
        or os.environ.get("GITHUB_BASE_REF") != "main"
        or os.environ.get("P7_READINESS_SYNTHETIC_ONLY") != "yes"
    ):
        print("RB04_RB05_BLOCKED: CI is not an authorized synthetic PR", file=sys.stderr)
        return 1

    plan, db, objects = make_fixture()
    verify(plan, db, objects, receipt(plan))
    print("RB04_RB05_FICTIONAL_COMPLETE_RECONCILIATION=PASS")
    print("RB04_RB05_TWO_BUCKET_SAME_KEY_AND_EMPTY_OBJECT=PASS")

    cases = [
        ("WRONG_PROJECT", ("source_project",), "different-project"),
        ("DB_PROJECT_MISMATCH", ("database", "project"), "other-project"),
        ("STORAGE_PROJECT_MISMATCH", ("storage", "project"), "other-project"),
        ("STALE_STORAGE_SNAPSHOT", ("storage", "snapshot"), "older-snapshot"),
        ("MISSING_SCOPE_AUTH", ("source_credentials", "database", "declared_scopes"),
            ["read:public", "read:private", "read:storage", "read:migrations"]),
        ("MISSING_STORAGE_OBJECT_READ", ("source_credentials", "storage", "declared_scopes"),
            ["read:buckets"]),
        ("EXCESSIVE_SUPERUSER", ("source_credentials", "database", "superuser"), True),
        ("DATABASE_WRITABLE", ("source_credentials", "database", "can_write"), True),
        ("STORAGE_WRITABLE", ("source_credentials", "storage", "can_write"), True),
        ("SECRET_LOCATION_REPOSITORY", ("source_credentials", "storage", "location"), "git_repository"),
        ("REAL_EXPORT_FLAG", ("real_export_authorized",), True),
        ("UNATTESTED_CONSISTENCY", ("consistency", "attested"), False),
    ]
    for label, path, value in cases:
        copy = deepcopy(plan)
        cursor = copy
        for key in path[:-1]:
            cursor = cursor[key]
        cursor[path[-1]] = value
        rejected(label, copy, db, objects)

    for part in ("auth_users", "storage_metadata", "migration_history", "roles"):
        missing = dict(db)
        del missing[part]
        rejected("MISSING_DB_" + part.upper(), plan, missing, objects)

    altered_db = dict(db)
    altered_db["auth_users"] = b"corrupted synthetic auth"
    rejected("CORRUPT_AUTH", plan, altered_db, objects)

    object_id = ("fictional-private", "shared-name.txt")
    missing_obj = dict(objects)
    del missing_obj[object_id]
    rejected("MISSING_STORAGE_BYTES", plan, db, missing_obj)

    altered_obj = dict(objects)
    altered_obj[object_id] = b"wrong bytes"
    rejected("STORAGE_BYTES_CHANGED", plan, db, altered_obj)

    collision = dict(objects)
    a, b = ("fictional-private", "shared-name.txt"), ("fictional-secondary", "shared-name.txt")
    collision[a], collision[b] = collision[b], collision[a]
    rejected("CROSS_BUCKET_COLLISION", plan, db, collision)

    added = dict(objects)
    added[("fictional-private", "unlisted.txt")] = b"unlisted"
    rejected("UNLISTED_STORAGE_BYTES", plan, db, added)

    duplicate = deepcopy(plan)
    duplicate["storage"]["objects"].append(deepcopy(duplicate["storage"]["objects"][0]))
    rejected("DUPLICATE_STORAGE_KEY", duplicate, db, objects)

    traversal = deepcopy(plan)
    traversal["storage"]["objects"][0]["key"] = "../outside.bin"
    rejected("PATH_TRAVERSAL", traversal, db, objects)

    changed = deepcopy(plan)
    changed["database"]["components"]["roles"]["size"] += 1
    rejected("UNTRUSTED_MANIFEST_RECEIPT", changed, db, objects, receipt(plan))
    print("RB04_RB05_FICTIONAL_CONTRACT_PASS / REAL_EXPORT_AND_RESTORE_NOT_QUALIFIED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, IncompleteRecovery) as exc:
        print(f"RB04_RB05_FICTIONAL_CONTRACT_FAIL: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
