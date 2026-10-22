# User guide

The interface is French. This guide describes its workflow in English.

## Start a short session

Activate the individual link received from the installation administrator and set
an individual password. Sign in, choose the project and open a campaign. The QA
app's online address does not make localhost ERP addresses reachable from another
computer. Each tester needs access to the campaign's specified ERP environment.

Select a case assigned to you, or an unassigned case. Confirm prerequisites and
synthetic account/data availability. Use separate browser contexts for different
ERP identities. Never upload real student data or credentials.

Read each action and compare the expected outcome with the actual behavior. Ten
minutes is an estimate; it is neither a forced deadline nor proof of full coverage.
Record notes and elapsed minutes. Save the draft before closing or switching devices;
editing text alone does not save it. A saved draft is available on another device.

## Record a result

- Réussi: the documented outcomes match.
- Échoué: the product behaves differently from the expected outcomes.
- Bloqué: an environment or prerequisite prevents execution.
- Non exécuté: intentionally not run; explain why.

Upload PNG/JPEG/WebP evidence of up to 5 MiB per file. A pending or failed upload is
not saved evidence. Retry confirmation after recovery, or cancel the pending entry.
Do not finalize while evidence is pending. Finalized results cannot be rewritten.
A later verification creates another result, preserving the failure.

## Report and follow up

Open a finalized result and create a signalement. Choose product defect, suggestion,
case error or environment problem. Include the failing step, observed behavior and
reproduction details. Expected behavior and environment are retained in the campaign.

Editors/admins triage the issue and record a correction reference or decision.
For a product defect, verification/closure requires a later successful execution of
the same campaign item. A fixed status alone does not establish successful retesting.
Case revisions affect future campaigns; existing instructions remain unchanged.

## Team and recovery

Project admins assign members and roles. Installation operators handle forgotten
passwords through new individual links. No automatic email is sent. An existing
account invited to another project keeps its password. Ask for a fresh link if an
activation link expired or was already used.

Administrators should export the project after meaningful campaigns and retain a
private copy elsewhere. See [operations](OPERATIONS.md) for restoration. Report
precise errors and refresh before retrying when another person modified a record.
