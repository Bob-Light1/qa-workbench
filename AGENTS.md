# QA Workbench agent instructions

## Start and resume

Read README.md, docs/DESIGN.md and docs/current_task.md once at session start.
Check the current branch, `git status --short` and relevant diffs before editing.
Treat handoffs as dated observations; preserve unrelated work. The current user
request defines scope. Read docs/ROADMAP.md for delivery status.

## Engineering

- This is a standalone project, not an ERP module. Do not couple its uptime,
  authentication or data storage to ERP services.
- Use TypeScript/React for UI, Supabase for Auth/Postgres/private Storage, and
  Cloudflare Pages for the static UI. Avoid introducing another general backend.
- Put atomic cross-record rules in versioned SQL RPCs. Enforce authorization
  through grants, RLS and server checks, including direct API and Storage access.
- Never trust caller-supplied role or membership. Service credentials stay server-side.
- Preserve case revisions, campaign snapshots and finalized execution history.
  Detect stale versions; a retest is another execution. Submitted results are immutable.
- Keep identifiers, comments, logs and engineering documents in English. Preserve
  French product text and test-case content. Never put credentials or real ERP
  personal data in tracked files, reports or screenshots.
- Update schema using append-only migrations. Never change an applied migration.
- The initial ten-case catalog is maintained in data/erp-cases.json; import uses
  the same RPC as the UI. Never store fixture passwords in cases.
- Treat UI/API failure states as real states: no successful-upload label before
  the object is confirmed, no success verdict after a failed request.

## Validation and closeout

Run relevant unit checks, TypeScript/build, database/API integration and browser
checks for changed behavior. Test allow and deny paths. Regression fixes need
proof that the check detects the defect. Do not claim mock tests prove hosted access.
Use only the owned local Supabase stack for destructive test resets.

Update docs/current_task.md at milestones and before stopping: objective, decisions,
changes, checks actually run, remaining work and next action. Replace stale state
without losing unresolved blockers. Keep permanent design decisions in DESIGN.md
and task status in ROADMAP.md. Reference the released commit and deployment URL.
A working local app does not establish online delivery.

Each ERP roadmap change must identify affected case IDs, add/revise/archive those
cases, or record why no manual-QA change is needed. Preserve existing ERP phase
ordering and CH-* acceptance rules. Do not overwrite another specialist's handoff.
