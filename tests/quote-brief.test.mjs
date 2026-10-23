import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {analyzeWorkflow} from "../src/analyzer.mjs";
import {makeQuoteBrief} from "../src/quote-brief.mjs";

test("safe brief is voluntary and preserves client YAML privacy", () => {
  const yaml = ["name: VERY_PRIVATE_BUYER_987","on: pull_request_target",
    "permissions: write-all","jobs:","  key:","    runs-on: ubuntu-latest",
    "    steps:","      - uses: actions/checkout@v4",
    "      - run: echo CUSTOMER_TOKEN_ABCD9999"].join("\n");
  const report = analyzeWorkflow(yaml, "CUSTOMER_PRIVATE_FILE_777.yml");
  assert.equal(report.error, undefined);
  const brief = makeQuoteBrief(report);
  assert.match(brief, /4 USDC starter on Clawlancer/);
  assert.match(brief, /before work/);
  assert.match(brief, /TOKEN_WRITE_ALL/);
  for (const secret of ["VERY_PRIVATE_BUYER_987","CUSTOMER_TOKEN_ABCD9999",
     "CUSTOMER_PRIVATE_FILE_777","actions/checkout@v4"]) {
    assert(!brief.includes(secret), "must not expose " + secret);
  }
});
test("spoofed caller metadata and unknown IDs cannot escape the quote buffer", () => {
  const x={file:"PRIVATE_REPO.yml",events:["WEBHOOK_SECRET"],findings:[
    {id:"UNKNOWN_CUSTOMER_SECRET_FIELD",where:"PRIVATE_PATH",description:"API_KEY_123"}],
    counts:{high:1,medium:0,note:0}};
  const brief=makeQuoteBrief(x);
  for(const secret of ["PRIVATE_REPO","WEBHOOK_SECRET","UNKNOWN_CUSTOMER_SECRET_FIELD",
    "PRIVATE_PATH","API_KEY_123"])assert(!brief.includes(secret));
  assert.match(brief,/Rule identifiers: none/);
});
test("no finding and invalid scan never fabricate payment", () => {
  assert.throws(()=>makeQuoteBrief(null),/valid workflow scan/);
  assert.throws(()=>makeQuoteBrief({error:"bad",counts:{},findings:[]}),/valid workflow scan/);
  const valid=analyzeWorkflow("on: push\npermissions: {}\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps: []");
  assert.equal(valid.error,undefined);
  const brief=makeQuoteBrief(valid);
  assert.match(brief,/0 high, 0 medium, 0 note/);
  assert.match(brief,/not an order/);
  assert.match(brief,/not a security audit/);
});
test("UI provides voluntary copy but does not add any outbound submit", () => {
  const html=fs.readFileSync(new URL("../docs/index.html",import.meta.url),"utf8");
  assert.match(html,/id="copy-quote-brief"/);
  assert.match(html,/id="quote-brief-status"/);
  assert.match(html,/class="quote-privacy-note micro-note"/);
  assert.match(html,/after agreed scope and marketplace funding/);
});
