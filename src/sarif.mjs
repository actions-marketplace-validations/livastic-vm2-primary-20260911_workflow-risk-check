import fs from "node:fs";
import path from "node:path";

/** SARIF v2.1.0, intentionally local and compatible with GitHub Code Scanning. */
const severityToLevel={high:"error",medium:"warning",note:"note"};
const TOOL_URL="https://github.com/livastic-vm2-primary-20260911/workflow-risk-check";

function within(root,target){
  const relative=path.relative(root,target);
  return relative==="" || (relative!==".." && !relative.startsWith(".."+path.sep) && !path.isAbsolute(relative));
}

export function toSarif(report,toolVersion="1.2.0"){
  if(!report || !Array.isArray(report.results))throw new TypeError("Expected a workflow scanner report");
  const rules=new Map();
  const results=[];
  for(const file of report.results){
    const location=String(file.file).replaceAll("\\","/");
    for(const f of file.findings||[]){
      const level=severityToLevel[f.severity]||"note";
      const ruleId=String(f.id).slice(0,100);
      if(!rules.has(ruleId))rules.set(ruleId,{
        id:ruleId,name:ruleId,
        shortDescription:{text:String(f.title).slice(0,250)},
        fullDescription:{text:String(f.description).slice(0,800)},
        helpUri:f.source,
        defaultConfiguration:{level},
        properties:{precision:"medium",tags:["security","github-actions"]}
      });
      const line=Number.isInteger(f.line) && f.line>0?f.line:1;
      results.push({
        ruleId,level,
        message:{text:[f.title,f.description,"Suggested fix: "+f.recommendation].join(". ").slice(0,1800)},
        locations:[{physicalLocation:{
          artifactLocation:{uri:location,uriBaseId:"%SRCROOT%"},
          region:{startLine:line}
        }}],
        properties:{ruleLocation:String(f.where),riskLevel:f.severity}
      });
    }
  }
  return {
    $schema:"https://json.schemastore.org/sarif-2.1.0.json",
    version:"2.1.0",
    runs:[{
      tool:{driver:{
        name:"Workflow Risk Check",
        organization:"Workflow Risk Check",
        informationUri:TOOL_URL,
        version:toolVersion,
        rules:[...rules.values()]
      }},
      results,
      columnKind:"utf16CodeUnits"
    }]
  };
}

/** Write only inside the checked-out checkout, following no destination symlinks. */
export function writeSarif(report,workspace,relativePath){
  if(typeof relativePath!=="string" || !relativePath.trim() || relativePath.includes("\0") || path.isAbsolute(relativePath))
    throw new Error("sarif_file must be a non-empty repository-relative path");
  if(!/\.sarif(?:\.json)?$/i.test(relativePath))throw new Error("sarif_file must end in .sarif or .sarif.json");
  const root=fs.realpathSync(workspace);
  const target=path.resolve(root,relativePath);
  if(!within(root,target))throw new Error("sarif_file cannot escape repository root");
  const parent=path.dirname(target);
  // Reject every existing symlink component BEFORE mkdir: never create a folder
  // outside the checkout through a symlinked parent.
  let cursor=root;
  for(const name of path.relative(root,parent).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,name);
    try{
      const part=fs.lstatSync(cursor);
      if(part.isSymbolicLink() || !part.isDirectory())
        throw new Error("sarif_file parent contains a symlink or non-directory");
    }catch(error){
      if(error.code!=="ENOENT")throw error;
      fs.mkdirSync(cursor,{mode:0o700});
    }
  }
  if(!within(root,fs.realpathSync(parent)))throw new Error("sarif_file directory resolves outside repository root");
  // existsSync() follows symlinks and misses dangling links: lstat the entry.
  try{
    const current=fs.lstatSync(target);
    if(current.isSymbolicLink() || !current.isFile())
      throw new Error("sarif_file must be an ordinary file, not a symlink or directory");
  }catch(error){
    if(error.code!=="ENOENT")throw error;
  }
  fs.writeFileSync(target,JSON.stringify(toSarif(report),null,2)+"\n",{encoding:"utf8",mode:0o600});
  return path.relative(root,target).replaceAll(path.sep,"/");
}
