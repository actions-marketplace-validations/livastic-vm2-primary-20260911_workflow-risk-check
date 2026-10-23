// Optional, user-initiated, content-free quote summary. No HTTP calls, no YAML.
const KNOWN_RULE_IDS = new Set([
  "TOKEN_WRITE_ALL", "DEFAULT_TOKEN", "WORKFLOW_WRITE", "TARGET_CONTEXT",
  "JOB_WRITE_ALL", "JOB_WRITE", "SELF_HOSTED_PR", "REUSABLE_UNPINNED",
  "INHERITED_SECRETS", "ACTION_UNPINNED", "SHELL_INTERPOLATION",
  "REMOTE_SHELL", "TARGET_UNTRUSTED_CODE", "WORKFLOW_RUN_ARTIFACT"
]);
function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100000 ? value : 0;
}
export function makeQuoteBrief(result) {
  if (!result || result.error || !result.counts || !Array.isArray(result.findings)) {
    throw new Error("Run a valid workflow scan first.");
  }
  const counts = result.counts;
  const rules = [...new Set(result.findings.map(f => f?.id)
    .filter(id => typeof id === "string" && KNOWN_RULE_IDS.has(id)))].sort();
  return [
    "GitHub Actions workflow - optional paid review scope (not an order)",
    "Scope: 1 publicly shareable workflow YAML, maximum 300 lines.",
    "Local static scan: " + safeCount(counts.high) + " high, "
      + safeCount(counts.medium) + " medium, " + safeCount(counts.note) + " note findings.",
    "Rule identifiers: " + (rules.length ? rules.join(", ") : "none from the included checks"),
    "Please confirm exact scope, price, acceptance and payment terms before work.",
    "Advertised offer: 4 USDC starter on Clawlancer (Base); not a contract until agreed/funded.",
    "Privacy: no YAML, repository names, filenames, credentials, tokens, or paths are included.",
    "Never share private YAML or credentials. Static heuristics are not a security audit."
  ].join("\n");
}
