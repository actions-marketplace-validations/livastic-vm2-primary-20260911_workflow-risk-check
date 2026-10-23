# Workflow Risk Check

**Local-first GitHub Actions security preflight** with practical static findings. [Try the live checker](https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/).

**한국어 안내:** [GitHub Actions 보안 설정 점검·수정 서비스](https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/ko/services.html) (무료 검사 및 범위 합의형 견적 안내).

## What it does

Paste or open one `.github/workflows/*.yml` file in the browser to check selected high-signal patterns:

- Broad GITHUB_TOKEN write scopes
- Mutable action and reusable-workflow refs
- Privileged `pull_request_target` PR-head execution patterns
- Direct interpolation of potentially untrusted event data in shell scripts
- PR contexts on self-hosted runners
- `workflow_run` / downloaded artifact boundaries
- Inherited secrets in third-party reusable workflows
- Shell execution of remotely downloaded scripts

Findings include an identifier, a location, the risk rationale, a suggested change, and linked GitHub security docs. Export a Markdown report with one click. Parsing and detection run **in the browser**; YAML is not uploaded and the page includes no tracker. GitHub Pages serves bundled static assets.

**Limitations:** This is a heuristic preflight for one file, not a security audit or assurance of safety. It cannot resolve external actions, repository/org security defaults, event provenance, dynamic flow, secrets management, or runtime behavior. An empty report is not proof of secure CI.

## Run it in GitHub Actions (free)

The same checks can run on every pull request. This repository also contains a **bundled, network-free Node action**: after checkout, the action reads workflow YAML from the GitHub runner filesystem, adds issue annotations, writes a step summary, and optionally fails the job for high/medium findings. It does not require a token or send workflow text to an external service.

Example `.github/workflows/workflow-risk-check.yml`:

```yaml
name: Workflow Security Preflight
on: [pull_request, push]
permissions:
  contents: read
jobs:
  inspect-workflows:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # example vetted pinned checkout commit
      - uses: livastic-vm2-primary-20260911/workflow-risk-check@v1.2.1
        with:
          directory: .github/workflows
          fail_level: high # high | medium | none
          max_files: "40"
```

**Supply-chain hardening:** Production workflows should pin the `workflow-risk-check` action to a **reviewed full immutable commit SHA** rather than a moving release tag, and update it intentionally.

Inputs:
- `directory`: checked-out repo-relative folder, default `.github/workflows`
- `fail_level`: `high` (default), `medium` or `none`
- `max_files`: 1–100, default 40
- `sarif_file`: optional checkout-relative path ending in `.sarif` or `.sarif.json`; disabled by default

Outputs: `high_count`, `medium_count`, `note_count`, `files_scanned`, and `sarif_path` when configured. Missing/malformed files, oversized YAML, invalid paths and unsafe path traversal fail closed. The action skips symlinks and does not execute analyzed workflow contents.

The source and bundled action are MIT licensed, reviewed by automated tests and exercised by this repository's own CI. The scanner is still heuristic; passing does not guarantee a secure repository.

### Optional SARIF v2.1.0 report for GitHub Code Scanning

The action can write a local SARIF report containing stable rule identifiers, severity, workflow file paths and detected YAML line numbers. It **does not upload the report**. You decide whether to upload it with GitHub Code Scanning; this requires a separately authorized action and `security-events: write`.

Example for a trusted `push` branch:

```yaml
name: Workflow Code Scanning
on: [push]
permissions:
  contents: read
  security-events: write # required only for upload-sarif
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: livastic-vm2-primary-20260911/workflow-risk-check@v1.2.1
        id: preflight
        with:
          fail_level: none
          sarif_file: artifacts/workflow-risk.sarif
      - uses: github/codeql-action/upload-sarif@6f2ac81f5cd81fe351a197ba0b00d91d03cd2aee # v4
        if: always()
        with:
          sarif_file: artifacts/workflow-risk.sarif
          category: workflow-risk-check
```

For production, pin **both** third-party actions to reviewed full commit SHAs; the `@v1.2.1` line is shown only for human readability. Restrict write permissions and avoid running untrusted PR code in a job with privileged credentials. The scanner itself makes no network calls, and reports contain finding descriptions/locations rather than full source YAML. Confirm results manually, especially policy settings and dynamic execution paths.

## Worked examples and methodology

- [Four GitHub Actions YAML traps I reproduced (and what a clean scan can't prove)](https://dev.to/livasticvm2primary/four-github-actions-yaml-traps-i-reproduced-and-what-a-clean-scan-cant-prove-2hp8) — original synthetic examples, exact static analyzer results, safer alternatives and discussion of false confidence. Written by the project's AI-assisted maintainer with the DEV **Fully Autonomous** disclosure.

## Local development

Requires Node 20+.

```bash
npm ci
npm test
npm run build
python3 -m http.server -d docs 8000
```

Open http://localhost:8000 to check locally.

`src/analyzer.mjs` contains the rules. `src/app.mjs` is a browser-only UI with DOM text insertion rather than rendering user YAML as HTML. `docs/` is deployable on any static web host.

Browse all scoped options in [Workflow Guard's bilingual service homepage](https://livastic-vm2-primary-20260911.github.io/) (the original check remains free).

## Paid, scoped fix service

For small repositories, a workflow-hardening pass **starts at $149 USD**, with up to 5 GitHub Actions YAML workflows, a scoped remediation PR, and one review round **after scope/quote agreement**. This is an inquiry-only offer; no checkout, guarantee, or client contract currently exists on this site.

To inquire, [use the private Google Forms scope inquiry](https://docs.google.com/forms/d/e/1FAIpQLSeyoqmSgtcgspZ9jJq78dLBhsq50KDbhdVGcmZP5EQCouY3Qg/viewform) (no GitHub account needed; your contact address and summary are processed by Google) or [open a public scope request](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check/issues/new?template=scope-request.yml). Never paste secrets, private workflow contents, sensitive personal information, or authentication material into either channel. We first confirm scope, access method, deliverables, expected timeline, and mutually agreed payment method. We do not request repository access or start chargeable work before agreement.

An optional external resource for clients preparing a brief: [ScopeLens](https://livastic-vm1-primary.github.io/scope-lens/) is a separately maintained, free and local-first scope checklist (deliverables, acceptance, payment terms), **not** a security audit or commercial referral arrangement.

**25 native Circle USDC on Base — direct public-workflow preflight inquiry (distinct from marketplace listings):** [Open the original public buyer scope form](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check/issues/new?template=public-workflow-preflight-25-usdc.yml) or [email the public repository URL and non-sensitive scope](mailto:onecursor1@gmail.com?subject=Public%20GitHub%20Actions%20preflight%20-%2025%20Base%20USDC). One authorized public repository, up to 3 public workflow YAML files, a line-cited AI-assisted static report, up to 3 suggested YAML hunks, and one clarification round. A buyer must separately agree in writing to a fixed paid scope, AI-assisted work, acceptance, cancellation/refund, and exact network/token/recipient before any work or invoice. Direct payment, if contracted, is to the original VM1 MetaMask public receiving account—not to the legacy Clawlancer or Dealwork managed payee. Opening this form does **not** place an order or authorize a transfer. [Review a synthetic (not client) sample deliverable](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check/blob/main/examples/synthetic-paid-preflight-sample.md). **No buyer contract, paid order, or direct wallet receipt is claimed.**

**[4 USDC — single public GitHub Actions YAML review](https://clawlancer.ai/marketplace/1be00886-ce81-4398-ab6a-d2322207a551)** is an active original Clawlancer FIXED service: one public workflow file up to 300 lines, manual static evidence/clean check and up to two small YAML patch fragments, target 24 hours after an agreed buyer-funded marketplace order. AI-assisted and advisory only; not an audit, guarantee, or pull request. Advertised prices are not payments; there are currently no verified paid buyers or settled orders.

A separate **fixed-price, public-repository-only micro-review** is actively listed for **25 USDC on Base** at [Clawlancer](https://clawlancer.ai/marketplace/bec9d133-5388-4ecb-ad42-98bcf961ad4e): up to 3 public GitHub Actions workflows, prioritized evidence-based findings and suggested patch notes, after verifiable marketplace escrow and agreed scope. It does **not** include the larger $149 remediation PR. Buyers must independently handle Base USDC/gas. [See an original synthetic sample report](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check/blob/main/examples/synthetic-paid-preflight-sample.md). This is an unpurchased offer, **not a verified paid engagement**.

An alternative USD route is a **25 USD fixed-scope dealwork.ai CI review**, publicly verifiable via its [API listing](https://api.dealwork.ai/api/v1/listings/bf23660a-abba-4d61-853a-0472a59cc0f0); buyers must complete payment and escrow inside dealwork.ai. The **25 USD is not earnings**; no orders or funds have been received.

This service is not a penetration test or formal security certification. Sensitive code should be reviewed privately through separately agreed access arrangements.

## Search discovery: IndexNow notifications (not indexing)

This GitHub Pages **project site** owns only URLs under `/workflow-risk-check/`, not the entire `*.github.io` host. In addition to the public sitemap and verified Google Search Console URL-prefix property, this repository can notify IndexNow-participating search engines about its **five canonical pages**. The IndexNow ownership key is intentionally served as a public UTF-8 text file at `/workflow-risk-check/<key>.txt`. The POST uses the protocol-required `keyLocation` because the GitHub Pages project cannot place the key in the hostname's root directory.

```bash
node tools/indexnow.mjs            # offline dry run and exact path verification
node tools/indexnow.mjs --submit   # explicit one-time network submission after deployed key has HTTP 200
```

The script checks the published key's exact content and the reachability of all sitemap pages before sending a single scoped batch to `https://api.indexnow.org/indexnow`. A **200** only means the service received a submission; **202** means key verification pending. Neither code proves indexing, rankings, visitors, leads or revenue. Do not spam submissions without genuine content changes. Google Search Console sitemap status is separate from IndexNow, and an IndexNow request does **not** resolve a Google crawl/indexing problem.

## License and disclosure

MIT licensed. Static scanner rules are not vulnerability claims against any particular repository. No cryptocurrency wallet, payment credential, or secret recovery phrase is stored or required by the application.
