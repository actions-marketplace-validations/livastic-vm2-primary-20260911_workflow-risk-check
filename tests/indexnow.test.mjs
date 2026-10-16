import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {makePayload,SITE,ENDPOINT} from "../tools/indexnow.mjs";

function fixture(urls=[SITE]){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wrc-indexnow-fixture-"));
  const key="0123456789abcdef0123456789abcdef";
  fs.writeFileSync(path.join(dir,key+".txt"),key+"\n");
  fs.writeFileSync(path.join(dir,"sitemap.xml"),'<urlset>'+urls.map(x=>'<url><loc>'+x+'</loc></url>').join("")+'</urlset>');
  return {dir,key,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test("IndexNow payload matches site scoped sitemap key path and no third-party project",()=>{
 const payload=makePayload();
 assert.equal(payload.host,"livastic-vm2-primary-20260911.github.io");
 assert.equal(payload.urlList.length,5);
 assert.match(payload.keyLocation,/\/workflow-risk-check\/[a-f0-9]{32}\.txt$/);
 assert(payload.urlList.every(x=>x.startsWith(SITE)));
 assert.equal(ENDPOINT,"https://api.indexnow.org/indexnow");
});
test("Rejects unrelated GitHub Pages project or user root",()=>{
 for(const url of [
   "https://livastic-vm2-primary-20260911.github.io/taskproof-ai/",
   "https://livastic-vm2-primary-20260911.github.io/",
   "https://another-host.github.io/workflow-risk-check/",
   SITE+"guides/a?session=secret"
 ]){
  const f=fixture([url]);try{assert.throws(()=>makePayload(f.dir),/outside this project/);}finally{f.cleanup();}
 }
});
test("Rejects key mismatch before any network activity",()=>{
 const f=fixture();
 try{fs.writeFileSync(path.join(f.dir,f.key+".txt"),"bad\n");
  assert.throws(()=>makePayload(f.dir),/must contain only/);
 }finally{f.cleanup();}
});
test("Rejects duplicate, missing, or out-of-scope sitemap entries",()=>{
 const f=fixture([SITE,SITE]);
 try{assert.throws(()=>makePayload(f.dir),/unique/);}finally{f.cleanup();}
 const g=fixture([]);
 try{assert.throws(()=>makePayload(g.dir),/unique/);}finally{g.cleanup();}
});
test("Fails closed if multiple keys are accidentally published",()=>{
 const f=fixture();
 try{fs.writeFileSync(path.join(f.dir,"f".repeat(32)+".txt"),"f".repeat(32));
  assert.throws(()=>makePayload(f.dir),/exactly one/);
 }finally{f.cleanup();}
});
