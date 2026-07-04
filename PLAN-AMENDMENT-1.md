# PLAN-AMENDMENT-1.md - Profile Knowledge Base Redesign

Date: 2026-07-03
Status: Approved by Vik, to be merged into PLAN.md and CLAUDE.md before the Phase 3.5 session opens.

## Why this amendment exists

Phase 3 as built treats the profile as a mirror of one resume: importing a second resume silently overwrites the first, and all content is forced into rigid per-role structure at ingestion time. The product intent is different: the profile is a superset knowledge base of everything the user has done (cyber, PMO, transformation, SAP, general IT, and more), far richer than any single resume, from which each tailored resume selects a relevant slice. This amendment changes the data model and ingestion flow to match that intent.

## Design principles

1. Structure only where it is load bearing. Facts that must never be wrong on a resume (employer names, titles, dates, degrees, certifications, contact info) live as structured, verified records that the LLM can never alter. Everything else lives as a loose fact pool.
2. Ingestion is loose, output is disciplined. Users add facts in freeform text, as casually as jotting a note. Structure is derived per resume at tailoring time, not imposed on the source of truth.
3. Imports enrich, never replace. Importing a resume adds to the knowledge base after user review. Nothing is silently overwritten.

## Data model changes

### Keep as is
- profiles.header (jsonb): name, email, phone, location, linkedin, github. Never AI-generated, never regenerated. Unchanged.

### Slim down
- profiles.content (jsonb) becomes the verified skeleton only:
  - roles: array of { employer, title, startDate, endDate, location optional }
  - education: array of { institution, degree, field optional, year optional }
  - certifications: array of { name, issuer optional, year optional }
- Remove freeform bullets, summary text, and skills lists from content. These migrate to the fact pool.

### Add
- facts table (new Drizzle table):
  - id (uuid)
  - userId (fk)
  - text (text, required): the fact itself, freeform
  - roleRef (nullable): loose link to a skeleton role (store the role identifier or index; nullable because many facts are cross-cutting)
  - tags (text array, nullable): user or AI suggested themes, e.g. cyber, pmo, sap, transformation, leadership
  - source (text): 'import' or 'manual'
  - createdAt, updatedAt

### Migration note
The existing profile row from Phase 3 testing contains structured content from one imported resume. Write a one-time migration path (or accept a clean wipe, Vik to decide in session; data is test data) that moves existing bullets/summary/skills into facts rows.

## Phase 3.5: Knowledge base ingestion and fact pool

Branch: phase-3-5-knowledge-base

- Schema changes above, with Drizzle migration applied to Neon
- Rework resume import flow: after Phase 2 text confirmation, DeepSeek extracts (a) skeleton candidates (roles, education, certs) and (b) fact candidates, each Zod validated
- Skeleton reconciliation UI: show proposed new/changed roles side by side with existing skeleton; user approves, edits, or rejects each before save; exact-duplicate roles auto-recognized and skipped
- Fact merge UI: proposed facts listed with checkboxes, default all selected; near-duplicate detection can be naive in this phase (exact and case-insensitive match only); user confirms before save
- 'Add fact' quick-entry UI on the profile page: a single textarea plus optional role/tag pickers; saving one fact must take under five seconds of user effort
- DeepSeek may suggest tags for new facts, Zod validated, user can edit
- Markdown rendering updated: skeleton first, then facts grouped by role, then unattached facts grouped by tag
- Hard rule carried forward: DeepSeek structures and extracts existing text only; any employer, title, date, degree, or skill not traceable to the source text is a bug

Acceptance: import a second, different resume on top of an existing knowledge base; approve the merge; confirm nothing from the first import was lost and no duplicate roles were created. Add three facts manually in loose language and confirm they persist and render. Forced-malformed DeepSeek response falls back cleanly without data loss.

## Phase 6 amendment (AI content tailoring)

Phase 6 scope changes from rephrase-only to select-then-phrase:

- Input: the full knowledge base (skeleton plus fact pool) and the JD keywords from Phase 4
- Step 1, selection: DeepSeek selects the most relevant facts for this JD, within a budget that fits two pages; selection output is Zod validated and shown to the user as a checklist they can adjust
- Step 2, phrasing: selected facts are phrased as resume bullets attached to their skeleton roles, naturally including JD keywords; Zod validated; side by side diff retained from original plan
- Skeleton fields (employers, titles, dates, degrees, certs) render from the database directly and are never passed through or returned by the LLM as editable content
- No invented facts rule unchanged and enforced at both steps
- Unattached facts selected for inclusion render under a Selected Highlights or Skills section, phrasing decided in session

## Phase renumbering

No renumbering. Phase 3.5 slots between 3 and 4. Phases 4, 5, 7, 8 are unchanged. Phase 6 is amended as above.

## CLAUDE.md updates required

- Update 'What this project is' to describe the profile as a superset knowledge base with a verified skeleton plus loose fact pool, from which each resume selects a slice
- Add hard rule: resume imports must never silently overwrite existing knowledge base content; all merges require user review
- Add hard rule: skeleton fields (employer, title, dates, degree, certification, contact info) are never generated, altered, or echoed back as editable content by the LLM; they render from the database only
