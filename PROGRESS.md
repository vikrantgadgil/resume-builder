# PROGRESS.md - Resume Builder & ATS Optimizer

## Current status

Phase 6.6 complete on branch phase-6-6-quality-and-synthesis. Not yet merged to main.

## Session log

### Session template (copy for each entry)

**Date:**
**Phase:**
**Branch:**
**Completed:**
**Blockers:**
**Next step:**

---

**Date:** 2026-07-05
**Phase:** 6.6 - Model upgrade, multi-source synthesis, and generation quality
**Branch:** phase-6-6-quality-and-synthesis

**Completed:**
- Folded PLAN-AMENDMENT-5.md into PLAN.md (new Phase 6.6 section between Phase 6.5 and Phase 7, covering all three parts as one focused session); PLAN-AMENDMENT-5.md deleted once merged
- Part 1, model upgrade: verified the current DeepSeek model identifier against official API docs and a live test call rather than assuming it, since deepseek-chat and deepseek-reasoner deprecate 2026-07-24. Replaced deepseek-chat with deepseek-v4-pro across every runtime AI call (extraction/synthesis, reconciliation, selection, phrasing, attachment suggestion), centralized as a single DEEPSEEK_MODEL constant in src/lib/ai/deepseek.ts so future model changes are a one-line edit
- Part 2, multi-source synthesis ingestion: new flow (src/components/forms/MultiSourceUpload.tsx, src/lib/ai/synthesize-knowledge.ts, POST /api/profile/synthesize and .../save) that accepts multiple resume files and optional pasted text together and sends them to DeepSeek in one synthesis pass, deduplicating roles and facts and suggesting role attachments as part of that single pass rather than as later reconciliation. Still ends in one review screen (src/components/forms/SynthesisReview.tsx) before save, Zod validated. This path is for initial seeding only (rejected server-side if a profile already exists); the existing single-resume import path (Phase 3.5/3.6) remains unchanged and available for adding one document later to an established knowledge base. On the profile page, synthesis is now the primary path shown when no profile exists yet, with single-resume import demoted to a collapsed "Import a single resume instead" option
- Part 3, generation quality fixes, based on real JD testing that showed weaker output than pasting resumes directly into a frontier chat model: rewrote the selection prompt (src/lib/ai/select-facts.ts) to explicitly instruct avoiding near-duplicate facts (same underlying claim selected only once), covering multiple relevant roles instead of concentrating on one, and making fuller use of the two-page budget when the knowledge base supports it. Rewrote the phrasing prompt (src/lib/ai/phrase-bullets.ts) to remove the "return close to unchanged if it doesn't benefit from rewording" escape hatch that was producing passthrough output, replacing it with an explicit instruction to actively adapt phrasing toward the job description's vocabulary and priorities. The no-invented-facts guardrail is unchanged and still enforced in both prompts
- Verified: forced-malformed synthesis response falls back cleanly with a clear notice and no crash; reseeded the knowledge base from the same source resumes using the new multi-source synthesis flow in a single pass; ran a real job description through one-click generation and confirmed noticeably improved output against the pre-Phase-6.6 baseline (no duplicate roles, coverage across multiple relevant roles, phrasing that reads as adapted to the JD rather than passthrough)
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None. Two follow-ups identified this session, neither addressed here: formatting polish of the generated PDF (already deferred to the planned post-Phase-8 aesthetics pass), and post-generation manual editing of a tailored resume before download (newly identified this session, not yet scoped into any phase).

**Next step:** Open a new session for Phase 7 (ATS scoring), or scope the post-generation editing capability first if that takes priority. Merge phase-6-6-quality-and-synthesis into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-04
**Phase:** 6.5 - One-click generation flow
**Branch:** phase-6-5-oneclick-generation

**Completed:**
- Folded PLAN-AMENDMENT-4.md into PLAN.md (new Phase 6.5 section between Phase 6 and Phase 7); PLAN-AMENDMENT-4.md deleted once merged
- Rewrote src/components/preview/ResumeGenerator.tsx into a one-click flow: a single "Generate tailored resume" button runs selection, phrasing, and PDF rendering automatically end to end, with no intermediate click required. No change to the underlying selection logic (src/lib/ai/select-facts.ts), phrasing logic (src/lib/ai/phrase-bullets.ts), or PDF rendering (src/lib/pdf/ResumeDocument.tsx) built in Phase 6, this was a UX and flow change only
- The Phase 6 checklist and phrasing diff are retained as two collapsed-by-default `<details>` panels, "Review selection" and "Review phrasing," expandable before or after the default one-click generation completes
- Regeneration after an adjustment reuses unaffected earlier steps rather than restarting the pipeline: adjusting the selection checklist and clicking "Regenerate from this selection" only phrases facts not already cached (tracked in a factId-to-phrasing map that is merged into, never cleared), then re-renders; adjusting a phrasing toggle and clicking "Regenerate PDF with these choices" only re-renders, no API calls at all
- Expanding "Review selection" exposes an explicit "Suggest selection" or "Re-suggest selection" action for a fresh AI call on demand, independent of the primary one-click path, satisfying the requirement that the review path work whether opened before or after default generation
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None.

**Next step:** Open a new session for Phase 7 (ATS scoring), or address any further amendments first. Merge phase-6-5-oneclick-generation into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-04
**Phase:** 6 - AI content tailoring
**Branch:** phase-6-ai-tailoring

**Completed:**
- Decided in session, confirmed with user: selected unattached facts render under a "Selected Highlights" heading (not "Skills", since Phase 6 phrases facts as full narrative bullets rather than terse skill tokens), placed last, after Certifications
- Replaces Phase 5's manual all-checked checklist with two sequential DeepSeek steps, matching the amended PLAN.md: selection (src/lib/ai/select-facts.ts, POST /api/tailor/select) picks the most relevant facts from the full knowledge base for the pasted job description and its Phase 4 keywords, Zod validated (src/types/tailoring.ts), pre-populating the review checklist instead of leaving it empty or all-checked
- Skeleton entries (roles, education, certifications) are never subject to AI selection, they always render in full from the database, consistent with the hard rule that skeleton fields never pass through the LLM; only facts (both role-attached and unattached) are selected
- Phrasing step (src/lib/ai/phrase-bullets.ts, POST /api/tailor/phrase) rewrites each selected fact into a resume bullet naturally incorporating relevant JD keywords, Zod validated, with an explicit instruction not to add claims, numbers, or scope beyond the original fact. A side by side diff (original fact text vs phrased text) is shown per bullet with a per-bullet toggle to fall back to the original wording
- src/lib/pdf/ResumeDocument.tsx refactored to a simpler, phrasing-agnostic data shape (roles carry resolved bullet strings, plus a flat highlights list) so the template has no knowledge of facts, selection, or phrasing as concepts, it only renders whatever text it is given
- Any change to the checklist after phrasing invalidates the phrased bullets, requiring the user to re-run phrasing, so the diff shown always matches what would actually be generated
- Verified: forced-malformed responses at both the selection and phrasing steps degrade cleanly (selection falls back to showing everything for manual choice, phrasing falls back to original fact text), neither crashes or loses data; a full end to end run with a real job description and real DeepSeek calls completed the entire flow (JD analysis, AI-suggested selection, phrasing with reviewed diff, PDF generation), respected the two-page limit without manual trimming, and the phrased bullets showed no invented or exaggerated content on review
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None. Selection relevance and phrasing tone quality are areas for ongoing evaluation across a wider range of real job descriptions over time, not closed issues resolved by this session's single test.

**Next step:** Open a new session for Phase 7 (ATS scoring). Merge phase-6-ai-tailoring into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-04
**Phase:** 5.5 - Automatic fact-to-role attachment
**Branch:** phase-5-5-fact-attachment

**Completed:**
- Folded PLAN-AMENDMENT-3.md into PLAN.md (new Phase 5.5 section between Phase 5 and Phase 6); reviewed all 16 existing hard rules and confirmed none needed changing, since Zod validation (rule 5), no invented facts (rule 6), and required user review before any data change (rule 13) already cover this use case. No new hard rule added. PLAN-AMENDMENT-3.md deleted once merged
- Extended the Phase 3.5 extraction prompt (src/lib/ai/extract-knowledge.ts) so each fact candidate also comes back with an optional suggestedRoleEmployer, suggestedRoleTitle, and confidence, based on which job section the fact appeared under, a company name, or a matching timeframe. Explicitly instructed to leave generic or cross-cutting facts unattached rather than guessing or defaulting to the most recent or senior role
- Surfaced the suggestion in the existing Phase 3.5 merge review UI (src/components/forms/ImportReview.tsx): each new fact shows its suggested role with a checkbox, checked by default only when a suggestion exists, unchecking leaves it unattached. No new review UI paradigm
- Resolution happens at merge time (src/lib/knowledge-merge.ts, resolveSuggestedRole): since extraction only knows about candidate roles, not final saved role ids, the merge route (src/app/api/profile/merge/route.ts) matches the accepted suggestion's employer and title against the final merged roles list after all role resolutions are applied, falling back to a loose employer-name match if the exact phrasing changed during reconciliation, and leaving the fact unattached if nothing reasonable is found
- Built the one-time "suggest role attachments for unattached facts" action (src/components/forms/SuggestAttachments.tsx, src/app/api/profile/suggest-attachments and .../apply): sends current unattached facts and current skeleton roles to DeepSeek in one batched classification call, Zod validated (src/types/role-attachment.ts), returns a review list of fact plus suggested role plus confidence, with per-item accept/reject, bulk accept all, and bulk reject all. No fact is attached until the user clicks apply
- Bug found and fixed during interactive testing: the batch cap for this action was initially set to 40, copied from Phase 3.6's pairwise comparison cap. That cap exists there to control combinatorial explosion of pair counts, which does not apply here since this is a single classification call over all facts at once. With 90 real unattached facts ordered by creation date, the first 40 happened to be almost entirely generic leadership and philosophy statements with no company signal, so the first run correctly found zero matches while also reporting facts skipped due to volume, which looked like a bug but was actually the cap firing at the wrong layer. Fixed by raising the cap to 200 (a safety net, not a routine limit) so a realistic single-user fact pool is covered in one run
- Verified: forced-malformed AI response left every fact unattached with a clear error, not a crash; the retroactive action, once the cap was fixed, correctly proposed attachments for facts with real company-specific signal (Kaiser Permanente, Chesapeake Utilities, and others) and correctly left generic or cross-cutting facts out of the review list entirely; after accepting suggestions, the Phase 5 PDF preview shows real bullet content under the correct roles; a subsequent test import suggested roleRef at extraction time without needing the retroactive action
- Decided in session: for a fact that could plausibly apply to more than one role, the guidance going forward is to split it into role-specific versions (one fact per role) rather than extending a fact to reference multiple roles. Revisit only if this turns out to be a frequent recurring problem
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None. Manual selection friction in the Phase 5 checklist (confirmed, not a bug) is the expected motivation for Phase 6's automatic relevance-based selection. Also noted, not addressed here: several duplicate role pairs from Phase 3.6 testing (Chesapeake Utilities, Vishay Intertechnology, Tech Mahindra, Ecolab, Procter & Gamble each still have a normal-case and an ALL CAPS entry) remain unresolved in the reconciliation review queue; this does not block Phase 6 but is worth clearing before it causes fact attachments to split across duplicate role entries.

**Next step:** Open a new session for Phase 6 (AI content tailoring). Merge phase-5-5-fact-attachment into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-04
**Phase:** 5 - PDF generation and preview
**Branch:** phase-5-pdf

**Completed:**
- Single ATS-compliant React-PDF template (src/lib/pdf/ResumeDocument.tsx): no tables, columns, headers, footers, or graphics, Helvetica only, sizes 10 to 12, sections Experience, Education, Certifications, Skills. Decided in session: since the knowledge base no longer has literal summary or skills fields (Phase 3.5/3.6 replaced them with roles/education/certifications plus a fact pool), Experience renders each role with its attached facts as bullets, and Skills renders unattached facts as a flat list, preserving the section name from PLAN.md while sourcing it from the new data shape
- Decided in session: since the knowledge base can hold far more than fits on two pages and Phase 6's real relevance-based selection does not exist yet, this phase uses a manual selection checklist (src/components/preview/ResumeGenerator.tsx) as an explicit placeholder. Every role, education entry, certification, and fact is checked by default; the user unchecks items to fit within 2 pages; generation always reflects exactly what is checked, nothing is ever silently cut
- Page count enforced by actually rendering the PDF client-side with @react-pdf/renderer, then counting pages with pdfjs-dist loaded from the resulting blob. If the count exceeds 2, generation is refused with the actual page count shown and no preview or download offered, rather than truncating content or silently producing a longer PDF
- In-browser preview via an iframe on the generated blob URL, plus a download button, both entirely client-side, no API route or serverless function involved
- Bug found and fixed: pdfjs-dist's browser build references DOMMatrix at module top level, which crashed with "DOMMatrix is not defined" because Next.js evaluates client component modules during server-side rendering too. Fixed by lazy-loading pdfjs-dist with a dynamic import inside countPdfPages, so the module is only touched when the function actually runs in the browser, never during SSR module evaluation
- Also simplified next.config.ts's serverExternalPackages from ["pdf-parse", "pdfjs-dist"] down to just ["pdf-parse"], since marking pdfjs-dist external too was colliding with its new client-side usage; verified the Phase 2 server-side parsing route still works unchanged with this narrower config
- Verified: generation completes well under 5 seconds, the PDF opens cleanly in a real PDF reader (not just the in-browser preview), copy-pasting its text preserves reading order (header, then sections in order, no scrambled columns), and the two-page limit is enforced with a visible message rather than silent truncation
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None. Two known, expected gaps carried forward rather than fixed here: visual polish of the PDF template is deferred to a post-Phase-8 aesthetics pass, and most facts are currently unattached to any role (no roleRef), which will be addressed in a Phase 5.5 session before Phase 6 needs clean per-role fact grouping for its selection and phrasing logic.

**Next step:** Open a new session for Phase 5.5 (fact-to-role attachment cleanup) or Phase 6 (AI content tailoring), whichever the user decides first. Merge phase-5-pdf into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-04
**Phase:** 4 - Job description intake and keywords
**Branch:** phase-4-jd-keywords

**Completed:**
- JD intake UI (src/components/forms/JobDescriptionInput.tsx) on the generator page: paste text directly, or upload a .pdf/.docx file, which reuses the existing Phase 2 /api/parse route (pdf-parse/mammoth) rather than duplicating that logic
- compromise.js-based keyword extraction (src/lib/keywords.ts): acronyms plus noun phrases, split on commas and "and", frequency ranked, with a noise-filtering pass added mid-session (see bugs below)
- Title and company heuristics (also src/lib/keywords.ts): title from the first line when it looks like a title, else the most frequent noun phrase containing a common title keyword (Engineer, Manager, Director, and so on); company from compromise's organization detector, falling back to the most frequent capitalized multi-word noun phrase when that detector finds nothing (it missed invented company names lacking a recognizable suffix in testing)
- Both fields are always editable in the generator UI, since heuristics will not always be right
- Schema change: added a nullable keywords jsonb column to the applications table, migration generated and applied to Neon
- New API routes: POST /api/jd/analyze (runs extraction on JD text, no persistence) and POST /api/applications (saves a draft application record: jobTitle, company, jobDescription, keywords)
- Bugs found and fixed during interactive testing, all in src/lib/keywords.ts:
  - Fragments like "(k)" (from "401(k)"), bare "+ years" (from "10+ years"), and other number/punctuation remnants were surfacing as standalone keywords. Fixed by stripping leading digit and parenthetical fragments in cleanTerm (in the correct order, digits before parens, since "401(k)" does not start with "(" until the leading number is removed first) and rejecting any term that is entirely filler words after stopword removal
  - Leading filler determiners (both, some, all, any, every, various, other) were staying attached to otherwise good phrases, e.g. "both customer experience" instead of "customer experience". Fixed by stripping leading filler words from the front of a phrase rather than rejecting the whole phrase
  - Bare generic single words (Chair, Ability, Skills, Experience) were surfacing with no context and little signal. Added to the stopword list, but only rejected when they are the entire term after stopword filtering, so meaningful multi-word phrases like "Chair of the Board" or "customer experience" are unaffected
- Verified: pasting a real job description produces a sensible ranked keyword list with the noise fixes above; title and company extract reasonably and are editable when wrong; uploading the same job description as a .docx file produced identical extracted keywords, title, and company compared to pasting the equivalent text
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None.

**Next step:** Open a new session for Phase 5 (PDF generation and preview). Merge phase-4-jd-keywords into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-04
**Phase:** 3.6 - Semantic reconciliation
**Branch:** phase-3-6-reconciliation

**Completed:**
- Folded PLAN-AMENDMENT-2.md into PLAN.md (new Phase 3.6 section between 3.5 and 4) and CLAUDE.md (hard rules 15 and 16 on semantic comparison with unresolved-on-failure, and DeepSeek never auto-merging or choosing final phrasing); PLAN-AMENDMENT-2.md deleted once merged
- Cheap pre-filter added (src/lib/knowledge-merge.ts): name normalization, common suffix and parenthetical-acronym stripping, Levenshtein-based string similarity, initials/acronym matching, and date range or year overlap, used to decide which candidate pairs are worth sending to DeepSeek at all. Verified directly against the real known-duplicate names from testing (Radial Inc vs Radial, Chesapeake Utilities Corporation vs Chesapeake Utilities, Vishay Intertechnology with and without Inc, Tech Mahindra vs Tech Mahindra Ltd, Ecolab vs Ecolab Inc, Procter & Gamble vs P&G, CISSP vs its spelled-out form) before touching the database, all matched correctly, and unrelated names correctly did not
- Batched, Zod-validated DeepSeek comparison pass (src/lib/ai/compare-knowledge.ts): one call per collection type per run classifies all pre-filtered pairs at once (duplicate, likely_same/overlapping, or different/distinct); on any validation failure or missing pairIndex, every affected pair is treated as unresolved and surfaced to the user, never silently accepted or dropped
- Shared reconciliation engine (src/lib/reconcile-engine.ts) driving both import-time comparison (candidate vs existing) and self-comparison (existing vs existing, for the manual action), with a per-type comparison pair cap (40) and overflow pairs routed to needs-review flagged as not compared, never silently skipped
- Three-group reconciliation review UI rebuilt (src/components/forms/ImportReview.tsx): auto-skip (exact or AI-confirmed duplicates, not shown), needs review (likely-same pairs shown side by side with keep existing / keep new / keep both, plus a basic edit for the kept value), and new (no match, checkbox as before). Facts get a fourth option, merge, with an editable combined-text box
- New API routes: POST /api/profile/reconcile (runs the comparison pass on freshly extracted candidates against the current knowledge base) and an extended POST /api/profile/merge that applies both straight new-item adds and needs-review resolutions
- One-time manual "reconcile existing knowledge base" action (src/components/forms/ReconcileExisting.tsx, POST /api/profile/reconcile-existing and /api/profile/reconcile-existing/apply) that runs the same pre-filter and comparison pass pairwise within the current roles, education, certifications, and facts, so the retrofit case is handled without a separate code path
- Verified: a forced-malformed DeepSeek comparison response left every affected pair marked "Could not compare automatically" instead of crashing or dropping data; running the manual reconciliation action against the real knowledge base correctly flagged the remaining duplicate roles (Chesapeake Utilities, Vishay Intertechnology, Tech Mahindra, Ecolab; Radial Inc had already been resolved), duplicate education entries (MBA, B.E.), and duplicate certifications (CISSP, CISM, PMP); a third resume import correctly routed 2 overlapping role/fact pairs to needs-review instead of creating duplicates, including a genuine fact-level overlap (a skill-style phrase versus a full narrative sentence about business continuity and disaster recovery) resolved through the merge option, confirming the three-outcome fact model
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None. Some flagged pairs from this session's testing remain unresolved in the review queue by the user's choice, not as a bug: the queue persists correctly across runs and nothing forces an immediate decision, so pairs can be left for a later session.

**Next step:** Open a new session for Phase 4 (job description intake and keywords). Merge phase-3-6-reconciliation into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-04
**Phase:** 3.5 - Knowledge base ingestion and fact pool
**Branch:** phase-3-5-knowledge-base

**Completed:**
- Folded PLAN-AMENDMENT-1.md into PLAN.md (new Phase 3.5 section, amended Phase 6) and CLAUDE.md (updated project description, new hard rules 13 and 14, rule 6 rewritten to cover both extraction and tailoring); PLAN-AMENDMENT-1.md deleted once merged
- Data model redesigned: profiles.content slimmed to a verified skeleton only (roles, education, certifications), with a new facts table (text, roleRef, tags, source, timestamps) added via Drizzle migration and applied to Neon
- Existing Phase 3 test profile (real career history entered during that session's testing) wiped at the user's explicit choice rather than migrated, since profiles.content's shape changed incompatibly
- DeepSeek extraction rewritten (src/lib/ai/extract-knowledge.ts): separate paths for first import (header plus skeleton plus facts) and subsequent imports (skeleton plus facts only, header never re-extracted), both Zod validated with a manual fallback on any failure
- Import flow reworked end to end: resume text is extracted into candidates, then reviewed in a new reconciliation UI (src/components/forms/ImportReview.tsx) before anything is saved. Exact-duplicate roles, education, certifications, and facts are auto-detected (case-insensitive field match, src/lib/knowledge-merge.ts) and skipped automatically; everything else is shown as a checkbox the user can include or exclude, approved via a new merge endpoint (src/app/api/profile/merge/route.ts) that never overwrites existing skeleton or facts, only appends
- "Add fact" quick-entry UI (src/components/forms/AddFact.tsx) and a facts list with delete (src/components/forms/FactsList.tsx), backed by src/app/api/facts/route.ts and src/app/api/facts/[id]/route.ts
- Markdown rendering rewritten (src/lib/profile-markdown.ts) to the new structure: header, then roles with their attached facts as bullets, then education, then certifications, then unattached facts grouped by tag
- ProfileEditor rewritten for the new shape: header plus roles, education, and certifications (no more summary, bullets, skills, or projects on this form, since those now live in the fact pool)
- Verified: a forced-malformed AI response falls back cleanly with a manual-entry notice and no crash; importing a second, different resume on top of the first produced a working reconciliation review and a successful merge with real data
- Known gap found during real-data testing: duplicate detection is exact-match only (per the amendment's explicit scope cut), so near-duplicate roles or facts with slightly different wording are not caught and can be added twice if the user does not notice during review. Deferred to Phase 3.6
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None. Phase 3.6 (better duplicate detection) is optional future work, not blocking Phase 4.

**Next step:** Open a new session for Phase 4 (job description intake and keywords). Merge phase-3-5-knowledge-base into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-03
**Phase:** 3 - Profile extraction and editing
**Branch:** phase-3-profile

**Completed:**
- Zod schemas for header (name, email, phone, location, linkedin, github) and content (summary, experience, education, skills, projects) in src/types/profile.ts
- DeepSeek client (src/lib/ai/deepseek.ts) and structuring logic (src/lib/ai/structure-profile.ts) that turns confirmed raw text into a structured profile; system prompt instructs the model to reorganize only what is present in the source text and never invent an employer, title, date, degree, or skill
- Every DeepSeek response is parsed and passed through the Zod schema before use; on any failure (request error, malformed JSON, schema mismatch) the API falls back to an empty/manual-entry shape with a notice, never a crash and never a retry loop
- Full edit UI (src/components/forms/ProfileEditor.tsx) covering every header and content field, with add/remove controls for experience, education, and project entries, plus a live client-side markdown preview (src/lib/profile-markdown.ts)
- ResumeUpload now has a "Confirm and continue" step that hands the extracted text to the structuring flow; profile page (src/app/(dashboard)/profile/page.tsx) loads any existing saved profile on mount, and re-uploads only restructure content, never the header, once a profile has been saved
- Profile save/load API (src/app/api/profile/route.ts) upserts header, content, and generated markdown into Neon, and src/app/api/profile/structure/route.ts runs the DeepSeek call server-side so the API key never reaches the client
- Bug found and fixed: new profile inserts failed with a Postgres NOT NULL violation on userId. Root cause was that session/jwt callbacks needed to expose session.user.id did not exist before this session, so a session cookie issued during earlier Phase 1 testing decoded to a JWT with no id claim. Fixed by making the jwt callback in src/auth.ts self-healing: it now backfills token.id via an email lookup when a token is missing it, so existing sessions repair themselves without requiring sign-out
- Bug found and fixed: the bullets field in ProfileEditor appeared to not support Enter/new lines. Root cause was the onChange handler filtering out blank lines on every keystroke, which erased the newline the instant it was typed since the controlled textarea's value came from rejoining the filtered array. Fixed by removing the per-keystroke filter (blank lines are now allowed while typing) and instead normalizing (trimming, dropping empty lines) only at save time. Also switched the shared TextAreaField from a raw textarea to shadcn/ui's Textarea component for styling consistency; bullets are still stored and rendered as string[], unaffected by the fix
- Verified in the browser: AI structuring populates header and content, hand-editing every field works including multi-line bullets, save and full browser refresh reloads the saved profile intact, and a forced-malformed AI response is rejected by Zod and falls back to a manual-entry notice without crashing
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None.

**Next step:** Open a new session for Phase 4 (job description intake and keywords). Merge phase-3-profile into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-03
**Phase:** 2 - Resume upload and parsing
**Branch:** phase-2-upload-parse

**Completed:**
- Drag and drop upload UI on the profile page (src/components/forms/ResumeUpload.tsx), accepting .pdf and .docx only, with click-to-browse as a fallback
- Client-side validation rejects unsupported file types and files over 5MB immediately on selection, before any upload begins; server route re-validates both as defense in depth
- Server route (src/app/api/parse/route.ts) parses PDF with pdf-parse and DOCX with mammoth into raw text, factored into src/lib/parse.ts so Phase 4 can reuse it for job description parsing
- Extracted raw text shown in a read-only textarea for user confirmation; nothing is stored in Neon or touches the Drizzle schema in this phase
- Bug found and fixed: pdf-parse (pdfjs-dist under the hood) failed with "Setting up fake worker failed" when parsed through the bundled Next.js dev/build output, because Turbopack rewrites the worker module path and pdfjs can't resolve it. Fixed by adding `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` to next.config.ts so these packages are required directly by Node instead of bundled
- Also suppressed pdf-parse's default per-page "-- page_number of total_number --" marker (pageJoiner: "") so extracted resume text reads cleanly
- Verified in the browser with real PDF and DOCX resumes (readable extracted text), an oversized file (clear rejection message), and an unsupported file type (clear rejection message)
- `pnpm build` verified clean with zero TypeScript errors

**Blockers:** None.

**Next step:** Open a new session for Phase 3 (profile extraction and editing). Merge phase-2-upload-parse into main first per the one-branch-per-phase rule.

---

**Date:** 2026-07-03
**Phase:** 1 - Schema and auth
**Branch:** phase-1-schema-auth

**Completed:**
- Drizzle schema added for NextAuth tables (user, account, session, verificationToken, authenticator), plus profiles (header jsonb, content jsonb, markdown text, timestamps) and applications (jobTitle, company, jobDescription, resumeBlobUrl, atsScore, atsRulesetVersion, scoredAt, appliedDate, timestamps)
- Migration generated and applied to Neon; all 7 tables confirmed present
- NextAuth v5 wired up with the Drizzle adapter and Google OAuth, JWT session strategy so the proxy/middleware auth check stays edge-compatible
- Protected (dashboard) route group added (profile, generator, tracking) with a server-side session check in the layout plus proxy.ts (Next 16's middleware convention) redirecting unauthenticated visits to /sign-in with a callbackUrl
- Sign-in page added with a Google sign-in button (server action)
- Bug found and fixed: the Google provider was initially configured as bare `Google` (Auth.js v5 auto-detects env vars named AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET), but this project's .env.local convention is GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET per CLAUDE.md, so the provider was receiving undefined credentials. Fixed by passing clientId/clientSecret explicitly from process.env in src/auth.ts
- `pnpm build` verified clean with zero TypeScript errors; unauthenticated redirects verified for /profile, /generator, /tracking

**Blockers:** None.

**Next step:** Open a new session for Phase 2 (resume upload and parsing). Merge phase-1-schema-auth into main first per the one-branch-per-phase rule.

---

### 2026-07-03 - Planning

Spec reviewed and restructured into nine session-sized phases. Executor changed from Cline + DeepSeek to Claude Code with Sonnet. Key decisions locked: client-side PDF generation, v1 scope cuts (no URL scraping, no LinkedIn import, PDF/DOCX ingestion only, plain tracking table), atsScore as engine-computed snapshot, DeepSeek runtime exception documented. Next step: open Claude Code session with the Phase 0 kickoff prompt.

---

**Date:** 2026-07-03
**Phase:** 0 - Repo and toolchain
**Branch:** phase-0-setup

**Completed:**
- Next.js App Router scaffolded with TypeScript strict, Tailwind v4, ESLint, pnpm
- shadcn/ui initialized (components.json, button.tsx, utils.ts)
- drizzle-orm and @neondatabase/serverless added as dependencies; drizzle-kit as dev dependency; drizzle.config.ts pointing at an empty schema.ts placeholder
- Folder skeleton created per PLAN.md file structure (route groups, api routes, component folders, lib folders, types), empty dirs held with .gitkeep
- Placeholder home page and metadata updated (no em dashes, no default create-next-app copy)
- .env.local created locally with blank placeholders for DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DEEPSEEK_API_KEY (gitignored, not committed)
- README.md rewritten with project description and setup steps
- `pnpm dev` verified serving the placeholder page (HTTP 200), `pnpm build` verified clean with zero TypeScript errors
- Git repo initialized, committed on phase-0-setup, pushed to https://github.com/vikrantgadgil/resume-builder

**Blockers:** None.

**Next step:** Open a new session for Phase 1 (schema and auth). Before that session, the user needs to: create a Neon Postgres project and put its connection string in .env.local as DATABASE_URL; register a Google OAuth client (OAuth consent screen + credentials) and put GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local; generate an AUTH_SECRET value. Phase 0 branch has not yet been merged to main; merge phase-0-setup before starting Phase 1 per the one-branch-per-phase rule.
