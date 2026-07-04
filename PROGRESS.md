# PROGRESS.md - Resume Builder & ATS Optimizer

## Current status

Phase 2 complete on branch phase-2-upload-parse. Not yet merged to main.

## Session log

### Session template (copy for each entry)

**Date:**
**Phase:**
**Branch:**
**Completed:**
**Blockers:**
**Next step:**

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
