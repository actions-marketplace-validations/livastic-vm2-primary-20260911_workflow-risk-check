# Workflow Risk Check

**Local-first GitHub Actions security preflight** with practical static findings. [Try the live checker](https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/).

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

To inquire, [open a public scope request](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check/issues/new?template=scope-request.yml). Never paste secrets, private workflow contents, personal information, or authentication material into a public issue. We first confirm scope, access method, deliverables, expected timeline, and mutually agreed payment method. We do not request repository access or start chargeable work before agreement.

This service is not a penetration test or formal security certification. Sensitive code should be reviewed privately through separately agreed access arrangements.

## License and disclosure

MIT licensed. Static scanner rules are not vulnerability claims against any particular repository. No cryptocurrency wallet, payment credential, or secret recovery phrase is stored or required by the application.
