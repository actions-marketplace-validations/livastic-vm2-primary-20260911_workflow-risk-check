# Sample deliverable — GitHub Actions CI preflight (synthetic example)

**Illustration only, not a paid order, client engagement, disclosed vulnerability, penetration test or claim of a real-world compromise.** This is the *type* of focused Markdown report offered in the [25 USDC public-workflow review](https://clawlancer.ai/marketplace/bec9d133-5388-4ecb-ad42-98bcf961ad4e). The original free static scanner is [Workflow Risk Check](https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/).

## 1. Scope and assumptions

- Source: synthetic eleven-line `.github/workflows/pr-check.yml` shown below, **not a third-party project's workflow**.
- Date/model: 2026-10-17; built-in static rules, no runtime execution and no repository-level permission verification.
- Objective: triage GitHub Actions supply-chain and pull request trust-boundary patterns, identify minimal safer approach.
- Not included: secrets, privileged accounts, hidden repository settings, all dependency transitive risk, exploit reproduction or formal security certification.

## 2. Input (line-numbered for illustration)

```yaml
1  name: PR check
2  on: pull_request_target
3  permissions: {contents: write}
4  jobs:
5    test:
6      runs-on: ubuntu-latest
7      steps:
8        - uses: actions/checkout@v4
9          with:
10           ref: ${{ github.event.pull_request.head.sha }}
11       - run: npm test
```

This numbered block is for reading, not direct machine parsing; remove the prefixed numbers before copying it.

## 3. Observed scanner output and manual interpretation

Actual `analyzeWorkflow` result for this unnumbered YAML: **1 high, 2 medium, 1 note**. The findings are heuristic **observations of syntax in this synthetic file**:

| Severity | Rule | Line | Review and suggested action |
| --- | --- | --- | --- |
| High | `TARGET_UNTRUSTED_CODE` | 8 | The trusted-context `pull_request_target` event checks out an externally supplied PR head and later invokes `npm test`. This crosses a significant trust boundary if a PR changes executable code; use `pull_request` for untrusted test execution and separate trusted write operations. |
| Medium | `ACTION_UNPINNED` | 8 | `actions/checkout@v4` is a moving tag; pin a **reviewed** immutable commit SHA. A mutable tag is an exposure, not proof of malicious code. |
| Medium | `WORKFLOW_WRITE` | 3 | Workflow-wide `contents: write` is broader than a test normally needs; scope write permission only to a separate authorized job after review. |
| Note | `TARGET_CONTEXT` | 2 | `pull_request_target` runs in a privileged base-repository context. Using that event is not automatically unsafe; the checkout/run combination creates the modeled issue. |

**No unsupported conclusions:** The analyzer never inspected branch protection, token restrictions, settings, actual fork provenance, custom scripts or network behavior. A clean scan would not certify safety.

## 4. Focused proposed replacement (illustration)

```yaml
name: PR check
on: pull_request
permissions: {contents: read}
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # example reviewed pin (v4.2.2)
      - run: npm test
```

This alternate synthetic workflow was fed into the same analyzer and produced **0 high, 0 medium and 0 note findings** in the specific ruleset. That is **not proof the job, scripts, dependencies, actions or repository are secure**; review the pinned SHA independently.

## 5. Reproduction, decision and buyer handoff

1. Open [the free checker](https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/) and paste the unnumbered source block. Confirm rule IDs and lines.
2. Confirm whether privileged GitHub token permissions or trusted release operations are *actually* required; if so, isolate them to authorized jobs rather than allowing untrusted PR scripts to run with those privileges.
3. Record the chosen minimum permissions, approved action SHAs, and regression validation command. Run project tests and check GitHub event semantics after the change.
4. Before any paid service starts, buyer specifies **one public repository, no more than three public workflow YAML files**, desired acceptance, payment through verifiable marketplace escrow, and any excluded workflow. Delivery is a written report and up to three prioritized patch snippets, not an automatic PR merge.

**Paid quote scope:** 25 USDC is the published listing price, **not money received**. The larger [$149-from GitHub Actions remediation inquiry](https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/) covers a separately negotiated larger workflow/PR scope. No real buyers or earnings are evidenced by this sample report.
