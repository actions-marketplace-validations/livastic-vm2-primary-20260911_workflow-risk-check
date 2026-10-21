import {test} from "node:test";
import assert from "node:assert/strict";
import {analyzeWorkflow} from "../src/analyzer.mjs";
const list = text=>analyzeWorkflow(text).findings.map(x=>x.id);
const expr = "$" + "{{" + " github.event.issue.title " + "}}";
const head = "$" + "{{" + " github.event.pull_request.head.sha " + "}}";

test("GitHub event issue title directly in a shell step is flagged",()=>{
  const yaml = ["on: issues","jobs:","  check:","    runs-on: ubuntu-latest","    steps:","      - run: echo \""+expr+"\""].join("\n");
  assert(list(yaml).includes("SHELL_INTERPOLATION"));
});
test("untrusted event data in env but not run avoids this interpolation rule",()=>{
  const yaml=["on: issues","jobs:","  check:","    runs-on: ubuntu-latest","    steps:","      - env:","          TITLE: "+expr,"        run: echo good"].join("\n");
  assert(!list(yaml).includes("SHELL_INTERPOLATION"));
});
test("PR head checkout followed by run in pull_request_target is high",()=>{
  const yaml=["on: pull_request_target","permissions: {contents: write}","jobs:","  build:","    runs-on: ubuntu-latest","    steps:","      - uses: actions/checkout@v4","        with:","          ref: "+head,"      - run: npm test"].join("\n");
  assert(list(yaml).includes("TARGET_UNTRUSTED_CODE"));
});
test("PR head checkout without subsequent script does not trigger the chained rule",()=>{
  const yaml=["on: pull_request_target","jobs:","  build:","    runs-on: ubuntu-latest","    steps:","      - uses: actions/checkout@v4","        with:","          ref: "+head].join("\n");
  assert(!list(yaml).includes("TARGET_UNTRUSTED_CODE"));
});
test("workflow_run artifact downloads plus script steps are flagged",()=>{
  const yaml=["on: workflow_run","jobs:","  build:","    runs-on: ubuntu-latest","    steps:","      - uses: actions/download-artifact@v4","      - run: echo test"].join("\n");
  assert(list(yaml).includes("WORKFLOW_RUN_ARTIFACT"));
});

test("external reader paired controls for public GitHub Actions article",()=>{
  const mk=(event, body, ref="")=>[
    "on: "+event,
    "permissions: {contents: write}",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    ...(ref ? ["      - uses: actions/checkout@v4","        with:","          ref: "+ref] : []),
    "      - run: "+body
  ].join("\n");
  const safeExpr="$"+"{{ github.event.pull_request.base.sha }}";
  const numberExpr="$"+"{{ github.event.number }}";
  const remoteHead="refs/pull/"+numberExpr+"/head";
  const reviewComment="$"+"{{ github.event.review_comment.body }}";
  const reviewBody="$"+"{{ github.event.review.body }}";
  const direct=mk("pull_request_review_comment","echo '"+reviewComment+"'");
  const baseline=mk("pull_request_review","echo '"+reviewBody+"'");
  assert(list(baseline).includes("SHELL_INTERPOLATION"),"baseline reviewer body must be detected");
  assert(list(direct).includes("SHELL_INTERPOLATION"),"review_comment.body is equally author-controlled");
  const headUntrusted=mk("pull_request_target","npm test",remoteHead);
  const baseTrusted=mk("pull_request_target","npm test",safeExpr);
  assert(list(headUntrusted).includes("TARGET_UNTRUSTED_CODE"),"refs/pull/N/head fetches untrusted code");
  assert(!list(baseTrusted).includes("TARGET_UNTRUSTED_CODE"),"trusted base checkout is not a PR head");
});
