#!/usr/bin/env bash
set -euo pipefail

contract="docs/product/P7_INCIDENT_ESCALATION_CONTRACT.md"
template=".github/ISSUE_TEMPLATE/incident-escalation.yml"

[[ -s "$contract" ]]
[[ -s "$template" ]]

required_contract_markers=(
  "GitHub Issue"
  "SEV-1"
  "SEV-2"
  "Owner action required"
  "Receipt minima di chiusura"
  "rootCauseStatus"
  "containmentVerified"
  "dataIntegrityVerified"
  "followUpRequired"
  "Nessun segreto"
  "Rehearsal richiesto"
)

for marker in "${required_contract_markers[@]}"; do
  grep -Fq "$marker" "$contract" || {
    echo "Missing contract marker: $marker" >&2
    exit 1
  }
done

required_template_ids=(
  "id: environment"
  "id: severity"
  "id: detection_time"
  "id: observed_condition"
  "id: impact"
  "id: real_data"
  "id: containment"
  "id: owner_action"
  "id: evidence"
  "id: status"
  "id: safety"
)

for marker in "${required_template_ids[@]}"; do
  grep -Fq "$marker" "$template" || {
    echo "Missing issue-template field: $marker" >&2
    exit 1
  }
done

for severity in SEV-1 SEV-2 SEV-3 SEV-4; do
  grep -Fq -- "- $severity" "$template" || {
    echo "Missing severity: $severity" >&2
    exit 1
  }
done

for status in OPEN CONTAINED MONITORING RESOLVED FALSE_POSITIVE; do
  grep -Fq -- "- $status" "$template" || {
    echo "Missing status: $status" >&2
    exit 1
  }
done

grep -Fq "required: true" "$template"
grep -Fq "Non ho inserito password, token, cookie, service-role key o altri segreti." "$template"
grep -Fq "Non ho inserito dati personali scolastici reali nella descrizione." "$template"

echo '{"result":"PASS","scope":"INCIDENT_ESCALATION_MINIMUM_CONTRACT","ownerVisibleChannel":"GITHUB_ISSUE","rehearsalRequired":true,"productionTouched":false,"betaTouched":false}'
