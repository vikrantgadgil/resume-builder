# PLAN.md - Resume Builder & ATS Optimizer

Nine phases, each sized for one Claude Code session. One branch per phase. Do not begin a phase until the previous one is merged to main.

## Locked decisions

- Client-side PDF generation with @react-pdf/renderer (avoids Vercel serverless timeout)
- v1 scope cuts: no job URL scraping, no LinkedIn import (paste into profile editor instead), resume ingestion limited to PDF and DOCX, tracking dashboard is a plain sortable table with no search
- DeepSeek in runtime is a deliberate exception to the usual dev-toolchain-only rule, justified by single-user scope and budget; revisit at commercialization
- atsScore stored as engine-computed snapshot, never as input

## Phase 0: Repo and toolchain

Branch: `phase-0-setup`

- Initialize Next.js (App Router) with TypeScript strict, Tailwind, shadcn/ui, pnpm
- Add Drizzle + Neon client, .env.local template (DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DEEPSEEK_API_KEY placeholders)
- Create folder skeleton per structure below
- Commit CLAUDE.md, PLAN.md, PROGRESS.md at repo root
- Push to GitHub

Acceptance: `pnpm dev` renders a placeholder home page; `pnpm build` passes; repo pushed with all three docs.

## Phase 1: Schema and auth

Branch: `phase-1-schema-auth`

- Drizzle schema: users (NextAuth tables), profiles (header jsonb, content jsonb, markdown text, timestamps), applications (jobTitle, company, jobDescription, resumeBlobUrl, atsScore int, atsRulesetVersion, scoredAt, appliedDate, timestamps)
- Migrations generated and applied to Neon
- NextAuth v5 with Google OAuth, protected (dashboard) route group, sign-in page

Acceptance: sign in with Google works locally; tables visible in Neon; unauthenticated users redirected from dashboard routes.

## Phase 2: Resume upload and parsing

Branch: `phase-2-upload-parse`

- Drag and drop upload accepting .pdf and .docx only
- Server route parses with pdf-parse / mammoth into raw text
- Raw text shown to user for confirmation before anything is stored
- Reject files over 5MB with a clear error

Acceptance: uploading a real PDF resume and a real DOCX resume each yields readable extracted text on screen.

## Phase 3: Profile extraction and editing

Branch: `phase-3-profile`

- Transform confirmed raw text into structured profile: header (name, email, phone, location, linkedin, github) and content (summary, experience, education, skills, projects)
- DeepSeek may be used for structuring here, with a Zod schema on the output and a manual-entry fallback
- Markdown rendering of the profile
- Edit UI for every field; header persisted separately so it is never regenerated
- Save and reload from Neon

Acceptance: upload, extract, hand-edit, save, refresh browser, profile reloads intact. Zod rejects a malformed LLM response without crashing.

## Phase 4: Job description intake and keywords

Branch: `phase-4-jd-keywords`

- JD input as pasted text or uploaded PDF/DOCX (reuse Phase 2 parsing)
- compromise.js extraction of skills, tools, and recurring noun phrases; simple frequency ranking
- Extract role title and company via heuristics with manual override fields
- Store JD and extracted keywords against a draft application record

Acceptance: pasting a real job description produces a sensible ranked keyword list and editable title/company fields.

## Phase 5: PDF generation and preview

Branch: `phase-5-pdf`

- Single ATS-compliant template in @react-pdf/renderer: no tables, no columns, Helvetica, sections Summary / Experience / Education / Skills, max 2 pages
- Client-side generation with in-browser preview and download
- Header populated from persisted header data
- Content populated verbatim from the stored profile (no AI in this phase)

Acceptance: generation completes in under 5 seconds in the browser; PDF opens in Acrobat and copy-paste of its text preserves reading order; two-page limit enforced.

## Phase 6: AI content tailoring

Branch: `phase-6-ai-tailoring`

- DeepSeek rewriting pass: given profile content plus JD keywords, rephrase bullets to naturally include relevant keywords
- Strict Zod schema on output; on validation failure, use original content and surface a notice
- Prompt must forbid inventing employers, titles, dates, degrees, or skills
- Side-by-side diff view: original vs tailored, user approves before generation

Acceptance: tailored resume includes target keywords, contains no facts absent from the profile, and a forced-invalid API response falls back cleanly.

## Phase 7: ATS scoring

Branch: `phase-7-ats-scoring`

- Heuristic engine: keyword coverage percent, section presence, format compliance flags, contact info completeness
- Score 0 to 100 with per-rule breakdown shown to user
- Snapshot stored on the application record with ruleset version and timestamp

Acceptance: two different JDs against the same profile yield different, explainable scores; snapshot fields populate correctly.

## Phase 8: Tracking, polish, deploy

Branch: `phase-8-tracking-deploy`

- Generated PDF archived to Vercel Blob, URL stored on application record
- Applications table view: company, role, date, score, download link; sortable, no search
- Loading states, error boundaries, empty states
- Vercel deployment with env vars configured
- README with setup instructions

Acceptance: full loop on the deployed URL: upload resume, build profile, paste JD, tailor, generate, score, and see the application in the tracking table with a working PDF download.

## Deferred (do not build)

Multiple templates, Stripe, multi-tenant, team features, embeddings, AI-powered scoring, job URL scraping, LinkedIn API, search and filters, cover letters.

## File structure target

```
src/
  app/
    (auth)/
    (dashboard)/
      profile/
      generator/
      tracking/
    api/
      auth/  profile/  parse/  track/
  components/
    ui/  forms/  preview/  tracking/
  lib/
    db/  ai/  pdf/  ats/
  types/
```
