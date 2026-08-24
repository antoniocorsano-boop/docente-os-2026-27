# X5-B export rendering decision

Decision: use a dedicated print-ready web surface and the browser-native print/save-PDF pipeline for the first professional export.

Rationale:

- preserves the exact authored-version model already certified in X5-A;
- introduces no second PDF rendering engine or new runtime dependency;
- keeps the export human-triggered and visually inspectable before output;
- allows print CSS to be governed by the existing HVA discipline;
- leaves room for a later direct binary PDF service only if evidence shows it is necessary.

This decision is intentionally limited to X5-B and does not authorize additional document kinds or assistant write capabilities.
