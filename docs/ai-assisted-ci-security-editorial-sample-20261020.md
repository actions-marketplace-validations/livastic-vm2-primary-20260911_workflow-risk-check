# Testing an AI-Written GitHub Actions Workflow Without Mistaking a Green Check for Security

*Public technical writing sample — AI-assisted preparation; built around an independently runnable, open-source workflow checker. This is a reproducible example, not a customer case study or a security certification.*

**Audience:** developers reviewing GitHub Actions pull-request workflows  
**Original test fixture:** synthetic YAML; no client repository, credential, exploit, or private data  
**Reference implementation:** [Workflow Risk Check](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check)

## The failure mode: a check can succeed while the trust boundary fails

A CI job that finishes green establishes that its commands completed. It does not establish that those commands ran with the intended authority or executed code from the intended source.

Consider a deliberately unsafe *synthetic* workflow:

```yaml
name: pr-review
on: pull_request_target
permissions:
  contents: write
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: npm test
```

A `pull_request_target` workflow runs in the context of the base repository. The `checkout` step explicitly chooses the incoming pull request's head commit, and the following step executes that checkout's test script. If this job receives privileged credentials or broad write permissions, code controlled by a less-trusted contributor can cross a trust boundary before anyone reviews the patch.

The distinctive problem is the *combination*, not merely one YAML token. Other deployments legitimately use `pull_request_target` for non-executing metadata actions. The appropriate question is whether a privileged event handler runs code or reads artifacts influenced by an untrusted contributor.

## Create a repeatable review instead of relying on intuition

A reviewer can inspect three independent properties:

1. **Trigger and source provenance.** Which event starts the job? Which SHA does the checkout step actually fetch? Is untrusted fork code evaluated?
2. **Authority.** Are repository write capabilities, inherited secrets, deployment credentials, or privileged runners accessible in the same execution path?
3. **Dependency stability.** Are third-party actions pinned to reviewed immutable commits, or can a mutable tag move between reviews?

For the fixture above, the review should flag the privileged-trigger/untrusted-head combination, unnecessary repository write scope, and use of a mutable action reference. These are indicators to investigate, not proof that a real repository has been compromised.

A lower-risk workflow intended only to test contributed code would usually start from the ordinary `pull_request` event, set `permissions: contents: read`, avoid exposing secrets, and pin actions to reviewed commit SHAs. A workflow that must comment, label, or deploy needs a separate trusted decision and execution path; blindly changing its trigger can break the business process without creating a safe replacement.

## Demonstrate behavior with executable tests

The open-source [Workflow Risk Check](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check) package provides a browser-local static preflight and a separately runnable GitHub Action. It scans a bounded set of workflow YAML files, emits machine-checkable finding identifiers and line locations, and can generate a SARIF report. The example above is a manually constructed teaching fixture; readers should run the checker on their own sanitized test file rather than assume the prose proves a production result.

As checked in the original source tree on **20 October 2026**, running `npm test` produced **42 passed, 0 failed**. This is a regression-test result for the checker implementation, not a demonstration that any organization is secure. Anyone using the example should also inspect the code and rerun the tests at their checked-out commit rather than trust a screenshot or a claimed success.

The analyzer deliberately does not upload YAML, dynamically resolve remote actions, verify permissions configured outside the current file, simulate runner environments, or prove that a full workflow is safe. It identifies static patterns for subsequent human or authorized engineering review.

## Build an editorial verification trail

A technical article benefits from the same quality gates as an application patch:

- Define an exact synthetic input and its expected findings.
- Record the executable command, source revision, and observed pass/fail count.
- Separate facts confirmed by tooling from assumptions about deployed systems.
- Cite original platform documentation for trust-boundary behavior.
- Include meaningful limitations and a counterexample so the reader does not interpret static checks as certification.

This also makes assisted writing easier to audit: text can be revised for clarity while technical claims remain traceable to public source, fixtures, and repeatable observations. There is no substitute for a qualified editor checking the final scope and accuracy before a client accepts publication.

**Primary references:** [GitHub security guidance on preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/) · [GitHub Actions workflow trigger events](https://docs.github.com/en/actions/reference/events-that-trigger-workflows) · [Source and tests](https://github.com/livastic-vm2-primary-20260911/workflow-risk-check).

*Disclosure: This is an AI-assisted portfolio draft using original open-source material and a synthetic example. It is not represented as a previously commissioned, human-written, client-approved, or paid article.*
