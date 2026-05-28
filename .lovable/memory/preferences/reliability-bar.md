---
name: Reliability bar
description: Project-wide quality bar for every change — consumer + enterprise ready
type: preference
---
Build with the intent of creating a tool with an exceptionally reliable, seamless experience ready for consumers and enterprise customers.

**How to apply:**
- Default to defensive coding (null checks, idempotent writes, race-condition guards).
- No half-wired UI: if a control is rendered, it must work end-to-end.
- Every backend write must survive refresh, reconnect, and multi-tab.
- Prefer server-trusted state over client timers/closures.
- QA every change against the happy path before claiming done.
