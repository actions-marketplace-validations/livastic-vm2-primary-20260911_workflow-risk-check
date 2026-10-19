import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {analyzeWorkflow} from "../src/analyzer.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(repo,file),"utf8");
const sample=read("examples/synthetic-paid-preflight-sample.md");
const expectedLink="https://clawlancer.ai/marketplace/bec9d133-5388-4ecb-ad42-98bcf961ad4e";

test("fixed-price marketplace offer is distinguished from larger PR package",()=>{
 const homepage=read("docs/index.html");
 const ko=read("docs/ko/services.html");
 const readme=read("README.md");
 for(const [file,text] of [["homepage",homepage],["Korean service page",ko],["README",readme]]){
  assert(text.includes(expectedLink),file+" must link publicly verifiable listing");
  assert(text.includes("25 USDC"),file+" must disclose true listing price");
  assert(text.includes("149"),file+" must retain larger, quote-only project");
  assert(text.includes("synthetic-paid-preflight-sample.md"),file+" must link non-client sample report");
 }
 assert.match(homepage,/No paid orders or settled revenue are claimed/);
 assert.match(ko,/아직 실제 구매 및 지급은 확인되지 않았습니다/);
});

test("4 USDC starter is a real original listed checkout but explicitly not received owner income",()=>{
 const url="https://clawlancer.ai/marketplace/1be00886-ce81-4398-ab6a-d2322207a551";
 const pages=[read("docs/index.html"),read("docs/ko/services.html"),read("README.md")];
 for(const html of pages){
  assert.equal((html.match(new RegExp(url,"g"))||[]).length,1);
  assert(html.includes("4 USDC"),"starter must include exact listed USDC price");
  assert(html.includes("300"),"starter must be one small workflow bounded by 300 lines");
  assert(html.includes(expectedLink),"old $25 multi-file review stays available");
 }
 assert.match(pages[0],/no real buyer or payout has been verified/i);
 assert.match(pages[1],/구매나 지급은 아직 0건/);
 assert.match(pages[2],/no verified paid buyers or settled orders/i);
});
test("synthetic reported detections reproduce exact severity and source lines",()=>{
 const match=[...sample.matchAll(/```yaml\n([\s\S]*?)\n```/g)];
 assert.equal(match.length,2,"sample includes original numbered YAML and proposed replacement");
 const unsafe=match[0][1].split("\n").map(x=>x.replace(/^(?:\d {2}|\d{2} )/, "")).join("\n");
 const x=analyzeWorkflow(unsafe,"pr-check.yml");
 assert.equal(x.error,undefined);
 assert.deepEqual(x.counts,{high:1,medium:2,note:1});
 assert.deepEqual(Object.fromEntries(x.findings.map(f=>[f.id,f.line])),
   {TARGET_UNTRUSTED_CODE:8,ACTION_UNPINNED:8,WORKFLOW_WRITE:3,TARGET_CONTEXT:2});
});

test("synthetic replacement eliminates selected rule matches, not all external risk",()=>{
 const blocks=[...sample.matchAll(/```yaml\n([\s\S]*?)\n```/g)];
 const safe=analyzeWorkflow(blocks[1][1],"pr-check.yml");
 assert.equal(safe.error,undefined);
 assert.deepEqual(safe.counts,{high:0,medium:0,note:0});
 assert.match(sample,/not proof/i);
 assert.match(sample,/not a paid order/);
});

test("USD alternative is also accurately priced and not recorded as a sale",()=>{
  const link="https://api.dealwork.ai/api/v1/listings/bf23660a-abba-4d61-853a-0472a59cc0f0";
  const en=read("docs/index.html"),ko=read("docs/ko/services.html"),md=read("README.md");
  for(const t of [en,ko,md]){
    assert(t.includes(link));
    assert(t.includes("25 USD"));
    assert(t.includes("dealwork.ai"));
  }
  assert.match(en,/No contract, escrow or sale has been verified/);
  assert.match(ko,/아직 주문이나 수령액은 없습니다/);
});
