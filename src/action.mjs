/**
 * Local GitHub Action entrypoint. Deliberately uses only built-in filesystem I/O
 * and the bundled YAML parser; it never initiates network connections.
 */
import fs from "node:fs";
import path from "node:path";
import {analyzeWorkflow} from "./analyzer.mjs";
import {writeSarif} from "./sarif.mjs";

const INPUT = name => process.env["INPUT_"+name] || "";
const escapeProp = value => String(value).replaceAll("%","%25").replaceAll("\r","%0D").replaceAll("\n","%0A").replaceAll(":","%3A").replaceAll(",","%2C");
const escapeMsg = value => String(value).replaceAll("%","%25").replaceAll("\r","%0D").replaceAll("\n","%0A");
const quoteMD = value => String(value).replaceAll("|","\\|").replace(/\r?\n/g," ").replaceAll("`","'");
const appendEnv = (name, entries) => {
  const file=process.env[name];
  if(file) fs.appendFileSync(file,entries.join("\n")+"\n",{encoding:"utf8"});
};
const inside = (root, target) => {
  const rel=path.relative(root,target);
  return rel==="" || (!rel.startsWith(".."+path.sep) && rel!==".." && !path.isAbsolute(rel));
};
export function collectWorkflowFiles(root, dir, maxFiles=40){
  const checkedRoot=fs.realpathSync(root);
  if(path.isAbsolute(dir))throw new Error("directory must be relative to the checked-out repository.");
  const full=path.resolve(checkedRoot,dir);
  if(!inside(checkedRoot,full))throw new Error("directory cannot escape the checked-out repository.");
  if(!fs.existsSync(full))throw new Error("Workflow directory does not exist: "+dir);
  const base=fs.realpathSync(full);
  if(!inside(checkedRoot,base))throw new Error("Workflow directory points outside the repository.");
  const files=[];
  const visit=current=>{
    const entries=fs.readdirSync(current,{withFileTypes:true});
    for(const entry of entries){
      if(entry.isSymbolicLink())continue; // never follow filesystem symlinks
      const file=path.join(current,entry.name);
      if(entry.isDirectory()) {
        if(entry.name!==".git" && entry.name!=="node_modules")visit(file);
      } else if(entry.isFile() && /\.ya?ml$/i.test(entry.name)){
        if(files.length>=maxFiles)throw new Error("File limit exceeded ("+maxFiles+"). Narrow the directory or increase max_files.");
        files.push({path:file,relative:path.relative(checkedRoot,file).replaceAll(path.sep,"/")});
      }
    }
  };
  visit(base);
  if(!files.length)throw new Error("No .yml or .yaml files found in "+dir);
  return files;
}
export function runCheck({root,dir=".github/workflows",failLevel="high",maxFiles=40,emit=()=>{}}){
  if(!["none","high","medium"].includes(failLevel)) throw new Error("fail_level must be one of high, medium, none");
  if(!Number.isInteger(maxFiles) || maxFiles<1 || maxFiles>100)throw new Error("max_files must be an integer 1..100");
  const paths=collectWorkflowFiles(root,dir,maxFiles);
  const results=[];
  let counts={high:0,medium:0,note:0};
  for(const file of paths) {
    const stat=fs.statSync(file.path);
    if(stat.size>240000) throw new Error(file.relative+" exceeds 240KB limit");
    const result=analyzeWorkflow(fs.readFileSync(file.path,"utf8"),file.relative);
    if(result.error)throw new Error(file.relative+": "+result.error);
    for(const f of result.findings){
      counts[f.severity]++;
      const mark= failLevel!=="none" && (f.severity==="high" || (failLevel==="medium" && f.severity==="medium")) ? "error":"warning";
      emit(`::${mark} file=${escapeProp(file.relative)},title=${escapeProp(f.id)}::${escapeMsg(f.title+" — "+f.description+" Fix: "+f.recommendation)}`);
    }
    results.push(result);
  }
  return {files:paths.length,results,counts,failed:failLevel!=="none"&&(counts.high>0 || (failLevel==="medium"&&counts.medium>0))};
}
export function markdownSummary(report, failLevel){
  const lines=[
    "# Workflow Risk Check CI",
    "",
    `**Files scanned:** ${report.files} · **High:** ${report.counts.high} · **Medium:** ${report.counts.medium} · **Note:** ${report.counts.note}`,
    `**Failure threshold:** ${quoteMD(failLevel)} · **Result:** ${report.failed?"FAILED":"PASSED"}`,
    "",
    "| File | Level | Finding | Location |",
    "| --- | --- | --- | --- |"
  ];
  for(const result of report.results){
    if(!result.findings.length)lines.push(`| \`${quoteMD(result.file)}\` | — | No selected patterns found | — |`);
    else for(const f of result.findings)lines.push(`| \`${quoteMD(result.file)}\` | ${f.severity} | ${quoteMD(f.title)} | \`${quoteMD(f.where)}\` |`);
  }
  lines.push("",
    "> Static heuristics only; a clean result is not a security certification.",
    "> Files remain on the runner; this action does not transmit workflow contents.",
    "",
    "[Checker and remediation guidance](https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/)",
    "");
  return lines.join("\n");
}
export function main(){
  try {
    const root=process.env.GITHUB_WORKSPACE||process.cwd();
    const dir=INPUT("DIRECTORY")||".github/workflows";
    const failLevel=(INPUT("FAIL_LEVEL")||"high").toLowerCase();
    const maxFiles=Number(INPUT("MAX_FILES")||"40");
    const report=runCheck({root,dir,failLevel,maxFiles,emit:console.log});
    appendEnv("GITHUB_OUTPUT",[
      "high_count="+report.counts.high,
      "medium_count="+report.counts.medium,
      "note_count="+report.counts.note,
      "files_scanned="+report.files
    ]);
    const summary=markdownSummary(report,failLevel);
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary,"utf8");
    const sarifFile=INPUT("SARIF_FILE");
    if(sarifFile.trim()){
      const sarifPath=writeSarif(report,root,sarifFile);
      appendEnv("GITHUB_OUTPUT",["sarif_path="+sarifPath]);
      console.log("SARIF v2.1.0 saved locally to "+sarifPath);
    }
    console.log(`Workflow Risk Check: ${report.files} files, ${report.counts.high} high, ${report.counts.medium} medium, ${report.counts.note} notes.`);
    if(report.failed)process.exitCode=1;
  } catch(err){
    console.error("::error title=Workflow Risk Check configuration::"+escapeMsg(err.message||err));
    process.exitCode=2;
  }
}
if(process.env.GITHUB_ACTIONS==="true" && process.env.WRC_TEST_MODE!=="1")main();
