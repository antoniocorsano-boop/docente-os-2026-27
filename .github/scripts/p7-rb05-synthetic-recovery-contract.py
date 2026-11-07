#!/usr/bin/env python3
"""P7/RB-05: synthetic-only recovery inventory, ciphertext and failure-mode contract.

Uses only hardcoded fictional data; never retrieves Supabase or R2 contents.
A passing result is NOT a real Supabase Storage backup/restore qualification.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

EXPECTED_SCOPES = ("public", "private", "auth", "storage", "supabase_migrations")
SYNTHETIC_FILES = {
    "database/public.fixture": b"P7-SYNTHETIC-PUBLIC-v1\n",
    "database/private.fixture": b"P7-SYNTHETIC-PRIVATE-v1\n",
    "database/auth.fixture": b"P7-SYNTHETIC-AUTH-v1\n",
    "database/storage-metadata.fixture": b"P7-SYNTHETIC-STORAGE-METADATA-v1\n",
    "database/migrations.fixture": b"P7-SYNTHETIC-MIGRATIONS-v1\n",
    "storage/objects/fixture-note.txt": b"Synthetic attachment only.\n",
    "storage/objects/fixture-binary.bin": bytes(range(256)) + b"\x00\xffP7-SYNTHETIC\n",
}
STORAGE_PATHS = tuple(sorted(p for p in SYNTHETIC_FILES if p.startswith("storage/objects/")))
MANIFEST_FILE = "manifest.json"
REAL_CREDENTIAL_ENV = (
    "P7_REAL_DATABASE_URL", "P7_REAL_PGPASSWORD", "P7_REAL_AGE_RECIPIENT",
    "P7_REAL_BACKUP_APPROVED", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
    "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_DB_URL", "PGPASSWORD",
)


class IncompleteBackup(ValueError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def manifest_for(files: dict[str, bytes]) -> bytes:
    manifest = {
        "format": "P7-RB05-SYNTHETIC-v1",
        "data_scopes": list(EXPECTED_SCOPES),
        "storage_object_paths": list(STORAGE_PATHS),
        "files": {
            name: {"size": len(value), "sha256": sha256(value)}
            for name, value in sorted(files.items())
        },
    }
    return (json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n").encode()


def package(files: dict[str, bytes], manifest_bytes: bytes) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, value in sorted(files.items()):
            archive.writestr(name, value)
        archive.writestr(MANIFEST_FILE, manifest_bytes)
    return buffer.getvalue()


def verify_archive(blob: bytes, expected_manifest_digest: str) -> None:
    try:
        with zipfile.ZipFile(io.BytesIO(blob)) as archive:
            members = archive.namelist()
            if len(set(members)) != len(members):
                raise IncompleteBackup("duplicate archive entries")
            if set(members) != set(SYNTHETIC_FILES) | {MANIFEST_FILE}:
                raise IncompleteBackup("missing or unexpected component")
            manifest_bytes = archive.read(MANIFEST_FILE)
            if sha256(manifest_bytes) != expected_manifest_digest:
                raise IncompleteBackup("manifest hash differs from independent receipt")
            manifest = json.loads(manifest_bytes)
            if manifest.get("format") != "P7-RB05-SYNTHETIC-v1":
                raise IncompleteBackup("unexpected contract")
            if manifest.get("data_scopes") != list(EXPECTED_SCOPES):
                raise IncompleteBackup("incomplete data scopes")
            if manifest.get("storage_object_paths") != list(STORAGE_PATHS):
                raise IncompleteBackup("missing storage inventory")
            entries = manifest.get("files")
            if not isinstance(entries, dict) or set(entries) != set(SYNTHETIC_FILES):
                raise IncompleteBackup("missing or unexpected manifest entry")
            for name in sorted(SYNTHETIC_FILES):
                raw = archive.read(name)
                if entries[name] != {"size": len(raw), "sha256": sha256(raw)}:
                    raise IncompleteBackup("component byte length/digest mismatch")
                if raw != SYNTHETIC_FILES[name]:
                    raise IncompleteBackup("restored bytes do not match fixture")
    except (zipfile.BadZipFile, KeyError, UnicodeError, json.JSONDecodeError, TypeError) as e:
        raise IncompleteBackup("unreadable archive/manifest") from e


def expect_reject(blob: bytes, receipt_digest: str, case: str) -> None:
    try:
        verify_archive(blob, receipt_digest)
    except IncompleteBackup:
        print(f"RB05_REJECT_{case}=PASS")
    else:
        raise AssertionError(f"invalid {case} package accepted")


def rehearse_age(blob: bytes) -> bytes:
    with tempfile.TemporaryDirectory(prefix="p7-rb05-synthetic-") as directory:
        key = Path(directory, "ephemeral.agekey")
        subprocess.run(["age-keygen", "-o", str(key)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        recipient = subprocess.run(["age-keygen", "-y", str(key)],
                                   check=True, capture_output=True, text=True).stdout.strip()
        if not recipient.startswith("age1"):
            raise RuntimeError("invalid age recipient")
        ciphertext = subprocess.run(["age", "-r", recipient], input=blob,
                                    check=True, capture_output=True).stdout
        if b"P7-SYNTHETIC-" in ciphertext:
            raise AssertionError("plaintext marker leaked to ciphertext")
        wrong_key = Path(directory, "unrelated.agekey")
        subprocess.run(["age-keygen", "-o", str(wrong_key)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        rejected = subprocess.run(["age", "-d", "-i", str(wrong_key)],
                                  input=ciphertext, capture_output=True)
        if rejected.returncode == 0:
            raise AssertionError("wrong age identity accepted")
        recovered = subprocess.run(["age", "-d", "-i", str(key)],
                                   input=ciphertext, check=True, capture_output=True).stdout
        if recovered != blob:
            raise AssertionError("ciphertext recovered incorrectly")
        return recovered


def main() -> int:
    if sys.argv[1:] != ["--self-test"]:
        print("RB05_SYNTHETIC_ONLY: use --self-test", file=sys.stderr)
        return 2
    if any(os.environ.get(name) is not None for name in REAL_CREDENTIAL_ENV):
        print("RB05_BLOCKED: unexpected real-export credential", file=sys.stderr)
        return 1
    if os.environ.get("GITHUB_ACTIONS") == "true" and (
        os.environ.get("GITHUB_EVENT_NAME") != "pull_request"
        or os.environ.get("GITHUB_BASE_REF") != "main"
        or os.environ.get("P7_READINESS_SYNTHETIC_ONLY") != "yes"
    ):
        print("RB05_BLOCKED: CI must be a synthetic-only pull_request to main", file=sys.stderr)
        return 1

    original_manifest = manifest_for(SYNTHETIC_FILES)
    receipt = sha256(original_manifest)
    original = package(SYNTHETIC_FILES, original_manifest)
    verify_archive(original, receipt)
    print("RB05_SYNTHETIC_ALL_COMPONENTS=PASS")

    without_attachment = {n: b for n, b in SYNTHETIC_FILES.items() if n != STORAGE_PATHS[0]}
    expect_reject(package(without_attachment, original_manifest), receipt, "MISSING_STORAGE_BYTES")

    modified = dict(SYNTHETIC_FILES)
    modified[STORAGE_PATHS[0]] = b"altered synthetic attachment"
    expect_reject(package(modified, original_manifest), receipt, "TAMPERED_STORAGE_BYTES")

    no_auth = json.loads(original_manifest)
    no_auth["data_scopes"].remove("auth")
    changed_manifest = (json.dumps(no_auth, sort_keys=True, separators=(",", ":")) + "\n").encode()
    expect_reject(package(SYNTHETIC_FILES, changed_manifest), receipt, "UNTRUSTED_MANIFEST")
    expect_reject(package(SYNTHETIC_FILES, changed_manifest), sha256(changed_manifest), "MISSING_AUTH_SCOPE")

    if os.environ.get("GITHUB_ACTIONS") == "true":
        recovered = rehearse_age(original)
        verify_archive(recovered, receipt)
        print("RB05_SYNTHETIC_ENCRYPTED_RECOVERY=PASS")
        print("RB05_SYNTHETIC_WRONG_IDENTITY_REJECTED=PASS")
    else:
        print("RB05_LOCAL_MANIFEST_ONLY=PASS / AGE_ENCRYPTION_CI_PENDING")
    print("RB05_SYNTHETIC_CONTRACT_PASS / REAL_SUPABASE_RESTORE_NOT_ATTESTED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, IncompleteBackup, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"RB05_SYNTHETIC_CONTRACT_FAIL: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
