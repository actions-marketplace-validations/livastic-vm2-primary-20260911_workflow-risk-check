import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const docs=path.join(project,"docs");
const site="https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/";
const sitemap=fs.readFileSync(path.join(docs,"sitemap.xml"),"utf8");
const robots=fs.readFileSync(path.join(docs,"robots.txt"),"utf8");

function files(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
    const entry=path.join(dir,item.name);
    return item.isDirectory()?files(entry):[entry];
  });
}
function canonicalFrom(html){
  const tags=html.match(/<link\s+rel="canonical"\s+href="[^"]+"\s*\/?\s*>/gi)||[];
  assert.equal(tags.length,1,"Each indexable page needs one canonical tag");
  return tags[0].match(/href="([^"]+)"/)?.[1];
}
test("sitemap lists every human-oriented HTML page exactly once",()=>{
  const pages=files(docs).filter(f=>f.endsWith(".html")&&!/^google[a-z0-9-]+\.html$/i.test(path.basename(f)));
  assert(pages.length>=5);
  const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
  assert.equal(new Set(locs).size,locs.length,"Sitemap must not duplicate URLs");
  const expected=pages.map(f=>{
    const relative=path.relative(docs,f).replaceAll(path.sep,"/");
    return site+(relative==="index.html"?"":relative);
  });
  assert.deepEqual([...locs].sort(),expected.sort());
});
test("each page has proper metadata and self-canonical URL",()=>{
  for(const file of files(docs).filter(f=>f.endsWith(".html")&&!/^google[a-z0-9-]+\.html$/i.test(path.basename(f)))){
    const html=fs.readFileSync(file,"utf8");
    const relative=path.relative(docs,file).replaceAll(path.sep,"/");
    const url=site+(relative==="index.html"?"":relative);
    assert.equal(canonicalFrom(html),url,relative+" has unexpected canonical");
    assert.match(html,/<title>.+<\/title>/,relative+" missing title");
    assert.match(html,/<meta\s+name="description"\s+content="[^"]+"/,relative+" missing description");
    assert.match(html,/<h1\b[^>]*>/i,relative+" missing h1");
  }
});
test("sitemap discovery and ownership verification stay in static artifacts",()=>{
  assert(robots.includes("Sitemap: "+site+"sitemap.xml"));
  assert(fs.readFileSync(path.join(docs,"index.html"),"utf8").includes('name="google-site-verification"'));
  const verification=fs.readFileSync(path.join(docs,"googlecede1404657214bb.html"),"utf8").trim();
  assert.equal(verification,"google-site-verification: googlecede1404657214bb.html");
});

test("Relevant free scope-planning resource is contextual and disclosed",()=>{
  const link="https://livastic-vm1-primary.github.io/scope-lens/";
  const en=fs.readFileSync(path.join(docs,"index.html"),"utf8");
  const ko=fs.readFileSync(path.join(docs,"ko/services.html"),"utf8");
  assert.equal(en.split(link).length-1,1);
  assert.equal(ko.split(link).length-1,1);
  assert.match(en,/not a security audit or paid partnership/);
  assert.match(ko,/보안 감사나 제휴 판매 상품이 아닙니다/);
  assert(!en.includes('</section>\\n        <section'));
});

test("Latest stable GitHub Action release tag is discoverable on public buyer page and README",()=>{
  const homepage=fs.readFileSync(path.join(docs,"index.html"),"utf8");
  const readme=fs.readFileSync(path.join(project,"README.md"),"utf8");
  assert.match(homepage,/workflow-risk-check@v1\.2\.1/);
  assert.match(readme,/workflow-risk-check@v1\.2\.1/);
  assert.doesNotMatch(homepage,/workflow-risk-check@v1\.2\.0/);
  assert.doesNotMatch(readme,/workflow-risk-check@v1\.2\.0/);
});
test("Updated checkout and privacy feature announces a new root sitemap modification",()=>{
  assert.match(sitemap,/<loc>https:\/\/livastic-vm2-primary-20260911\.github\.io\/workflow-risk-check\/<\/loc><lastmod>2026-10-23<\/lastmod>/);
  const page=fs.readFileSync(path.join(docs,"index.html"),"utf8");
  assert.match(page,/id="copy-quote-brief"/);
  assert.match(page,/id="quote-brief-status"/);
  assert.match(page,/quote-privacy-note/);
});

test("Official Github Marketplace distribution points to the original free Action without implying a paid order",()=>{
  const page=fs.readFileSync(path.join(docs,"index.html"),"utf8");
  const url="https://github.com/marketplace/actions/workflow-risk-check-ci-local-first-security-preflight";
  assert.equal(page.split(url).length-1,1,"marketplace URL should appear once in landing");
  const ci=page.slice(page.indexOf('id="ci"'),page.indexOf('id="preflight"'));
  assert(ci.includes(url),"linked from free CI action section");
  assert.match(ci,/The Action is free; optional 4 USDC or 25 USDC human-scoped reviews require a separate funded buyer order/);
  assert.match(page,/https:\/\/clawlancer\.ai\/marketplace\/1be00886-ce81-4398-ab6a-d2322207a551/);
  assert.match(page,/https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSeyoqmSgtcgspZ9jJq78dLBhsq50KDbhdVGcmZP5EQCouY3Qg/);
});

test("Original README points from the free action to the real Marketplace while preserving separately funded reviews",()=>{
  const md=fs.readFileSync(path.join(project,"README.md"),"utf8");
  const marketplace="https://github.com/marketplace/actions/workflow-risk-check-ci-local-first-security-preflight";
  assert.equal(md.split(marketplace).length-1,1,"official Marketplace link must appear exactly once");
  assert(md.indexOf(marketplace)<md.indexOf("## What it does"),"installation link appears near the free preflight description");
  assert(md.includes("The Action and browser checker are free"),"free tier remains unambiguous");
  assert(md.includes("separate buyer-funded order"),"paid work requires an independent buyer");
  assert(md.includes("clawlancer.ai/marketplace/1be00886-ce81-4398-ab6a-d2322207a551"),"original 4 USDC checkout must survive");
  assert(md.includes("clawlancer.ai/marketplace/bec9d133-5388-4ecb-ad42-98bcf961ad4e"),"original 25 USDC checkout must survive");
  assert(md.includes("starts at $149 USD"),"distinct quote-only remedial engagement must survive");
});
