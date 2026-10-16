import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectWorkflowFiles, runCheck, markdownSummary } from "../src/action.mjs";

function withRepo(fn){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wrc-ci-"));
  fs.mkdirSync(path.join(dir,".github","workflows"),{recursive:true});
  try {return fn(dir,path.join(dir,".github","workflows"));} finally {fs.rmSync(dir,{recursive:true,force:true});}
}
const safe = `on: push
permissions: {contents: read}
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [{run: echo safe}]
`;
const unsafe = `on: pull_request_target
permissions: write-all
jobs:
  test:
    runs-on: [self-hosted, linux]
    steps:
      - uses: actions/checkout@v4
      - run: echo checking
`;
test("safe YAML scans clean with explicit least privilege",()=>withRepo((root,files)=>{
  fs.writeFileSync(path.join(files,"safe.yml"),safe);
  const results=runCheck({root,emit:()=>{}});
  assert.deepEqual(results.counts,{high:0,medium:0,note:0});
  assert.equal(results.files,1);
  assert.equal(results.failed,false);
  assert.match(markdownSummary(results,"high"),/PASSED/);
}));
test("high severity fails default threshold and emits sanitized warnings",()=>withRepo((root,files)=>{
  fs.writeFileSync(path.join(files,"unsafe.yaml"),unsafe);
  const events=[];
  const report=runCheck({root,emit:s=>events.push(s)});
  assert.equal(report.failed,true);
  assert.equal(report.counts.high,1);
  assert(report.counts.medium>=2);
  assert(events.some(x=>x.includes("::error file=.github/workflows/unsafe.yaml")));
  assert.match(markdownSummary(report,"high"),/FAILED/);
}));
test("fail_level none cannot fail a scan",()=>withRepo((root,files)=>{
  fs.writeFileSync(path.join(files,"risk.yml"),unsafe);
  const report=runCheck({root,failLevel:"none"});
  assert.equal(report.failed,false);
}));
test("fail_level medium fails on medium-only findings",()=>withRepo((root,files)=>{
  fs.writeFileSync(path.join(files,"medium.yml"),`on: push
permissions: {contents: read}
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [{uses: actions/checkout@v4}]
`);
  const report=runCheck({root,failLevel:"medium"});
  assert.equal(report.counts.high,0);
  assert.equal(report.failed,true);
}));
test("avoid symlinks escaping the checked-out repository",()=>withRepo((root,files)=>{
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),"wrc-out-"));
  try{
    fs.writeFileSync(path.join(outside,"bad.yml"),unsafe);
    fs.symlinkSync(path.join(outside,"bad.yml"),path.join(files,"linked.yml"));
    fs.writeFileSync(path.join(files,"good.yml"),safe);
    const scanned=collectWorkflowFiles(root,".github/workflows",40);
    assert.equal(scanned.length,1);
    assert.equal(scanned[0].relative,".github/workflows/good.yml");
    assert.throws(()=>collectWorkflowFiles(root,"../../",40),/escape/);
  } finally {fs.rmSync(outside,{recursive:true,force:true});}
}));
test("missing, empty, too large and too many workflows fail closed",()=>withRepo((root,files)=>{
  assert.throws(()=>collectWorkflowFiles(root,".github/workflows",40),/No .* files/);
  assert.throws(()=>collectWorkflowFiles(root,"missing",40),/does not exist/);
  fs.writeFileSync(path.join(files,"one.yml"),safe);
  fs.writeFileSync(path.join(files,"two.yml"),safe);
  assert.throws(()=>runCheck({root,maxFiles:1}),/File limit/);
  assert.throws(()=>runCheck({root,maxFiles:0}),/max_files/);
  fs.writeFileSync(path.join(files,"one.yml"),"on: push\n"+" ".repeat(240100));
  assert.throws(()=>runCheck({root,maxFiles:2}),/240KB/);
}));
test("malformed YAML returns an error, not a false pass",()=>withRepo((root,files)=>{
  fs.writeFileSync(path.join(files,"broken.yml"),"key: [");
  assert.throws(()=>runCheck({root}),/YAML parse error/);
}));
