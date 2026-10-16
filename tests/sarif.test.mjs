import {spawnSync as childProcessSpawnSync} from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {analyzeWorkflow} from "../src/analyzer.mjs";
import {runCheck} from "../src/action.mjs";
import {toSarif,writeSarif} from "../src/sarif.mjs";

const risky=`name: Test
on: pull_request_target
permissions: write-all
jobs:
  check:
    runs-on: [self-hosted, linux]
    steps:
      - uses: actions/checkout@v4
      - run: echo safe
`;

function fixture(fn){
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),"wrc-sarif-"));
  const workflows=path.join(repo,".github","workflows");
  fs.mkdirSync(workflows,{recursive:true});
  fs.writeFileSync(path.join(workflows,"risky.yaml"),risky);
  try{return fn(repo,workflows);}finally{fs.rmSync(repo,{recursive:true,force:true});}
}
test("analyzer tracks exact YAML locations without leaking workflow source",()=>{
  const r=analyzeWorkflow(risky,".github/workflows/risky.yaml");
  const pos=id=>r.findings.find(f=>f.id===id)?.line;
  assert.equal(pos("TOKEN_WRITE_ALL"),3);
  assert.equal(pos("SELF_HOSTED_PR"),6);
  assert.equal(pos("ACTION_UNPINNED"),8);
  assert.equal(pos("TARGET_CONTEXT"),2);
  for(const f of r.findings)assert(!Object.prototype.hasOwnProperty.call(f,"rawYAML"));
});
test("SARIF v2.1.0 contains consistent rules, levels and file locations",()=>fixture(repo=>{
  const report=runCheck({root:repo});
  const sarif=toSarif(report);
  assert.equal(sarif.version,"2.1.0");
  assert.equal(sarif.runs.length,1);
  assert.equal(sarif.runs[0].tool.driver.version,"1.2.0");
  assert.equal(sarif.runs[0].results.length,report.results[0].findings.length);
  const high=sarif.runs[0].results.find(r=>r.ruleId==="TOKEN_WRITE_ALL");
  assert.equal(high.level,"error");
  assert.equal(high.locations[0].physicalLocation.artifactLocation.uri,".github/workflows/risky.yaml");
  assert.equal(high.locations[0].physicalLocation.region.startLine,3);
  const note=sarif.runs[0].results.find(r=>r.ruleId==="TARGET_CONTEXT");
  assert.equal(note.level,"note");
  assert(!JSON.stringify(sarif).includes("STATE_MACHINE_SECRET_TEST"));
}));
test("same rule across multiple files deduplicates SARIF rule definition",()=>fixture((repo,files)=>{
  fs.writeFileSync(path.join(files,"second.yaml"),risky);
  const report=runCheck({root:repo});
  const sarif=toSarif(report);
  const drivers=sarif.runs[0].tool.driver.rules;
  assert.equal(drivers.filter(r=>r.id==="TOKEN_WRITE_ALL").length,1);
  assert.equal(sarif.runs[0].results.filter(r=>r.ruleId==="TOKEN_WRITE_ALL").length,2);
}));
test("SARIF writer remains within repository and rejects unsafe paths",()=>fixture(repo=>{
  const report=runCheck({root:repo});
  const rel=writeSarif(report,repo,"audit/workflow-risk.sarif");
  assert.equal(rel,"audit/workflow-risk.sarif");
  const data=JSON.parse(fs.readFileSync(path.join(repo,rel),"utf8"));
  assert.equal(data.version,"2.1.0");
  assert.throws(()=>writeSarif(report,repo,"../escape.sarif"),/escape/);
  assert.throws(()=>writeSarif(report,repo,"/tmp/unsafe.sarif"),/relative/);
  assert.throws(()=>writeSarif(report,repo,"audit/raw.txt"),/\.sarif/);
  const out=fs.mkdtempSync(path.join(os.tmpdir(),"wrc-sarif-out-"));
  try{
    fs.symlinkSync(out,path.join(repo,"linked"));
    assert.throws(()=>writeSarif(report,repo,"linked/foo.sarif"),/symlink|outside/);
    assert.throws(()=>writeSarif(report,repo,"linked/newfolder/file.sarif"),/symlink|outside/);
    assert.equal(fs.existsSync(path.join(out,"newfolder")),false);
    fs.symlinkSync(path.join(out,"hijack.sarif"),path.join(repo,"audit","hijack.sarif"));
    assert.throws(()=>writeSarif(report,repo,"audit/hijack.sarif"),/symlink/);
  } finally{fs.rmSync(out,{recursive:true,force:true});}
}));
test("SARIF supports no findings without fabrication",()=>fixture((repo,files)=>{
  fs.writeFileSync(path.join(files,"risky.yaml"),`on: push
permissions: {contents: read}
jobs:
  check:
    runs-on: ubuntu-latest
    steps: [{run: echo okay}]
`);
  const sarif=toSarif(runCheck({root:repo}));
  assert.equal(sarif.runs[0].results.length,0);
  assert.equal(sarif.runs[0].tool.driver.rules.length,0);
}));

test("GitHub Action CLI writes SARIF and action outputs without a network service",()=>fixture((repo,files)=>{
  const outputFile=path.join(repo,"outputs.txt");
  const summaryFile=path.join(repo,"summary.md");
  const {spawnSync}=requireSpawnSync();
  const cmd=spawnSync(process.execPath,[path.join(process.cwd(),"src/action.mjs")],{
    encoding:"utf8",timeout:12000,
    env:{...process.env,GITHUB_ACTIONS:"true",WRC_TEST_MODE:"0",GITHUB_WORKSPACE:repo,
      GITHUB_OUTPUT:outputFile,GITHUB_STEP_SUMMARY:summaryFile,INPUT_FAIL_LEVEL:"none",
      INPUT_SARIF_FILE:"artifacts/ci.sarif",INPUT_DIRECTORY:".github/workflows"}
  });
  assert.equal(cmd.status,0,cmd.stderr);
  assert.match(fs.readFileSync(outputFile,"utf8"),/sarif_path=artifacts\/ci.sarif/);
  assert.match(fs.readFileSync(summaryFile,"utf8"),/Workflow Risk Check CI/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(repo,"artifacts/ci.sarif"))).version,"2.1.0");
}));
test("GitHub Action CLI writes SARIF even when high-severity checks fail",()=>fixture(repo=>{
  const {spawnSync}=requireSpawnSync();
  const cmd=spawnSync(process.execPath,[path.join(process.cwd(),"src/action.mjs")],{
    encoding:"utf8",timeout:12000,
    env:{...process.env,GITHUB_ACTIONS:"true",WRC_TEST_MODE:"0",GITHUB_WORKSPACE:repo,
      INPUT_FAIL_LEVEL:"high",INPUT_SARIF_FILE:"artifacts/rejected.sarif",
      INPUT_DIRECTORY:".github/workflows"}
  });
  assert.equal(cmd.status,1,cmd.stderr);
  const data=JSON.parse(fs.readFileSync(path.join(repo,"artifacts/rejected.sarif")));
  assert(data.runs[0].results.some(x=>x.level==="error"));
}));
function requireSpawnSync(){return {spawnSync:childProcessSpawnSync};}
