import { useState } from "react";
import { caseCoverage } from "./coverage";
import {
  verdicts,
  type Campaign,
  type Execution,
  type Item,
  type TestCase,
} from "./domain";

export function CaseCoverage({
  cases,
  campaigns,
  items,
  executions,
  search,
  openCase,
}: {
  cases: TestCase[];
  campaigns: Campaign[];
  items: Item[];
  executions: Execution[];
  search: string;
  openCase: (value: TestCase) => void;
}) {
  const [campaign, setCampaign] = useState("");
  const groups = caseCoverage(cases, items, executions, campaign, search);
  const entries = groups.flatMap((g) => g.entries);
  return (
    <section aria-label="Couverture roadmap">
      <div className="coverage-intro">
        <h2>Couverture par référence roadmap</h2>
        <p className="muted small">
          Seules les fiches actives sont comptées. Un résultat concerne la
          version exécutée, dans l’environnement indiqué. Cette vue ne prononce
          pas la validation d’un chantier ERP et ne recense pas les chantiers
          sans fiche.
        </p>
        <label className="field">
          <span>Campagne de référence</span>
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          >
            <option value="">Toutes les campagnes</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.environment}
              </option>
            ))}
          </select>
        </label>
        <p className="small" role="status">
          {entries.length} fiches actives ·{" "}
          {entries.filter((e) => e.state === "result").length} avec résultat sur
          la version actuelle ·{" "}
          {entries.filter((e) => e.state === "stale").length} à réexécuter ·{" "}
          {entries.filter((e) => e.state === "pending").length} à exécuter ·{" "}
          {entries.filter((e) => e.state === "unplanned").length} hors campagne
        </p>
      </div>
      {!groups.length && (
        <div className="empty">
          Aucune fiche active ne correspond à cette recherche.
        </div>
      )}
      {groups.map((group) => (
        <section
          className="panel coverage-group"
          key={group.reference}
          aria-label={group.reference || "Sans référence roadmap"}
        >
          <div className="panel-heading">
            <h3>{group.reference || "Sans référence roadmap"}</h3>
            <span className="tag">{group.entries.length} fiches</span>
          </div>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                Fiches liées à {group.reference || "une référence à renseigner"}
              </caption>
              <thead>
                <tr>
                  <th>Fiche actuelle</th>
                  <th>Dernier résultat</th>
                  <th>Contexte exécuté</th>
                </tr>
              </thead>
              <tbody>
                {group.entries.map(
                  ({ testCase: c, state, execution, item }) => {
                    const context = campaigns.find(
                      (x) => x.id === item?.campaign_id,
                    );
                    return (
                      <tr key={c.id}>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => openCase(c)}
                          >
                            {c.code} — {c.body.title}
                          </button>
                          <small>
                            v{c.version} · {c.body.domain} ·{" "}
                            {c.body.bricks.join(" · ")}
                          </small>
                        </td>
                        <td>
                          {state === "result" ? (
                            <span className={`tag ${execution!.verdict}`}>
                              {verdicts[execution!.verdict!]}
                            </span>
                          ) : (
                            <span
                              className={`tag ${state === "stale" ? "blocked" : "neutral"}`}
                            >
                              {state === "stale"
                                ? "À réexécuter"
                                : state === "pending"
                                  ? "À exécuter"
                                  : "Hors campagne"}
                            </span>
                          )}
                          {execution && (
                            <small>
                              {state === "stale"
                                ? `Ancien résultat : ${verdicts[execution.verdict!]} · `
                                : ""}
                              v{item!.case_version} ·{" "}
                              {new Date(execution.submitted_at!).toLocaleString(
                                "fr-FR",
                              )}
                            </small>
                          )}
                        </td>
                        <td>
                          {context ? (
                            <>
                              <strong>{context.name}</strong>
                              <small>{context.environment}</small>
                              <small>
                                {Object.entries(context.builds)
                                  .map(([b, v]) => `${b} : ${v}`)
                                  .join(" · ") ||
                                  "Versions techniques non renseignées"}
                              </small>
                              {item!.snapshot.roadmap.trim() !==
                                c.body.roadmap.trim() && (
                                <small>
                                  Référence exécutée :{" "}
                                  {item!.snapshot.roadmap ||
                                    "Sans référence roadmap"}
                                </small>
                              )}
                            </>
                          ) : (
                            <span className="muted">Aucun résultat soumis</span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </section>
  );
}
