# QA Workbench delivery roadmap

This is the source of truth for work-item status. Definitions live in [design](DESIGN.md).
Dates and executed evidence live in [current handoff](current_task.md).

| ID    | Item                                           | Status           | Acceptance                                                    |
| ----- | ---------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| P1-01 | Independent repository and base documentation  | READY TO COMMIT  | Discoverable, documented, tracked independently               |
| P1-02 | Auth, membership and authorization             | LOCALLY VERIFIED | Allow/deny, invitation/recovery and removal checks pass       |
| P1-03 | Versioned cases and campaign snapshots         | LOCALLY VERIFIED | Stale writes refused; campaign instructions remain frozen     |
| P1-04 | Execution, evidence and issue follow-up        | LOCALLY VERIFIED | Two users, preserved failure/retest, private captures         |
| P1-05 | Backup, restore and agent access               | LOCALLY VERIFIED | Empty-target round trip preserves data, files and attribution |
| P1-06 | Ten ERP cases and references in four ERP repos | VERIFIED         | Actual routes verified; no fixture credentials published      |
| P1-07 | Hosted release and handoff                     | IN PROGRESS      | Real HTTPS and two-account acceptance; record commit          |
| P2-01 | Extend ERP case coverage and reviews           | NOT STARTED      | Case IDs linked to product work and review state              |
| P2-02 | Twenty-user collaboration and bulk work        | NOT STARTED      | Concurrent work verified with twenty accounts                 |
| P3-01 | Automated result ingestion and impact checks   | NOT STARTED      | Provenance and history preserved                              |
| P3-02 | Scheduled backups and useful reporting         | NOT STARTED      | Recovery exercised and indicators actionable                  |

Phase 1 is not delivered until P1-07 passes. Building this app does not complete
ERP CH-0 acceptance, CH-2, CH-4 or other existing QA work items.
