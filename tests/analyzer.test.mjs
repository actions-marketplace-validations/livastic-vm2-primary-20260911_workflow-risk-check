import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeWorkflow } from "../src/analyzer.mjs";
const issues = (src) => analyzeWorkflow(src).findings.map(item => item.id);

test("minimal workflow parses and warns about default token", () => {
  const findings=issues("on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps: [{run: echo hi}]\n");
  assert.deepEqual(findings,["DEFAULT_TOKEN"]);
});
test("pinned action with limited permissions has no findings",()=>{
  const findings=issues("on: push\npermissions: {contents: read}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@0123456789abcdef0123456789abcdef01234567\n");
  assert.deepEqual(findings,[]);
});
test("mutable action references and broad tokens found",()=>{
  const findings=issues("on: push\npermissions: write-all\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n");
  assert(findings.includes("ACTION_UNPINNED"));
  assert(findings.includes("TOKEN_WRITE_ALL"));
});
test("PR target requires manual trust boundary checks",()=>{
  const findings=issues("on: pull_request_target\npermissions: {contents: read}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo safe\n");
  assert(findings.includes("TARGET_CONTEXT"));
  assert(!findings.includes("TARGET_UNTRUSTED_CODE"));
});
test("self-hosted runner in PR context flagged",()=>{
  const findings=issues("on: pull_request\npermissions: {contents: read}\njobs:\n  build:\n    runs-on: [self-hosted, linux]\n    steps: [{run: echo hi}]\n");
  assert(findings.includes("SELF_HOSTED_PR"));
});
test("reusable workflow inheriting secrets flagged",()=>{
  const findings=issues("on: push\njobs:\n  build:\n    uses: someone/tools/.github/workflows/build.yml@main\n    secrets: inherit\n");
  assert(findings.includes("INHERITED_SECRETS"));
  assert(findings.includes("REUSABLE_UNPINNED"));
});
test("malformed YAML and missing jobs are errors",()=>{
  assert.match(analyzeWorkflow("key: [").error,/YAML parse error/);
  assert.match(analyzeWorkflow("key: value").error,/jobs/);
});
test("large YAML input is rejected",()=>{
  assert.match(analyzeWorkflow("on: push\n" + " ".repeat(240001)).error,/too large/);
});
