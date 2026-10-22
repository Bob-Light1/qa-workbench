export type Role = "admin" | "editor" | "tester";
export type Verdict = "passed" | "failed" | "blocked" | "skipped";
export type Step = { action: string; expected: string };
export type CaseBody = {
  title: string;
  objective: string;
  prerequisites: string;
  steps: Step[];
  minutes: number;
  domain: string;
  bricks: string[];
  roadmap: string;
  source?: string;
};
export type TestCase = {
  id: string;
  project_id: string;
  code: string;
  body: CaseBody;
  version: number;
  archived: boolean;
};
export type Campaign = {
  id: string;
  name: string;
  environment: string;
  builds: Record<string, string>;
  status: string;
  version: number;
};
export type Item = {
  id: string;
  campaign_id: string;
  case_id: string;
  case_version: number;
  snapshot: CaseBody & { code: string };
  assignee_id: string | null;
  version: number;
};
export type Execution = {
  id: string;
  item_id: string;
  author_id: string;
  notes: string;
  duration_minutes: number;
  verdict: Verdict | null;
  version: number;
  submitted_at: string | null;
  created_at: string;
};
export type Issue = {
  id: string;
  execution_id: string;
  kind: string;
  title: string;
  actual: string;
  status: string;
  resolution: string;
  version: number;
  verification_execution_id: string | null;
};
export type Attachment = {
  id: string;
  execution_id: string;
  filename: string;
  object_path: string;
  state: string;
  mime_type: string;
  bytes: number;
};
export type Member = {
  user_id: string;
  role: Role;
  active: boolean;
  email?: string;
};
export const verdicts: Record<Verdict, string> = {
  passed: "Réussi",
  failed: "Échoué",
  blocked: "Bloqué",
  skipped: "Non exécuté",
};
export const roles: Record<Role, string> = {
  admin: "Administrateur",
  editor: "Rédacteur",
  tester: "Testeur",
};
export const kinds: Record<string, string> = {
  defect: "Anomalie produit",
  suggestion: "Suggestion",
  case_error: "Erreur dans la fiche",
  environment: "Environnement",
};
export const statuses: Record<string, string> = {
  open: "À analyser",
  in_progress: "En cours",
  fixed: "Corrigé, à vérifier",
  verified: "Vérifié",
  closed: "Clos",
};
export function validateImage(file: { size: number; type: string }) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choisissez une image PNG, JPEG ou WebP.");
  if (file.size < 1 || file.size > 5 * 1024 * 1024)
    throw new Error("La capture doit peser entre 1 octet et 5 Mo.");
}
export function parseSteps(text: string): Step[] {
  const steps = text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const i = line.indexOf(" => ");
      if (i < 1)
        throw new Error(
          "Chaque étape doit suivre le format : action => résultat attendu.",
        );
      return {
        action: line.slice(0, i).trim(),
        expected: line.slice(i + 4).trim(),
      };
    });
  if (!steps.length || steps.some((s) => !s.expected))
    throw new Error("Renseignez au moins une étape et son résultat attendu.");
  return steps;
}
export function validateNewPassword(password: string): void {
  if (new TextEncoder().encode(password).length > 72)
    throw new Error(
      "Le mot de passe doit tenir dans 72 octets (72 caractères sans accent au maximum).",
    );
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  )
    throw new Error(
      "Le mot de passe doit contenir au moins douze caractères, avec majuscule, minuscule, chiffre et symbole.",
    );
}
export function friendlyError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message ?? error);
  const messages: Record<string, string> = {
    VERSION_CONFLICT:
      "Cette donnée a été modifiée ailleurs. Rechargez avant de réessayer.",
    FORBIDDEN: "Vous ne disposez pas des droits nécessaires.",
    LAST_ADMIN: "Conservez au moins un administrateur actif.",
    RESULT_IMMUTABLE:
      "Ce résultat est définitif. Créez une nouvelle vérification.",
    ASSIGNED_TO_OTHER: "Cette fiche est affectée à un autre testeur.",
    NOTES_REQUIRED: "Décrivez le résultat observé avant de valider.",
    UPLOAD_PENDING:
      "Une capture est encore en attente. Terminez son envoi ou annulez-le.",
    UPLOAD_NOT_FOUND:
      "La capture n’est pas entièrement enregistrée. Réessayez.",
    PASSING_RETEST_REQUIRED:
      "Sélectionnez une nouvelle vérification réussie de la même fiche.",
    CAMPAIGN_CLOSED: "Cette campagne est terminée.",
    CAMPAIGN_CLOSED_OR_REASSIGNED:
      "La campagne a été fermée ou la fiche réaffectée.",
    RESOLUTION_REQUIRED: "Renseignez la correction ou la décision.",
    SUBMIT_RESULT_FIRST: "Validez d’abord le résultat du test.",
  };
  return (
    Object.entries(messages).find(([code]) => message.includes(code))?.[1] ??
    (message.includes("Invalid login")
      ? "Adresse ou mot de passe incorrect."
      : /expired|invalid.*token|token.*invalid/i.test(message)
        ? "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien à votre administrateur."
        : /password.*(should|contain|weak|least)/i.test(message)
          ? "Le mot de passe doit contenir au moins douze caractères, avec majuscule, minuscule, chiffre et symbole."
          : message)
  );
}
