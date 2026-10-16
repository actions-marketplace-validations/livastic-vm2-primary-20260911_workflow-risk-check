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
