import {
  useEffect,
  useState,
  useRef,
  useId,
  cloneElement,
  type ReactElement,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  ListChecks,
  FlaskConical,
  Bug,
  Users,
  ArrowUpRight,
  Plus,
  LogOut,
  Download,
  Check,
  ChevronRight,
  Clock,
  Search,
  RefreshCw,
  Play,
  Paperclip,
  X,
} from "lucide-react";
import {
  db,
  configured,
  rpc,
  rows,
  uploadCapture,
  openCapture,
  exportProject,
} from "./api";
import {
  friendlyError,
  parseSteps,
  validateImage,
  validateNewPassword,
  verdicts,
  roles,
  kinds,
  statuses,
  type Role,
  type TestCase,
  type CaseBody,
  type Campaign,
  type Item,
  type Execution,
  type Issue,
  type Member,
  type Attachment,
  type Verdict,
} from "./domain";

type Project = { id: string; name: string };
type Data = {
  cases: TestCase[];
  campaigns: Campaign[];
  items: Item[];
  executions: Execution[];
  issues: Issue[];
  members: Member[];
  attachments: Attachment[];
  events: {
    id: string;
    issue_id: string;
    body: { status: string; resolution?: string };
    created_at: string;
  }[];
};
const empty: Data = {
  cases: [],
  campaigns: [],
  items: [],
  executions: [],
  issues: [],
  members: [],
  attachments: [],
  events: [],
};
const blank: CaseBody = {
  title: "",
  objective: "",
  prerequisites: "",
  steps: [],
  minutes: 10,
  domain: "Général",
  bricks: ["B1", "B2"],
  roadmap: "",
};
const tabs = [
  ["dashboard", "Vue d’ensemble", LayoutDashboard],
  ["cases", "Fiches de test", ListChecks],
  ["campaigns", "Campagnes", FlaskConical],
  ["issues", "Signalements", Bug],
  ["members", "Équipe", Users],
] as const;
function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null),
    closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    root?.querySelector<HTMLElement>("button,input,select,textarea")?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key === "Tab") {
        const list = [
          ...(root?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary",
          ) || []),
        ].filter((el) => el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="veil"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon" aria-label="Fermer" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function ResultTag({ verdict }: { verdict: Verdict | null | undefined }) {
  return (
    <Tag tone={verdict || "neutral"}>
      {verdict ? verdicts[verdict] : "À exécuter"}
    </Tag>
  );
}
function Auth({
  run,
  busy,
}: {
  run: (f: () => Promise<void>) => Promise<boolean>;
  busy: boolean;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const token = new URLSearchParams(location.search).get("token_hash");
  const verifiedToken = useRef<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (token) {
        validateNewPassword(password);
        const type = new URLSearchParams(location.search).get("type");
        if (type !== "invite" && type !== "recovery")
          throw new Error("Lien d’accès invalide.");
        if (verifiedToken.current !== token) {
          const { error } = await db.auth.verifyOtp({
            token_hash: token,
            type,
          });
          if (error) throw error;
          verifiedToken.current = token;
        }
        const updated = await db.auth.updateUser({ password });
        if (updated.error) throw updated.error;
        history.replaceState({}, "", location.pathname);
        location.reload();
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    });
  }
  return (
    <div className="auth-page">
      <div className="auth-intro">
        <div className="brand">
          <span className="brand-mark">
            <Check size={25} />
          </span>{" "}
          QA Workbench
        </div>
        <div>
          <p className="eyebrow">LA QUALITÉ, PAS À PAS</p>
          <h1>
            Chaque test compte.
            <br />
            Gardez-en la trace.
          </h1>
          <p>
            Un espace commun pour vérifier vos parcours,
            <br />
            partager vos observations et suivre les corrections.
          </p>
        </div>
        <small>Fiches précises. Résultats traçables. Progrès partagés.</small>
      </div>
      <div className="auth-form">
        <p className="eyebrow">VOTRE ESPACE DE RECETTE</p>
        <h2>
          {token ? "Définir votre mot de passe" : "Heureux de vous retrouver"}
        </h2>
        <p className="muted">
          {token
            ? "Le lien est individuel et temporaire."
            : "Connectez-vous avec le compte fourni par votre administrateur."}
        </p>
        <form onSubmit={submit}>
          {!token && (
            <Field label="Adresse e-mail">
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          )}
          <Field label="Mot de passe">
            <input
              type="password"
              autoComplete={token ? "new-password" : "current-password"}
              minLength={token ? 12 : 1}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button className="primary full" disabled={busy}>
            {token ? "Activer mon accès" : "Se connecter"}
            <ArrowUpRight size={17} />
          </button>
          {token && (
            <p className="small muted">
              Au moins douze caractères, avec majuscule, minuscule, chiffre et
              symbole.
            </p>
          )}
        </form>
        <p className="small muted">
          Besoin d’un accès ou mot de passe oublié ? Demandez un nouveau lien à
          votre administrateur.
        </p>
      </div>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(null),
    [authReady, setAuthReady] = useState(false),
    [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState(""),
    [data, setData] = useState<Data>(empty),
    [tab, setTab] = useState("dashboard"),
    [filter, setFilter] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [caseEditor, setCaseEditor] = useState<TestCase | "new" | null>(null),
    [campaignEditor, setCampaignEditor] = useState(false),
    [campaignId, setCampaignId] = useState(""),
    [active, setActive] = useState<Execution | null>(null),
    [activeIssue, setActiveIssue] = useState<Issue | null>(null),
    [invite, setInvite] = useState(false),
    [accessLink, setAccessLink] = useState(""),
    [newProject, setNewProject] = useState(false),
    [historyCase, setHistoryCase] = useState<TestCase | null>(null),
    [historyRows, setHistoryRows] = useState<
      { version: number; body: CaseBody; created_at: string }[]
    >([]);
  const user = session?.user.id || "";
  const myRole = data.members.find((m) => m.user_id === user && m.active)?.role;
  const editor = myRole === "admin" || myRole === "editor";
  async function run(work: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      return true;
    } catch (e) {
      setError(friendlyError(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function reload(p = project) {
    if (!p) return;
    setLoading(true);
    try {
      const [
        cases,
        campaigns,
        items,
        executions,
        issues,
        members,
        attachments,
        profiles,
        events,
      ] = await Promise.all([
        rows<TestCase>("test_cases", p),
        rows<Campaign>("campaigns", p),
        rows<Item>("campaign_items", p),
        rows<Execution>("executions", p),
        rows<Issue>("issues", p),
        rows<Member>("memberships", p),
        rows<Attachment>("attachments", p),
        rows<{ id: string; email: string }>("profiles"),
        rows<Data["events"][number]>("issue_events", p),
      ]);
      setData({
        cases,
        campaigns,
        items,
        executions,
        issues,
        members: members.map((m) => ({
          ...m,
          email: profiles.find((p) => p.id === m.user_id)?.email || m.user_id,
        })),
        attachments,
        events,
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!configured) {
      setAuthReady(true);
      return;
    }
    db.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    rows<Project>("projects")
      .then((list) => {
        if (alive) {
          setProjects(list);
          setProject((p) =>
            list.some((x) => x.id === p) ? p : list[0]?.id || "",
          );
        }
      })
      .catch((e) => setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [session?.user.id]);
  useEffect(() => {
    setData(empty);
    setCampaignId("");
    setActive(null);
    setActiveIssue(null);
    setCaseEditor(null);
    if (project) reload(project).catch((e) => setError(friendlyError(e)));
  }, [project]);
  const refresh = () => run(() => reload());
  const latest = (id: string) =>
    data.executions
      .filter((e) => e.item_id === id && e.verdict)
      .sort((a, b) =>
        String(b.submitted_at).localeCompare(String(a.submitted_at)),
      )[0];
  const memberName = (id: string | null) =>
    data.members.find((m) => m.user_id === id)?.email || "Non affectée";
  const allActive = data.cases.filter((c) => !c.archived),
    passed = data.items.filter(
      (i) => latest(i.id)?.verdict === "passed",
    ).length,
    failed = data.items.filter(
      (i) => latest(i.id)?.verdict === "failed",
    ).length,
    remaining = data.items.filter((i) => !latest(i.id)).length;
  async function execute(item: Item) {
    await run(async () => {
      const e = await rpc<Execution>("begin_execution", {
        p_item: item.id,
        p_id: crypto.randomUUID(),
      });
      setActive(e);
      await reload();
    });
  }
  async function openHistory(c: TestCase) {
    await run(async () => {
      const { data, error } = await db
        .from("case_versions")
        .select("version,body,created_at")
        .eq("case_id", c.id)
        .order("version", { ascending: false });
      if (error) throw error;
      setHistoryRows(data);
      setHistoryCase(c);
    });
  }
  if (!configured)
    return (
      <div className="setup">
        <div className="brand">
          <span className="brand-mark">
            <Check />
          </span>{" "}
          QA Workbench
        </div>
        <h1>Connecter votre espace de recette</h1>
        <p>
          Le service de données n’est pas encore configuré pour cette
          installation.
        </p>
        <p>
          Demandez au responsable de l’installation de terminer la configuration
          indiquée dans le guide de démarrage, puis de republier l’application.
        </p>
        <p className="muted">
          Aucun résultat ne sera enregistré tant que cette étape n’est pas
          terminée.
        </p>
      </div>
    );
  if (!authReady)
    return <div className="setup">Chargement de votre espace…</div>;
  if (!session || new URLSearchParams(location.search).has("token_hash"))
    return (
      <>
        <Auth run={run} busy={busy} />
        {error && (
          <div className="toast error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Fermer">
              ×
            </button>
          </div>
        )}
      </>
    );
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="brand-mark">
            <Check size={22} />
          </span>
          <span>
            QA Workbench<small>RECETTE MANUELLE</small>
          </span>
        </div>
        <p className="side-label">ESPACE DE TRAVAIL</p>
        <select
          aria-label="Projet"
          className="project-select"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          {!projects.length && <option>Aucun projet accessible</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "selected" : ""}
              onClick={() => {
                setTab(id);
                setFilter("");
              }}
            >
              <Icon size={19} />
              {label}
              {id === "issues" &&
                data.issues.filter((i) => i.status === "open").length > 0 && (
                  <span className="nav-count">
                    {data.issues.filter((i) => i.status === "open").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <span className="tiny-dot" /> Une fiche, un objectif.
          <p>
            Avancez par sessions de dix minutes. Chaque observation reste dans
            l’historique.
          </p>
        </div>
        <div className="user">
          <span className="avatar">
            {session.user.email?.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{session.user.email}</strong>
            <small>{myRole ? roles[myRole] : "Aucun projet attribué"}</small>
          </div>
          <button
            className="icon"
            aria-label="Se déconnecter"
            onClick={() =>
              run(async () => {
                const { error } = await db.auth.signOut();
                if (error) throw error;
                setProjects([]);
                setProject("");
                setData(empty);
              })
            }
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main>
        <header>
          <span>
            {projects.find((p) => p.id === project)?.name || "Votre espace"}
            <ChevronRight size={14} />
            <strong>{tabs.find((t) => t[0] === tab)?.[1]}</strong>
          </span>
          <button
            className="text-button"
            disabled={busy || loading}
            onClick={refresh}
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </header>
        <div className="content">
          {(error || notice) && (
            <div
              className={`banner ${error ? "error" : "success"}`}
              role={error ? "alert" : "status"}
            >
              {error || notice}
              <button
                className="icon"
                aria-label="Fermer le message"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading && (
            <div role="status" className="loading">
              Actualisation des données…
            </div>
          )}
          {!project ? (
            <div className="empty">
              <h2>Votre espace est prêt à être configuré</h2>
              <p>Votre administrateur doit vous affecter à un projet.</p>
            </div>
          ) : (
            <>
              {tab === "dashboard" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">VOTRE POINT DE DÉPART</p>
                      <h1>
                        La qualité se construit
                        <br className="mobile-break" /> une vérification à la
                        fois.
                      </h1>
                      <p className="muted">
                        Retrouvez vos campagnes et transformez vos observations
                        en progrès.
                      </p>
                    </div>
                    {editor && (
                      <button
                        className="primary"
                        onClick={() => setCampaignEditor(true)}
                      >
                        <Plus size={17} />
                        Nouvelle campagne
                      </button>
                    )}
                  </div>
                  <div className="stats">
                    {[
                      [
                        allActive.length,
                        "Fiches disponibles",
                        ListChecks,
                        "neutral",
                      ],
                      [passed, "Derniers résultats réussis", Check, "passed"],
                      [failed, "Derniers résultats en échec", Bug, "failed"],
                      [remaining, "Fiches encore à exécuter", Clock, "blocked"],
                    ].map(([n, label, Icon, tone]) => {
                      const Glyph = Icon as typeof Check;
                      return (
                        <div className={`stat ${tone}`} key={String(label)}>
                          <div>
                            <span className="stat-label">{String(label)}</span>
                            <strong>{String(n)}</strong>
                          </div>
                          <Glyph size={20} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Campagnes en cours</h2>
                          <p className="muted small">
                            Reprenez là où vous en étiez.
                          </p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setTab("campaigns")}
                        >
                          Tout voir
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {data.campaigns.filter((c) => c.status === "active")
                        .length ? (
                        data.campaigns
                          .filter((c) => c.status === "active")
                          .map((c) => {
                            const items = data.items.filter(
                                (i) => i.campaign_id === c.id,
                              ),
                              done = items.filter((i) => latest(i.id)).length;
                            return (
                              <button
                                className="campaign-card"
                                key={c.id}
                                onClick={() => {
                                  setTab("campaigns");
                                  setCampaignId(c.id);
                                }}
                              >
                                <div className="campaign-icon">
                                  <FlaskConical size={20} />
                                </div>
                                <div>
                                  <strong>{c.name}</strong>
                                  <p>{c.environment}</p>
                                  <div className="progress">
                                    <span
                                      style={{
                                        width: `${items.length ? (done / items.length) * 100 : 0}%`,
                                      }}
                                    />
                                  </div>
                                  <small>
                                    {done} / {items.length} fiches exécutées
                                  </small>
                                </div>
                                <ChevronRight size={18} />
                              </button>
                            );
                          })
                      ) : (
                        <Empty text="Lancez une première campagne pour organiser vos vérifications." />
                      )}
                    </section>
                    <section className="guide-card">
                      <span className="guide-icon">
                        <ListChecks size={28} />
                      </span>
                      <p className="eyebrow">UNE SESSION BIEN MENÉE</p>
                      <h2>
                        Dix minutes,
                        <br />
                        un objectif précis.
                      </h2>
                      <ol>
                        <li>Vérifiez les prérequis.</li>
                        <li>Suivez les étapes de la fiche.</li>
                        <li>Comparez le résultat attendu.</li>
                        <li>Enregistrez votre observation.</li>
                      </ol>
                      <p>
                        Un problème empêche de continuer ? Choisissez « Bloqué »
                        et expliquez pourquoi.
                      </p>
                    </section>
                  </div>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>À examiner en priorité</h2>
                      <Tag>
                        {
                          data.issues.filter(
                            (i) => !["verified", "closed"].includes(i.status),
                          ).length
                        }{" "}
                        ouverts
                      </Tag>
                    </div>
                    {data.issues
                      .filter((i) => !["verified", "closed"].includes(i.status))
                      .slice(0, 5)
                      .map((i) => (
                        <button
                          key={i.id}
                          className="issue-row"
                          onClick={() => {
                            setTab("issues");
                            setActiveIssue(i);
                          }}
                        >
                          <span className="issue-dot" />
                          <strong>{i.title}</strong>
                          <Tag>{kinds[i.kind]}</Tag>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    {!data.issues.length && (
                      <Empty text="Les observations de vos testeurs apparaîtront ici." />
                    )}
                  </section>
                </>
              )}
              {tab === "cases" && (
                <>
                  <PageHeading
                    title="Fiches de test"
                    text="Des scénarios précis, un historique qui reste."
                    action={
                      editor ? (
                        <button
                          className="primary"
                          onClick={() => setCaseEditor("new")}
                        >
                          <Plus size={17} />
                          Créer une fiche
                        </button>
                      ) : null
                    }
                  />
                  <SearchBox value={filter} set={setFilter} />
                  <div className="panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Fiche</th>
                          <th>Domaine</th>
                          <th>Briques</th>
                          <th>Durée</th>
                          <th>Version</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cases
                          .filter((c) =>
                            (c.code + " " + c.body.title + " " + c.body.domain)
                              .toLowerCase()
                              .includes(filter.toLowerCase()),
                          )
                          .map((c) => (
                            <tr key={c.id}>
                              <td>
                                <small className="code">{c.code}</small>
                                <strong>{c.body.title}</strong>
                                {c.archived && <Tag>Archivée</Tag>}
                              </td>
                              <td>{c.body.domain}</td>
                              <td>{c.body.bricks.join(" · ")}</td>
                              <td>{c.body.minutes} min</td>
                              <td>v{c.version}</td>
                              <td className="actions">
                                <button onClick={() => setCaseEditor(c)}>
                                  {editor && !c.archived ? "Modifier" : "Lire"}
                                </button>
                                <button onClick={() => openHistory(c)}>
                                  Historique
                                </button>
                                {editor && (
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      run(async () => {
                                        await rpc("archive_case", {
                                          p_id: c.id,
                                          p_version: c.version,
                                          p_archived: !c.archived,
                                        });
                                        await reload();
                                      })
                                    }
                                  >
                                    {c.archived ? "Restaurer" : "Archiver"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!data.cases.length && (
                      <Empty text="Créez une fiche ou importez les dix scénarios de démarrage avec la commande documentée." />
                    )}
                  </div>
                </>
              )}
              {tab === "campaigns" && (
                <>
                  <PageHeading
                    title="Campagnes"
                    text="Un environnement identifié, des résultats comparables."
                    action={
                      editor ? (
                        <button
                          className="primary"
                          onClick={() => setCampaignEditor(true)}
                        >
                          <Plus size={17} />
                          Nouvelle campagne
                        </button>
                      ) : null
                    }
                  />
                  <div className="campaign-tabs">
                    {data.campaigns.map((c) => (
                      <button
                        key={c.id}
                        className={campaignId === c.id ? "active" : ""}
                        onClick={() => setCampaignId(c.id)}
                      >
                        {c.name}
                        <Tag>
                          {c.status === "active"
                            ? "En cours"
                            : c.status === "closed"
                              ? "Terminée"
                              : "Archivée"}
                        </Tag>
                      </button>
                    ))}
                  </div>
                  {data.campaigns
                    .filter((c) => c.id === campaignId)
                    .map((c) => (
                      <div key={c.id}>
                        <div className="panel campaign-meta">
                          <div>
                            <h2>{c.name}</h2>
                            <p>{c.environment}</p>
                            <p className="small muted">
                              {Object.entries(c.builds)
                                .map(([b, v]) => `${b} : ${v}`)
                                .join(" · ") || "Versions non renseignées"}
                            </p>
                          </div>
                          {editor && (
                            <select
                              aria-label="État de la campagne"
                              value={c.status}
                              disabled={busy}
                              onChange={(e) =>
                                run(async () => {
                                  await rpc("set_campaign_status", {
                                    p_id: c.id,
                                    p_version: c.version,
                                    p_status: e.target.value,
                                  });
                                  await reload();
                                })
                              }
                            >
                              <option value="active">En cours</option>
                              <option value="closed">Terminée</option>
                              <option value="archived">Archivée</option>
                            </select>
                          )}
                        </div>
                        <div className="panel table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Scénario figé</th>
                                <th>Affectation</th>
                                <th>Dernier résultat</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.items
                                .filter((i) => i.campaign_id === c.id)
                                .map((i) => (
                                  <tr key={i.id}>
                                    <td>
                                      <small className="code">
                                        {i.snapshot.code} · v{i.case_version}
                                      </small>
                                      <strong>{i.snapshot.title}</strong>
                                      <small>{i.snapshot.minutes} min</small>
                                    </td>
                                    <td>
                                      {editor ? (
                                        <select
                                          aria-label={`Affectation ${i.snapshot.code}`}
                                          value={i.assignee_id || ""}
                                          disabled={busy}
                                          onChange={(e) =>
                                            run(async () => {
                                              await rpc("assign_item", {
                                                p_id: i.id,
                                                p_user: e.target.value || null,
                                                p_version: i.version,
                                              });
                                              await reload();
                                            })
                                          }
                                        >
                                          <option value="">Non affectée</option>
                                          {data.members
                                            .filter((m) => m.active)
                                            .map((m) => (
                                              <option
                                                key={m.user_id}
                                                value={m.user_id}
                                              >
                                                {m.email}
                                              </option>
                                            ))}
                                        </select>
                                      ) : (
                                        memberName(i.assignee_id)
                                      )}
                                    </td>
                                    <td>
                                      <ResultTag
                                        verdict={latest(i.id)?.verdict}
                                      />
                                      <small>
                                        {
                                          data.executions.filter(
                                            (e) =>
                                              e.item_id === i.id && e.verdict,
                                          ).length
                                        }{" "}
                                        résultat(s)
                                      </small>
                                    </td>
                                    <td>
                                      <button
                                        className="secondary"
                                        disabled={
                                          busy ||
                                          c.status !== "active" ||
                                          Boolean(
                                            i.assignee_id &&
                                            i.assignee_id !== user,
                                          )
                                        }
                                        onClick={() => execute(i)}
                                      >
                                        <Play size={14} />
                                        {latest(i.id)
                                          ? "Revérifier"
                                          : "Commencer"}
                                      </button>
                                      <details>
                                        <summary>Historique</summary>
                                        {data.executions
                                          .filter(
                                            (e) =>
                                              e.item_id === i.id && e.verdict,
                                          )
                                          .map((e) => (
                                            <div
                                              key={e.id}
                                              className="history-entry"
                                            >
                                              <ResultTag verdict={e.verdict} />
                                              <small>
                                                {memberName(e.author_id)} ·{" "}
                                                {new Date(
                                                  e.submitted_at!,
                                                ).toLocaleString("fr-FR")}
                                              </small>
                                              <p>{e.notes}</p>
                                              <button
                                                onClick={() => setActive(e)}
                                              >
                                                Détails
                                              </button>
                                            </div>
                                          ))}
                                      </details>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  {!campaignId && (
                    <Empty
                      text={
                        data.campaigns.length
                          ? "Sélectionnez une campagne pour afficher ses fiches."
                          : "Créez une campagne à partir de vos fiches disponibles."
                      }
                    />
                  )}
                </>
              )}
              {tab === "issues" && (
                <>
                  <PageHeading
                    title="Signalements"
                    text="Une observation précise pour une correction vérifiable."
                  />
                  <SearchBox value={filter} set={setFilter} />
                  <div className="panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Observation</th>
                          <th>Catégorie</th>
                          <th>État</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.issues
                          .filter((i) =>
                            (i.title + " " + i.actual)
                              .toLowerCase()
                              .includes(filter.toLowerCase()),
                          )
                          .map((i) => (
                            <tr key={i.id}>
                              <td>
                                <strong>{i.title}</strong>
                                <small>{i.actual.slice(0, 120)}</small>
                              </td>
                              <td>{kinds[i.kind]}</td>
                              <td>
                                <Tag
                                  tone={
                                    i.status === "verified"
                                      ? "passed"
                                      : "neutral"
                                  }
                                >
                                  {statuses[i.status]}
                                </Tag>
                              </td>
                              <td>
                                <button
                                  className="secondary"
                                  onClick={() => setActiveIssue(i)}
                                >
                                  Consulter
                                  <ArrowUpRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!data.issues.length && (
                      <Empty text="Pour signaler une observation, ouvrez un résultat de test validé." />
                    )}
                  </div>
                </>
              )}
              {tab === "members" && (
                <>
                  <PageHeading
                    title="Équipe"
                    text="Des accès individuels pour savoir qui a vérifié quoi."
                    action={
                      myRole === "admin" ? (
                        <button
                          className="primary"
                          onClick={() => {
                            setInvite(true);
                            setAccessLink("");
                          }}
                        >
                          <Plus size={17} />
                          Inviter un testeur
                        </button>
                      ) : null
                    }
                  />
                  <div className="panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Compte</th>
                          <th>Rôle</th>
                          <th>Accès</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.members.map((m) => (
                          <tr key={m.user_id}>
                            <td>
                              <strong>{m.email}</strong>
                              {m.user_id === user && <small>Vous</small>}
                            </td>
                            <td>
                              {myRole === "admin" ? (
                                <select
                                  aria-label={`Rôle ${m.email}`}
                                  value={m.role}
                                  disabled={busy}
                                  onChange={(e) =>
                                    run(async () => {
                                      await rpc("change_member", {
                                        p_project: project,
                                        p_user: m.user_id,
                                        p_role: e.target.value,
                                        p_active: m.active,
                                      });
                                      await reload();
                                    })
                                  }
                                >
                                  {Object.entries(roles).map(([r, l]) => (
                                    <option key={r} value={r}>
                                      {l}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                roles[m.role]
                              )}
                            </td>
                            <td>
                              <Tag tone={m.active ? "passed" : "neutral"}>
                                {m.active ? "Actif" : "Retiré"}
                              </Tag>
                            </td>
                            <td>
                              {myRole === "admin" && (
                                <>
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      run(async () => {
                                        await rpc("change_member", {
                                          p_project: project,
                                          p_user: m.user_id,
                                          p_role: m.role,
                                          p_active: !m.active,
                                        });
                                        await reload();
                                      })
                                    }
                                  >
                                    {m.active ? "Retirer l’accès" : "Rétablir"}
                                  </button>
                                  {m.active && (
                                    <button
                                      disabled={busy}
                                      onClick={() =>
                                        run(async () => {
                                          const { data, error } =
                                            await db.functions.invoke(
                                              "manage-access",
                                              {
                                                body: {
                                                  action: "recovery",
                                                  project_id: project,
                                                  email: m.email,
                                                },
                                              },
                                            );
                                          if (error || data?.error)
                                            throw (
                                              error || new Error(data.error)
                                            );
                                          setAccessLink(data.link);
                                          setInvite(true);
                                        })
                                      }
                                    >
                                      Nouveau lien
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {myRole === "admin" && (
                    <div className="admin-tools">
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await exportProject(project);
                            setNotice(
                              "Export téléchargé. Conservez-le dans un emplacement privé.",
                            );
                          })
                        }
                      >
                        <Download size={16} />
                        Exporter le projet et les captures
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setNewProject(true)}
                      >
                        Créer un autre projet
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <footer>
            QA Workbench{" "}
            <span>Un résultat conserve toujours son contexte.</span>
          </footer>
        </div>
      </main>
      {caseEditor && (
        <Modal
          title={
            caseEditor === "new" ? "Nouvelle fiche" : caseEditor.body.title
          }
          close={() => setCaseEditor(null)}
        >
          <CaseForm
            value={caseEditor === "new" ? undefined : caseEditor}
            editable={editor && (caseEditor === "new" || !caseEditor.archived)}
            busy={busy}
            save={async (code, body) => {
              const ok = await run(async () => {
                await rpc("save_case", {
                  p_project: project,
                  p_code: code,
                  p_body: body,
                  p_id: caseEditor === "new" ? null : caseEditor.id,
                  p_version: caseEditor === "new" ? null : caseEditor.version,
                });
                await reload();
              });
              if (ok) setCaseEditor(null);
            }}
          />
        </Modal>
      )}
      {historyCase && (
        <Modal
          title={`Historique — ${historyCase.code}`}
          close={() => setHistoryCase(null)}
        >
          {historyRows.map((h) => (
            <div className="history-entry" key={h.version}>
              <Tag>Version {h.version}</Tag>
              <small>{new Date(h.created_at).toLocaleString("fr-FR")}</small>
              <h3>{h.body.title}</h3>
              <p>{h.body.objective}</p>
              <ol>
                {h.body.steps.map((s, i) => (
                  <li key={i}>
                    {s.action}
                    <p className="muted">Attendu : {s.expected}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </Modal>
      )}
      {campaignEditor && (
        <Modal title="Nouvelle campagne" close={() => setCampaignEditor(false)}>
          <CampaignForm
            cases={allActive}
            busy={busy}
            save={async (name, environment, builds, cases) => {
              const ok = await run(async () => {
                const id = await rpc<string>("start_campaign", {
                  p_project: project,
                  p_name: name,
                  p_environment: environment,
                  p_builds: builds,
                  p_cases: cases,
                });
                await reload();
                setCampaignId(id);
                setTab("campaigns");
              });
              if (ok) setCampaignEditor(false);
            }}
          />
        </Modal>
      )}
      {active && (
        <Modal
          title={
            data.items.find((i) => i.id === active.item_id)?.snapshot.title ||
            "Exécution"
          }
          close={() => setActive(null)}
        >
          <ExecutionForm
            key={active.id}
            value={active}
            item={data.items.find((i) => i.id === active.item_id)!}
            attachments={data.attachments.filter(
              (a) => a.execution_id === active.id,
            )}
            busy={busy}
            canEdit={active.author_id === user && !active.verdict}
            run={run}
            reload={reload}
            onChange={(next) =>
              setActive((current) => (current?.id === next.id ? next : current))
            }
            onIssue={async (kind, title, actual) => {
              await run(async () => {
                await rpc("report_issue", {
                  p_execution: active.id,
                  p_kind: kind,
                  p_title: title,
                  p_actual: actual,
                });
                await reload();
                setNotice("Signalement enregistré.");
                setActive(null);
                setTab("issues");
              });
            }}
          />
        </Modal>
      )}
      {activeIssue && (
        <Modal title={activeIssue.title} close={() => setActiveIssue(null)}>
          <button
            onClick={() => {
              const execution = data.executions.find(
                (e) => e.id === activeIssue.execution_id,
              );
              if (execution) {
                setActiveIssue(null);
                setActive(execution);
              }
            }}
          >
            Consulter l’exécution et ses captures
          </button>
          <IssueForm
            issue={activeIssue}
            events={data.events.filter((e) => e.issue_id === activeIssue.id)}
            executions={data.executions.filter(
              (e) =>
                e.verdict === "passed" &&
                e.item_id ===
                  data.executions.find((o) => o.id === activeIssue.execution_id)
                    ?.item_id,
            )}
            editor={editor}
            busy={busy}
            save={async (status, resolution, verification) => {
              const ok = await run(async () => {
                await rpc("update_issue", {
                  p_id: activeIssue.id,
                  p_version: activeIssue.version,
                  p_status: status,
                  p_resolution: resolution,
                  p_verification: verification || null,
                });
                await reload();
              });
              if (ok) setActiveIssue(null);
            }}
          />
        </Modal>
      )}
      {invite && (
        <Modal
          title="Accès individuel"
          close={() => {
            setInvite(false);
            setAccessLink("");
          }}
        >
          {accessLink ? (
            <>
              <p>
                Transmettez ce lien uniquement à la personne concernée. Il
                expire après une heure et ne peut être utilisé qu’une fois.
              </p>
              <textarea
                readOnly
                aria-label="Lien individuel"
                value={accessLink}
              />
              <button
                className="primary"
                onClick={() =>
                  run(async () => {
                    await navigator.clipboard.writeText(accessLink);
                    setNotice("Lien copié.");
                  })
                }
              >
                Copier le lien
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                run(async () => {
                  const { data, error } = await db.functions.invoke(
                    "manage-access",
                    {
                      body: {
                        action: "invite",
                        project_id: project,
                        email: form.get("email"),
                        role: form.get("role"),
                      },
                    },
                  );
                  if (error || data?.error)
                    throw error || new Error(data.error);
                  if (data.link) setAccessLink(data.link);
                  else {
                    setInvite(false);
                    setNotice(
                      "Le compte existant a été ajouté au projet. Il peut utiliser son mot de passe habituel.",
                    );
                  }
                  await reload();
                });
              }}
            >
              <Field label="Adresse e-mail">
                <input name="email" type="email" required />
              </Field>
              <Field label="Rôle">
                <select name="role" defaultValue="tester">
                  {Object.entries(roles).map(([r, l]) => (
                    <option key={r} value={r}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <button className="primary" disabled={busy}>
                Préparer l’accès
              </button>
            </form>
          )}
        </Modal>
      )}
      {newProject && (
        <Modal title="Créer un projet" close={() => setNewProject(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name");
              run(async () => {
                const id = await rpc<string>("create_project", {
                  p_name: name,
                });
                setProjects(await rows<Project>("projects"));
                setProject(id);
                setNewProject(false);
              });
            }}
          >
            <Field label="Nom du projet">
              <input name="name" maxLength={160} required />
            </Field>
            <button className="primary" disabled={busy}>
              Créer
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function PageHeading({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">ESPACE DE RECETTE</p>
        <h1>{title}</h1>
        <p className="muted">{text}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <ListChecks size={25} />
      <p>{text}</p>
    </div>
  );
}
function SearchBox({
  value,
  set,
}: {
  value: string;
  set: (s: string) => void;
}) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        aria-label="Rechercher"
        placeholder="Rechercher une fiche ou une observation…"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );
}
function CaseForm({
  value,
  editable,
  busy,
  save,
}: {
  value?: TestCase;
  editable: boolean;
  busy: boolean;
  save: (code: string, b: CaseBody) => Promise<void>;
}) {
  const b = value?.body || blank;
  const [localError, setLocalError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        try {
          const steps = parseSteps(String(d.get("steps")));
          setLocalError("");
          void save(String(d.get("code")), {
            title: String(d.get("title")),
            objective: String(d.get("objective")),
            prerequisites: String(d.get("prerequisites")),
            steps,
            minutes: Number(d.get("minutes")),
            domain: String(d.get("domain")),
            bricks: String(d.get("bricks"))
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            roadmap: String(d.get("roadmap")),
            source: String(d.get("source")),
          });
        } catch (e) {
          setLocalError(friendlyError(e));
        }
      }}
    >
      <fieldset disabled={!editable}>
        <div className="form-grid">
          <Field label="Identifiant stable">
            <input
              name="code"
              defaultValue={value?.code || ""}
              pattern="[A-Z][A-Z0-9_\-]{1,39}"
              required
              readOnly={!!value}
              placeholder="ERP-011"
            />
          </Field>
          <Field label="Durée indicative (minutes)">
            <input
              name="minutes"
              type="number"
              min={1}
              max={120}
              defaultValue={b.minutes}
              required
            />
          </Field>
        </div>
        <Field label="Titre">
          <input name="title" defaultValue={b.title} maxLength={200} required />
        </Field>
        <Field label="Objectif">
          <textarea name="objective" defaultValue={b.objective} required />
        </Field>
        <Field label="Prérequis et données de test">
          <textarea name="prerequisites" defaultValue={b.prerequisites} />
        </Field>
        <Field label="Étapes : une ligne par action => résultat attendu">
          <textarea
            className="steps-input"
            name="steps"
            defaultValue={b.steps
              .map((s) => `${s.action} => ${s.expected}`)
              .join("\n")}
            required
          />
        </Field>
        <div className="form-grid">
          <Field label="Domaine">
            <input name="domain" defaultValue={b.domain} />
          </Field>
          <Field label="Briques (séparées par une virgule)">
            <input name="bricks" defaultValue={b.bricks.join(", ")} />
          </Field>
        </div>
        <Field label="Référence de roadmap">
          <input name="roadmap" defaultValue={b.roadmap} />
        </Field>
        <Field label="Références techniques">
          <input name="source" defaultValue={b.source} />
        </Field>
      </fieldset>
      {localError && (
        <p role="alert" className="error">
          {localError}
        </p>
      )}
      {editable && (
        <button className="primary" disabled={busy}>
          Enregistrer la fiche
        </button>
      )}
    </form>
  );
}
function CampaignForm({
  cases,
  busy,
  save,
}: {
  cases: TestCase[];
  busy: boolean;
  save: (
    n: string,
    e: string,
    b: Record<string, string>,
    c: string[],
  ) => Promise<void>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        void save(
          String(d.get("name")),
          String(d.get("environment")),
          Object.fromEntries(
            ["B1", "B2", "B3", "B4"].map((b) => [b, String(d.get(b))]),
          ),
          d.getAll("cases").map(String),
        );
      }}
    >
      <Field label="Nom de la campagne">
        <input
          name="name"
          required
          maxLength={160}
          placeholder="Recette ERP — première passe"
        />
      </Field>
      <Field label="Environnement et adresses utiles">
        <textarea
          name="environment"
          required
          defaultValue="ERP local — données synthétiques ; frontend : http://localhost:5173 ; portail : http://localhost:3000"
        />
      </Field>
      <div className="form-grid">
        {["B1", "B2", "B3", "B4"].map((b) => (
          <Field key={b} label={`${b} — version ou commit testé`}>
            <input name={b} placeholder="Commit ou non concerné" required />
          </Field>
        ))}
      </div>
      <p>Fiches à figer dans cette campagne :</p>
      <div className="checklist">
        {cases.map((c) => (
          <label key={c.id}>
            <input type="checkbox" name="cases" value={c.id} defaultChecked />
            <span>
              <strong>{c.code}</strong> {c.body.title}
            </span>
          </label>
        ))}
      </div>
      <button className="primary" disabled={busy || !cases.length}>
        Créer la campagne
      </button>
    </form>
  );
}
function ExecutionForm({
  value,
  item,
  attachments,
  busy,
  canEdit,
  run,
  reload,
  onChange,
  onIssue,
}: {
  value: Execution;
  item: Item;
  attachments: Attachment[];
  busy: boolean;
  canEdit: boolean;
  run: (f: () => Promise<void>) => Promise<boolean>;
  reload: () => Promise<void>;
  onChange: (e: Execution) => void;
  onIssue: (k: string, t: string, a: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(value.notes),
    [minutes, setMinutes] = useState(value.duration_minutes),
    [verdict, setVerdict] = useState<Verdict>("passed"),
    [dirty, setDirty] = useState(false);
  const save = (v: Verdict | null) =>
    run(async () => {
      const updated = await rpc<Execution>("save_execution", {
        p_id: value.id,
        p_version: value.version,
        p_notes: notes,
        p_minutes: minutes,
        p_verdict: v,
      });
      onChange(updated);
      setDirty(false);
      await reload();
    });
  return (
    <>
      <div className="execution-meta">
        <Tag>
          {item.snapshot.code} · v{item.case_version}
        </Tag>
        <Tag>
          <Clock size={12} />
          {item.snapshot.minutes} min indicatives
        </Tag>
        {value.verdict && <ResultTag verdict={value.verdict} />}
      </div>
      <p>{item.snapshot.objective}</p>
      <div className="prerequisites">
        <strong>Avant de commencer</strong>
        <p>
          {item.snapshot.prerequisites || "Aucun prérequis supplémentaire."}
        </p>
      </div>
      <ol className="test-steps">
        {item.snapshot.steps.map((s, i) => (
          <li key={i}>
            <strong>{s.action}</strong>
            <p>
              <span>Attendu</span>
              {s.expected}
            </p>
          </li>
        ))}
      </ol>
      <Field label="Résultat observé / notes">
        <textarea
          value={notes}
          disabled={!canEdit}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Décrivez ce qui s’est effectivement passé…"
        />
      </Field>
      <Field label="Temps passé (minutes)">
        <input
          type="number"
          min={0}
          max={1440}
          value={minutes}
          disabled={!canEdit}
          onChange={(e) => {
            setMinutes(Number(e.target.value));
            setDirty(true);
          }}
        />
      </Field>
      <h3>Captures</h3>
      {attachments.map((a) => (
        <div className="attachment" key={a.id}>
          <Paperclip size={16} />
          <span>{a.filename}</span>
          {a.state === "ready" ? (
            <button onClick={() => run(() => openCapture(a))}>Ouvrir</button>
          ) : (
            <>
              <Tag tone="blocked">En attente</Tag>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await rpc("finish_attachment", { p_id: a.id });
                    await reload();
                  })
                }
              >
                Confirmer l’envoi
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await rpc("finish_attachment", {
                      p_id: a.id,
                      p_cancel: true,
                    });
                    await reload();
                  })
                }
              >
                Annuler
              </button>
            </>
          )}
        </div>
      ))}
      {canEdit && (
        <Field label="Ajouter une capture (PNG, JPEG, WebP ; 5 Mo maximum)">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                run(async () => {
                  try {
                    validateImage(f);
                    await uploadCapture(value.id, f);
                  } finally {
                    await reload();
                  }
                });
              e.target.value = "";
            }}
          />
        </Field>
      )}
      {canEdit ? (
        <>
          <div className="form-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => save(null)}
            >
              Enregistrer le brouillon
            </button>
            <span className="small muted">
              {dirty
                ? "Modifications non enregistrées"
                : "Brouillon enregistré"}
            </span>
          </div>
          <div className="submit-result">
            <Field label="Verdict">
              <select
                value={verdict}
                onChange={(e) => setVerdict(e.target.value as Verdict)}
              >
                {Object.entries(verdicts).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="primary"
              disabled={busy}
              onClick={() => save(verdict)}
            >
              Valider le résultat
              <Check size={15} />
            </button>
          </div>
          <p className="small muted">
            Le résultat validé reste dans l’historique. Une nouvelle
            vérification créera un autre résultat.
          </p>
        </>
      ) : (
        value.verdict && (
          <details open={value.verdict === "failed"}>
            <summary>Créer un signalement à partir de ce résultat</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                void onIssue(
                  String(d.get("kind")),
                  String(d.get("title")),
                  String(d.get("actual")),
                );
              }}
            >
              <Field label="Catégorie">
                <select name="kind">
                  {Object.entries(kinds).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Titre">
                <input name="title" required maxLength={200} />
              </Field>
              <Field label="Observation précise et reproduction">
                <textarea name="actual" required defaultValue={value.notes} />
              </Field>
              <button className="primary" disabled={busy}>
                Enregistrer le signalement
              </button>
            </form>
          </details>
        )
      )}
    </>
  );
}
function IssueForm({
  issue,
  events,
  executions,
  editor,
  busy,
  save,
}: {
  issue: Issue;
  events: Data["events"];
  executions: Execution[];
  editor: boolean;
  busy: boolean;
  save: (s: string, r: string, v: string) => Promise<void>;
}) {
  return (
    <>
      <Tag>{kinds[issue.kind]}</Tag>
      <p className="pre-line">{issue.actual}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          void save(
            String(d.get("status")),
            String(d.get("resolution")),
            String(d.get("verification")),
          );
        }}
      >
        <fieldset disabled={!editor}>
          <Field label="État">
            <select name="status" defaultValue={issue.status}>
              {Object.entries(statuses).map(([s, l]) => (
                <option key={s} value={s}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Correction, commit ou décision">
            <textarea name="resolution" defaultValue={issue.resolution} />
          </Field>
          <Field label="Nouvelle vérification réussie">
            <select
              name="verification"
              defaultValue={issue.verification_execution_id || ""}
            >
              <option value="">Aucune sélection</option>
              {executions.map((e) => (
                <option key={e.id} value={e.id}>
                  {new Date(e.submitted_at!).toLocaleString("fr-FR")} —{" "}
                  {e.notes.slice(0, 60) || "Réussi"}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
        {editor && (
          <button className="primary" disabled={busy}>
            Enregistrer le suivi
          </button>
        )}
      </form>
      <h3>Historique du signalement</h3>
      {events
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((e) => (
          <div className="history-entry" key={e.id}>
            <small>{new Date(e.created_at).toLocaleString("fr-FR")}</small>
            <strong>{statuses[e.body.status]}</strong>
            <p>{e.body.resolution}</p>
          </div>
        ))}
    </>
  );
}
