# Operations

See [design](DESIGN.md) for invariants and [handoff](current_task.md) for verified state.

## Local setup and first administrator

Start the owned stack and run scripts/local-env.mjs as described in README.
Serve Edge Functions with `npx supabase functions serve --env-file .env.functions.local`.
In another terminal, run `npm run functions:wait` before acceptance. If it times out,
inspect only the owned function runtime and its logs. A healthy database or running
container does not prove function readiness. Allow cold startup to finish; preserve
useful data and do not reset databases or restart shared services to repair a function.
Bootstrap requires QA_EMAIL and a strong QA_PASSWORD supplied through a secure
shell environment or an ignored .env.local (mode 600), never shell command arguments.

```sh
npm run qa -- bootstrap "ERP multi-campus"
npm run qa -- projects
npm run qa -- import PROJECT_UUID data/erp-cases.json
```

Bootstrap only succeeds on an empty installation. Its first user becomes a project
administrator and installation operator. Invite other users through the UI. The
operator is responsible for delivering links to the intended person over a trusted
channel. Links are secrets; do not paste them into tickets, docs or shared screenshots.
Existing accounts get membership without password reset. Only the installation
operator can recover another account. No account passwords are displayed by the app.
For first activation or operator recovery, configure the server environment and
QA_EMAIL, then run `npm run qa -- access-link .env.admin-access.local`. The command
resolves an existing identity and writes a one-use link privately (mode 600), without
printing it. Deliver the file only to that person; remove it after activation.
Generating a replacement invalidates the previous link.

## Hosted deployment

Use owner-controlled free Cloudflare and Supabase accounts. No paid upgrades or
custom domain are necessary. Git source remains private.

1. Create a dedicated Supabase project, never reuse the ERP database. Apply all
   migrations in order with Supabase CLI or the connected provider tool.
2. Set `auth.enable_signup=false` to disable public signup; keep
   `auth.email.enable_signup=true` to enable the email provider (the current CLI
   otherwise disables email login as well). Verify both behaviors by API. Set email OTP lifetime to 3600 seconds and strong password
   requirements. Configure the real app origin and allowed redirect URLs.
3. Deploy manage-access with JWT gateway verification disabled as configured; the
   function itself verifies Auth identity and project role before every operation.
   Configure APP_ORIGIN to the exact HTTPS Pages origin. It uses provider-injected
   server secrets; never copy them into Vite configuration.
4. Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in an ignored
   .env.production.local. Publishable keys are intentionally client-visible. Service
   and secret keys must never have a VITE_ prefix.
5. Authenticate Wrangler with minimum account/user read and Pages write permissions.
   Create a Pages project for direct upload and publish with `npm run deploy`.
6. Bootstrap hosted owner, import ten cases, then verify HTTPS, two identities,
   project isolation, evidence access and a failed/passing history on hosted data.
7. Record deployed commit, provider project identifiers (non-secret), URL and checks
   in current_task and README. Do not publish a placeholder configuration screen.

The tracked frontend headers forbid framing and restrict connections to Supabase.
If a custom Supabase hostname is introduced, review CSP before deployment. Development
uses Vite headers rather than the hosted _headers file.

## Backup and restoration

A project administrator can export the entire project and ready evidence from the
team page, or run the CLI backup command. Exports contain personal account contact
information and test evidence: retain them in private storage, outside Git. Back up
after each substantial campaign and before a schema/deployment operation. Keep at
least the latest three verified archives on a separate machine or private location.
Free hosting does not supply an automatic backup guarantee.

Current exports use archive format 2 and include revision-bound review history.
Use the current restore CLI and all migrations (including case reviews). Older
format-1 archives are accepted with an empty review history when absent.

To restore, prepare an empty Supabase installation with the same migrations and
private evidence bucket. Configure its server credentials and QA_EMAIL to the
administrator email included in the archive, then run:

```sh
npm run qa -- restore backups/project.zip --confirm-empty
```

The command rejects a nonempty installation, validates manifest/file checksums,
recreates missing users with unknown random passwords, maps their historical records,
uploads files, inserts business rows in one transaction and verifies counts/bytes.
If a transfer fails before commit, no business rows are partially restored; uploaded
objects may remain and a retry can replace them. Do not delete source backups until
verification succeeds. Recreated accounts require fresh individual recovery links;
no old sessions or password hashes are restored. Existing destination accounts keep
credentials. Recover the installation operator through the server admin environment,
then use the app for the other members. Auth service keys belong only to operators.

## Interruption and rollback

An unavailable database/Storage service must produce an error, not a success.
After a reconnect, refresh and inspect server state before repeating a mutation.
Use the same execution identity for a retry; identical final submissions are idempotent.
A pending capture must be confirmed or cancelled before finalization/export. Cancelled
failed uploads may leave an unreferenced storage object; operators may remove only
objects verified to have no attachment record.

Cloudflare can republish a previously built frontend. Database migrations are
append-only: use an additive repair migration instead of deleting applied history.
Back up first. Avoid destructive schema changes that invalidate the previous frontend.
If a failed release applied migrations, inspect actual migration state before retrying.

## Pending P2-01 release

The current hosted schema has migrations `202610220001`–`202610220004`. Coverage
and reviews require these existing additive migrations, in this order:

1. `202610250001_case_reviews.sql`: review table/RLS/RPC and archive/restore support.
2. `202610250002_review_notes.sql`: reject whitespace-only requested changes.
3. `202610250003_review_history_restore.sql`: retain earlier opinions on restore.

Obtain explicit owner approval for this production schema change and frontend
deployment. Automatic approval review refused the migration action during the
2026-10-25 release preparation; no migration was applied. The files have already
passed local API, concurrency, permission and rolled-back restore checks. They add
review history without rewriting existing cases, executions or campaign snapshots.

After approval, refresh and verify private archives of every existing project and
its evidence. Apply all three files and their migration ledger entries atomically,
then inspect the actual ledger. Keep the previous frontend available until hosted
API checks pass. Run the opted-in hosted coverage/review acceptance documented in
CONTRIBUTING.md; it creates isolated synthetic workspaces, never resets/restores
hosted data. Build and scan assets for server secrets, publish to the existing
`qa-workbench` Pages project, and run all HTTPS browser journeys with the corresponding
private fixtures. Re-export review history and verify the downloaded archive.
Record the new source commit and deployment identifier only after these checks.
If a check fails, retain its real error and inspect state before retrying. Use an
additive repair migration or the prior compatible frontend as appropriate.

## Free-host constraints and recovery

At the 2026-10-22 review, Supabase Free lists a 500 MB database, 1 GB file storage,
limited egress and possible pausing after a week of low activity. Automatic backups
are not included. No permanent-availability commitment is made for phase 1.
Inspect quotas in the provider dashboard; archives remain the owner's responsibility.
When paused, sign into the Supabase dashboard, restore the project, then recheck Auth,
API and Storage before resuming campaigns. Do not generate fake activity to evade limits.

Sources: [Supabase pricing](https://supabase.com/pricing),
[pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[backups](https://supabase.com/docs/guides/platform/backups),
[Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## Validation stack on the initial machine

The project ID is `qa-workbench-validation`. The previous volume
`supabase_db_qa-workbench` is retained after an interrupted initialization and is
not the test target. The validation database volume uses a 768 MiB tmpfs mount
on this machine to avoid slow-disk startup failures. It is disposable: stopping
its container may discard its database. Never use this volume for real QA results.
The hosted project is the durable workspace. Export any useful local experiment
before stopping it. A freshly mounted tmpfs volume can exist without application
tables; run `supabase migration up --local` after startup.

Start only the services used by this application on constrained machines:

```sh
npx supabase start --exclude realtime,imgproxy,studio,postgres-meta,logflare,vector,supavisor
npx supabase migration up --local
node scripts/local-env.mjs
```

All required API/Auth/Storage/function health checks remain enabled. Integration
resets are restricted to this named validation stack and its loopback API.

## Initial deployment inventory

- Canonical HTTPS origin: https://qa-workbench.pages.dev
- Cloudflare Pages direct-upload project: `qa-workbench`; production branch `main`.
- Verified application code: `891d37a35b0c51b9c9fed5874d7c0d812638068a`.
- Production deployment: `f485304d` (https://f485304d.qa-workbench.pages.dev).
- Supabase Free project: `xtgaepikylepriipuyps`, region `eu-west-3`,
  [provider dashboard](https://supabase.com/dashboard/project/xtgaepikylepriipuyps).
- Migrations: `202610220001` through `202610220004`; Edge Function: `manage-access`.
- Private host environment on the initial machine: `.env.hosted.local` (server),
  `.env.production.local` (frontend publishable configuration). Never display their
  contents in logs. `.env.admin-access.local` is a temporary one-use access link,
  not a configuration file to load. Regenerate through `qa access-link` when needed.
- The ERP multi-campus workspace contains the ten French starter cases. A separate
  technical-acceptance project contains synthetic accounts and test results.
  Keep user campaigns in the ERP workspace. Do not present synthetic acceptance
  results as evidence that the ERP cases themselves have been manually executed.

For frontend rollback, use the Cloudflare Pages dashboard to select a previous
production deployment and roll it back; see [provider procedure](https://developers.cloudflare.com/pages/configuration/rollbacks/).
Preserve schema compatibility and keep a current export before any migration.
The initial `1d8c11e5` deployment predates the project-loading repair; prefer a
verified release when another is available. Applied migrations remain append-only.

Backups produced during acceptance live in the ignored `backups/` directory and
are private local copies. Copy a verified archive to a separate private location;
local files alone do not protect against loss of this machine. A source Git bundle
can also preserve the private repository without publishing it. No remote Git
repository or scheduled backup has been configured in phase 1.
