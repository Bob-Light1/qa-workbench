import { useEffect, useId, useState, type ReactNode } from "react";
import type { Item, Member } from "./domain";

export function BulkAssignment({
  items,
  campaign,
  members,
  enabled,
  busy,
  assign,
  children,
}: {
  items: Item[];
  campaign: string;
  members: Member[];
  enabled: boolean;
  busy: boolean;
  assign: (
    items: { id: string; version: number }[],
    user: string | null,
  ) => Promise<boolean>;
  children: (selection: {
    selected: Set<string>;
    toggle: (item: Item) => void;
  }) => ReactNode;
}) {
  const [selection, setSelection] = useState<{ id: string; version: number }[]>(
    [],
  );
  const [target, setTarget] = useState("");
  const targetId = useId();
  // A refresh is a new view of the versions. Require a deliberate new selection.
  useEffect(() => {
    setSelection([]);
    setTarget("");
  }, [items, campaign, enabled]);
  const selected = new Set(selection.map((i) => i.id));
  const available = items.filter((i) => i.campaign_id === campaign);
  return (
    <>
      {enabled && (
        <section
          className="panel bulk-assignment"
          aria-label="Affectation en lot"
        >
          <p>
            <strong>{selection.length} scénario(s) sélectionné(s)</strong>
            <span className="small muted">
              Une seule campagne, 200 scénarios maximum. Aucun résultat n’est
              modifié.
            </span>
          </p>
          <div className="bulk-actions">
            <button
              disabled={busy || !available.length}
              onClick={() =>
                setSelection(
                  available.map(({ id, version }) => ({ id, version })),
                )
              }
            >
              Tout sélectionner
            </button>
            <button
              disabled={busy || !selection.length}
              onClick={() => setSelection([])}
            >
              Effacer la sélection
            </button>
            <div className="field">
              <label htmlFor={targetId}>Affecter la sélection à</label>
              <select
                id={targetId}
                value={target}
                disabled={busy}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Non affectée</option>
                {members
                  .filter((m) => m.active)
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.email}
                    </option>
                  ))}
              </select>
            </div>
            <button
              className="primary"
              disabled={busy || !selection.length || selection.length > 200}
              onClick={async () => {
                if (await assign(selection, target || null)) setSelection([]);
              }}
            >
              Appliquer l’affectation
            </button>
          </div>
          <p className="small muted">
            Si un scénario a changé ailleurs, tout le lot est refusé. Actualisez
            puis refaites la sélection.
          </p>
        </section>
      )}
      {children({
        selected,
        toggle: (item) =>
          setSelection((previous) =>
            previous.some((i) => i.id === item.id)
              ? previous.filter((i) => i.id !== item.id)
              : [...previous, { id: item.id, version: item.version }],
          ),
      })}
    </>
  );
}
