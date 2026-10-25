export function acceptanceTarget(url, hosted, config) {
  if (hosted && url === "https://xtgaepikylepriipuyps.supabase.co")
    return { hosted: true, suffix: ".hosted", label: "Hosted" };
  if (
    !hosted &&
    /^project_id\s*=\s*"qa-workbench-validation"\s*$/m.test(config) &&
    ["http://127.0.0.1:55321", "http://localhost:55321"].includes(url)
  )
    return { hosted: false, suffix: "", label: "Local" };
  throw new Error(
    "Acceptance requires the owned local validation stack, or --hosted with the exact approved QA Supabase project. No fixtures created.",
  );
}
