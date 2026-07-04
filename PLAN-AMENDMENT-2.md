# PLAN-AMENDMENT-2.md - Semantic Reconciliation for Skeleton and Facts

Date: 2026-07-04
Status: Approved by Vik, to be merged into PLAN.md and CLAUDE.md before the Phase 3.6 session opens.

## Why this amendment exists

Phase 3.5 shipped with exact-match-only duplicate detection, a deliberate scope cut at the time. Real-world testing with two actual resumes confirmed the gap is worse than anticipated: it is not limited to facts, it also produced duplicate roles, duplicate education entries, and duplicate certifications, because real resumes phrase the same job, degree, or credential differently across documents (abbreviated vs spelled out title, added scope, casing differences, expanded vs acronym form). This amendment adds a semantic reconciliation step so importing overlapping resumes converges the knowledge base instead of cluttering it.

## Scope

This amendment covers all four collections: roles, education, certifications, and facts. Roles, education, and certifications are the verified skeleton and deserve the same rigor here as facts.

## Design approach

Semantic matching happens at merge-review time, before save, using DeepSeek as a comparison step, Zod validated like every other AI output in this project. This is a proposal-and-review step, not silent auto-merging: the user always has final say.

### Skeleton reconciliation (roles, education, certifications)

For each newly extracted skeleton candidate, compare it against existing skeleton entries using a combination of:
- Cheap pre-filter: normalize case, strip common suffixes/prefixes (Inc, LLC, Corporation, parenthetical acronyms), and check for substring or high string-similarity overlap on employer/institution/certification name plus overlapping date ranges where present
- DeepSeek comparison pass on pre-filtered candidate pairs only (not the full cross product, to control cost and latency): given an existing entry and a new candidate, classify as exact duplicate, likely same entity with different phrasing, or genuinely different

Present results in the reconciliation UI in three groups:
- Auto-skip: exact duplicates (already handled, unchanged from Phase 3.5)
- Needs review: likely-same pairs, shown side by side, user picks which phrasing to keep, or edits a merged version, or confirms they are actually different and keeps both
- New: no match found, added as before

Never auto-merge a likely-same pair without user confirmation. Never let DeepSeek choose which phrasing is "correct" without the user seeing both.

### Fact rationalization

Same pre-filter plus DeepSeek comparison approach, applied to new fact candidates against the existing fact pool. Because facts vary more in granularity (a narrative sentence vs a skill-style phrase can describe the same underlying claim), the comparison prompt must explicitly handle three outcomes:
- Duplicate: same claim, same granularity, different wording. Suggest keeping one.
- Overlapping: same underlying claim at different granularity (e.g. a skill phrase and a narrative sentence describing it). Suggest keeping both, or merging into one fact if the user prefers, but do not force this.
- Distinct: different claims that happen to share a topic or tag. Keep both, no action needed.

Present likely-duplicate and overlapping fact pairs in a review list, same pattern as skeleton reconciliation: side by side, user decides keep one, keep both, edit, or merge.

### Cost and performance guardrails

- Only run the DeepSeek comparison pass on pairs that survive the cheap pre-filter, not the full existing collection against every new candidate
- Cap the number of comparison pairs sent per import (a reasonable batch size, decided in session) and if exceeded, fall back gracefully: flag the overflow to the user rather than silently skipping or erroring
- This reconciliation step runs only at import time, not on every page load or edit

### Retrofitting existing data

The knowledge base already contains the duplicates surfaced in this session's testing (6 duplicate role pairs, overlapping education and certification entries, and heavily clustered facts). Phase 3.6 should include a one-time "reconcile existing knowledge base" action the user can trigger manually, running the same comparison logic across the current collections rather than only on future imports.

## Phase 3.6: Semantic reconciliation

Branch: `phase-3-6-reconciliation`

- Implement the pre-filter plus DeepSeek comparison pass described above for roles, education, certifications, and facts
- Build the three-group reconciliation review UI (auto-skip, needs review, new) for skeleton entries, extending or replacing the Phase 3.5 merge UI
- Build the duplicate/overlapping fact review list for facts, extending or replacing the Phase 3.5 fact merge UI
- Add the one-time manual "reconcile existing knowledge base" action
- Zod validation on every DeepSeek comparison response; on validation failure, treat the pair as unresolved and surface it to the user rather than guessing
- Hard rule carried forward: DeepSeek classifies and compares only; it never fabricates a merged phrasing the user did not see or approve

Acceptance: running the manual reconciliation action against the current knowledge base correctly flags the known duplicate roles (Radial Inc, Chesapeake Utilities, Vishay Intertechnology, Tech Mahindra, Ecolab, Procter & Gamble), the duplicate education entries, and the duplicate certifications, and after user review the skeleton contains one clean entry per real role/degree/certification. A subsequent test import of a third resume with at least one deliberately overlapping role and fact correctly routes them to needs-review rather than creating new duplicates. Forced-malformed DeepSeek comparison responses are treated as unresolved, not silently accepted or dropped.

## Phase renumbering

No renumbering. Phase 3.6 slots between 3.5 and 4.

## CLAUDE.md updates required

- Add hard rule: skeleton and fact duplicate/overlap detection must include a semantic comparison step, not exact-match only, and any DeepSeek comparison output must be Zod validated with unresolved-on-failure behavior, never silent accept or drop
- Add hard rule: DeepSeek may classify and compare candidate pairs during reconciliation but must never auto-merge or choose a final phrasing without user confirmation
