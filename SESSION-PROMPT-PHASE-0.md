# Paste this into your first Claude Code session

Prerequisite (do once, before opening Claude Code):

1. Create folder C:\dev\resume-builder and place CLAUDE.md, PLAN.md, and PROGRESS.md in it
2. Open Claude Code in that folder

Then paste:

---

Read CLAUDE.md and PLAN.md in full before doing anything.

Implement Phase 0 only, exactly as specified in PLAN.md, on branch phase-0-setup.

Constraints for this session:

1. Follow every hard rule in CLAUDE.md. Rules 9 (client-side PDF) and 10 (no em dashes) apply even to scaffolding and placeholder copy.
2. Do not install or configure anything belonging to later phases. No NextAuth, no Drizzle schema files beyond an empty placeholder, no PDF libraries yet. Phase 0 is toolchain and skeleton only.
3. When you need me to run something manually (creating the Neon project, GitHub repo creation, adding secrets to .env.local), stop and give me one command or one action at a time. I run VS Code non-elevated; flag anything needing admin PowerShell separately.
4. Do not print or echo secret values.
5. When Phase 0 acceptance criteria pass (pnpm dev renders placeholder, pnpm build clean, docs committed, pushed to GitHub), stop. Update PROGRESS.md with a session entry, commit it, and summarize what Phase 1 will need from me before I open the next session.

Start by confirming your understanding of Phase 0 scope in three sentences or fewer, then proceed.
