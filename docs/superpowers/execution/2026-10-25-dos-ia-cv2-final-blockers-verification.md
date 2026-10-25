# Verification target

Repair branch: `fix/dos-ia-cv2-final-blockers`
Parent candidate: `feat/dos-ia-product-reset` @ `b563bd0c6bf10666e380aa3cfd8709786cbdff06`

Required exact-head evidence before integration:

- Product CI PASS
- Product lint diagnostics PASS
- Human + Visual Acceptance PASS with governed baseline pre/post fingerprints present and equal
- WCAG 2.2 AA PASS
- P6 performance PASS without budget changes
- X3 no-implicit-write PASS
- X4 Planner PASS when selected by certification impact
- CV2 Candidate Qualification PASS after rejoin into the parent candidate

No merge to `develop` and no deployment are authorized by this repair branch.
