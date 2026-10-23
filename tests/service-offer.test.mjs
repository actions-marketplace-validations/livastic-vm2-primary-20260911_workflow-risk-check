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

test("Post-scan buyer CTA keeps 4 USDC scope and evidence truthful",()=>{
 const html=read("docs/index.html");
 assert.match(html,/<div id="results-output"[\s\S]*Need a second pass\?[\s\S]*4 USDC[\s\S]*clawlancer\.ai\/marketplace\/1be00886/);
 assert.match(html,/one public GitHub Actions YAML file \(up to 300 lines\)/);
 assert.match(html,/AI-assisted 4 USDC review/);
 assert.match(html,/after agreed scope and marketplace funding/);
});
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
 for(const [i,html] of pages.entries()){
  assert.equal((html.match(new RegExp(url,"g"))||[]).length,i===0?2:i===1?1:2,"site has two buyer CTAs, localized site has one, README has original listing plus new early CTA");
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


test("direct VM1 MetaMask quote stays separate from legacy platform checkout",()=>{
  const direct="https://github.com/livastic-vm2-primary-20260911/workflow-risk-check/issues/new?template=public-workflow-preflight-25-usdc.yml";
  const en=read("docs/index.html"),ko=read("docs/ko/services.html"),md=read("README.md");
  for(const [name,text] of [["English",en],["Korean",ko],["README",md],["sample",sample]]){
    assert(text.includes(direct),name+" must link the original nonbinding direct buyer route");
    assert(text.includes(expectedLink),name+" must retain the distinct original Clawlancer listing");
  }
  assert.match(en,/original VM1 MetaMask/);
  assert.match(en,/No buyer has commissioned or paid for this direct review/);
  assert.match(ko,/지급처가 다른 기존 관리형 마켓플레이스 계약/);
  assert.match(md,/No buyer contract, paid order, or direct wallet receipt is claimed/);
  assert.match(sample,/not money received/i);
});

test("Marketplace metadata description remains within published GitHub limit",()=>{
  const metadata=read("action.yml");
  const description=metadata.match(/^description: "([^"]+)"$/m)?.[1];
  assert.ok(description,"action.yml must have a description");
  assert.ok(description.length<125,"Marketplace action description must be shorter than 125 characters");
  assert.match(description,/No uploads/);
});

test("existing direct 25 USDC review has a clear pre-remediation buyer route",()=>{
  const html=read("docs/index.html");
  const hero=html.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1]??"";
  assert.match(hero,/href="#preflight">Request a 25 USDC static review/);
  const preflight=html.indexOf('id="preflight"');
  const remediation=html.indexOf('class="service-section" id="service"');
  assert(preflight>0&&remediation>preflight,"fixed 25 USDC offer appears before larger 149 USD PR package");
  const buyerRoute=html.slice(preflight,remediation);
  assert.match(buyerRoute,/Up to 3 public GitHub Actions YAML files — 25 USDC on Base/);
  assert.match(buyerRoute,/one Korea-based human owner/);
  assert.match(buyerRoute,/not<\/strong> a full security audit/);
  assert.match(buyerRoute,/Google Forms stores your reply email and non-sensitive summary/);
  assert.match(buyerRoute,/written agreement/);
  assert.match(buyerRoute,/original VM1 MetaMask address/);
  assert.match(buyerRoute,/SeyoqmSgtcgspZ9jJq78dLBhsq50KDbhdVGcmZP5EQCouY3Qg\/viewform/);
  assert.match(buyerRoute,/public-workflow-preflight-25-usdc.yml/);
  assert.match(buyerRoute,/No buyer has commissioned or paid for this direct review/);
});


test("Early README buyer path stays optional and never equates a quote with settled sales",()=>{
 const md=read("README.md");
 const anchor=md.indexOf("**Optional paid review (4 USDC, Base):**");
 const features=md.indexOf("## What it does");
 assert(anchor>0 && features>anchor && anchor<1800,"real customer path should be visible before technical README");
 const paragraph=md.slice(anchor,features);
 assert(paragraph.includes("1be00886-ce81-4398-ab6a-d2322207a551"));
 assert(paragraph.includes("AI-assisted"));
 assert(paragraph.includes("mutually agreed scope"));
 assert(paragraph.includes("no purchase or payout has yet been verified"));
 assert(paragraph.includes("Never send secrets or private YAML."));
});
