# CLAUDE.md - Resume Builder & ATS Optimizer

## What this project is

A single-user resume generation system. It stores one master profile, accepts a job description, and generates an ATS-compliant two-page PDF resume tailored to that job. It tracks every application (job description, generated resume version, score, date). Prototype for personal use now, architected for future SaaS migration.

## Stack (locked, do not substitute)

- Next.js (App Router), TypeScript strict mode
- Tailwind CSS + shadcn/ui
- Neon Postgres + Drizzle ORM
- NextAuth v5 with Google OAuth
- @react-pdf/renderer for PDF generation (client-side)
- pdf-parse and mammoth for resume ingestion
- compromise.js for keyword extraction
- DeepSeek API (deepseek-chat) for content rewriting only
- Zod for all LLM output validation
- pnpm, Vercel deployment, Vercel Blob for archived PDFs

## Hard rules

1. Work on ONE phase per session. Read PLAN.md, implement only the current phase, stop when its acceptance criteria pass. Do not start the next phase.
2. One branch per phase, named `phase-N-short-description`. Commit working code before ending the session. Never leave significant work uncommitted.
3. PDF templates must NEVER contain tables, columns, headers, footers, graphics, or images. Fonts limited to Helvetica and Times-Roman, size 10 to 12. These rules exist for ATS compliance and are not negotiable.
4. Single PDF template only. Do not build a template abstraction layer, template registry, or theming system. That is deferred to commercialization.
5. All DeepSeek output must pass a Zod schema before it is stored, rendered, or used in a PDF. If validation fails, fall back to the unmodified profile content. Never render raw LLM output.
6. DeepSeek must never invent facts. Prompts must instruct it to rephrase and reorder existing profile content only. Any employer, title, date, degree, or skill not present in the profile is a bug.
7. atsScore is computed by the scoring engine and stored as a snapshot (score, ruleset version, timestamp). It is never accepted as user input and never editable.
8. No job board URL scraping. Job descriptions arrive as pasted text or uploaded files only.
9. PDF generation is client-side in the browser. Do not move it into an API route or serverless function (Vercel 10s timeout risk).
10. No em dashes anywhere: not in UI copy, generated resume content, comments, or docs. Use commas, colons, or separate sentences.
11. Do not modify files outside the scope of the current phase.
12. Update PROGRESS.md at the end of every session: what was completed, what is next, any blockers.

## Environment notes

- Repo lives at C:\dev\resume-builder (outside OneDrive, always)
- Developer runs VS Code non-elevated; anything requiring admin goes in a separate PowerShell window and should be called out explicitly as a single command
- Give terminal instructions one command at a time, never multi-line blocks
- GitHub account: vikrant.swapna@gmail.com
- Secrets live in .env.local, which is gitignored. Never print secret values to the terminal or into files.

## Key commands

- `pnpm dev` - run locally
- `pnpm db:generate` / `pnpm db:migrate` - Drizzle migrations
- `pnpm build` - verify production build before ending a phase

## Definition of done for any phase

- Acceptance criteria in PLAN.md pass
- `pnpm build` succeeds with zero TypeScript errors
- Work committed on the phase branch
- PROGRESS.md updated
