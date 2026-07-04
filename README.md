# Resume Builder and ATS Optimizer

Single-user resume generation system. Stores one master profile, accepts a job description, and generates an ATS-compliant two-page PDF resume tailored to that job.

See CLAUDE.md for hard rules and stack decisions, PLAN.md for the phase-by-phase build plan, and PROGRESS.md for session history.

## Setup

1. `pnpm install`
2. Fill in `.env.local` with your own values (DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DEEPSEEK_API_KEY). This file is gitignored.
3. `pnpm dev` to run locally at http://localhost:3000

## Key commands

- `pnpm dev` - run locally
- `pnpm build` - production build
- `pnpm db:generate` / `pnpm db:migrate` - Drizzle migrations
