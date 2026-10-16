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
