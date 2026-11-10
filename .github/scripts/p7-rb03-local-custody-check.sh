#!/usr/bin/env bash
# RB-03: offline-only key-pair / recovery-copy rehearsal on synthetic bytes.
# This tool must never be used to process a real database dump or uploaded identity.
set -euo pipefail
umask 077

usage() {
  echo "Usage: bash $0 --self-test | --check /path/to/RECOVERED_PRIVATE_IDENTITY age1PUBLICRECIPIENT" >&2
  exit 2
}
command -v age >/dev/null || { echo "RB03_BLOCKED: age unavailable" >&2; exit 1; }
command -v age-keygen >/dev/null || { echo "RB03_BLOCKED: age-keygen unavailable" >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "RB03_BLOCKED: sha256sum unavailable" >&2; exit 1; }

work="$(mktemp -d "${TMPDIR:-/tmp}/p7-rb03.XXXXXXXX")"
cleanup() {
  status=$?
  trap - EXIT
  rm -rf "$work"
  exit "$status"
}
trap cleanup EXIT

verify_fixture() {
  local recovered_identity="$1" recipient="$2" derived expected actual
  test -f "$recovered_identity" || { echo "RB03_BLOCKED: recovery copy not available" >&2; return 1; }
  [[ "$recipient" =~ ^age1[a-z0-9]+$ ]] || { echo "RB03_BLOCKED: invalid public recipient" >&2; return 1; }

  # Derive only the public half, never log or transmit private key material.
  derived="$(age-keygen -y "$recovered_identity")" || return 1
  [[ "$derived" == "$recipient" ]] || { echo "RB03_BLOCKED: recipient mismatch" >&2; return 1; }

  # Constant, explicitly non-personal content. No plaintext output file.
  expected="$(printf 'RB03-SYNTHETIC-RECOVERY-FIXTURE-v1\n' | sha256sum | cut -d' ' -f1)"
  printf 'RB03-SYNTHETIC-RECOVERY-FIXTURE-v1\n' | age -r "$recipient" -o "$work/fixture.age"
  actual="$(age -d -i "$recovered_identity" "$work/fixture.age" | sha256sum | cut -d' ' -f1)"
  [[ "$actual" == "$expected" ]] || { echo "RB03_BLOCKED: fixture digest mismatch" >&2; return 1; }

  # A second unrelated private identity must NOT decrypt the ciphertext.
  age-keygen -o "$work/wrong.identity" >/dev/null 2>&1
  if age -d -i "$work/wrong.identity" "$work/fixture.age" >/dev/null 2>&1; then
    echo "RB03_BLOCKED: unrelated private identity accepted" >&2
    return 1
  fi
  echo "RB03_CRYPTO_FIXTURE_PASS keypair_match=PASS digest_match=PASS wrong_key_rejected=PASS"
}

case "${1:-}" in
  --self-test)
    [[ "$#" == 1 ]] || usage
    age-keygen -o "$work/synthetic.primary" >/dev/null 2>&1
    cp "$work/synthetic.primary" "$work/synthetic.recovery"
    recipient="$(age-keygen -y "$work/synthetic.primary")"
    verify_fixture "$work/synthetic.recovery" "$recipient"
    # Ensure a forged recipient is rejected before encryption.
    age-keygen -o "$work/other.identity" >/dev/null 2>&1
    wrong_recipient="$(age-keygen -y "$work/other.identity")"
    if verify_fixture "$work/synthetic.recovery" "$wrong_recipient" >/dev/null 2>&1; then
      echo "RB03_BLOCKED: mismatched recipient accepted" >&2
      exit 1
    fi
    echo "RB03_SYNTHETIC_SELFTEST_PASS / NO_REAL_CUSTODY_ATTESTED"
    ;;
  --check)
    [[ "$#" == 3 ]] || usage
    # Real private identities may NEVER be supplied to GitHub Actions.
    [[ "${GITHUB_ACTIONS:-}" != "true" ]] || { echo "RB03_BLOCKED: custody checks forbidden on GitHub Actions" >&2; exit 1; }
    verify_fixture "$2" "$3"
    echo "RB03_OFFLINE_RECOVERY_COPY_TEST_PASS / RB03_GATE_STILL_REQUIRES_CUSTODY_ATTESTATION"
    ;;
  *) usage ;;
esac
