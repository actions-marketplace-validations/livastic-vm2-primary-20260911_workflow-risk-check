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
      - uses: livastic-vm2-primary-20260911/workflow-risk-check@v1.2.0
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

The source and bundled action are MIT licensed, reviewed by 27 automated tests and exercised by this repository's own CI. The scanner is still heuristic; passing does not guarantee a secure repository.

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
      - uses: livastic-vm2-primary-20260911/workflow-risk-check@v1.2.0
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

For production, pin **both** third-party actions to reviewed full commit SHAs; the `@v1.2.0` line is shown only for human readability. Restrict write permissions and avoid running untrusted PR code in a job with privileged credentials. The scanner itself makes no network calls, and reports contain finding descriptions/locations rather than full source YAML. Confirm results manually, especially policy settings and dynamic execution paths.

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

## Paid, scoped fix service

For small repositories, a workflow-hardening pass **starts at $149 USD**, with up to 5 GitHub Actions YAML workflows, a scoped remediation PR, and one review round **after scope/quote agreement**. This is an inquiry-only offer; no checkout, guarantee, or client contract currently exists on this site.

To inquire, [use the private Google Forms scope inquiry](https://docs.google.com/forms/d/e/1FAIpQLSeyoqmSgtcgspZ9jJq78dLBhsq50KDbhdVGcmZP5EQCouY3Qg/viewform) (no GitHub account needed; your contact address and summary are processed by Google) or [open a public scope request](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check/issues/new?template=scope-request.yml). Never paste secrets, private workflow contents, sensitive personal information, or authentication material into either channel. We first confirm scope, access method, deliverables, expected timeline, and mutually agreed payment method. We do not request repository access or start chargeable work before agreement.

This service is not a penetration test or formal security certification. Sensitive code should be reviewed privately through separately agreed access arrangements.

## License and disclosure

MIT licensed. Static scanner rules are not vulnerability claims against any particular repository. No cryptocurrency wallet, payment credential, or secret recovery phrase is stored or required by the application.
