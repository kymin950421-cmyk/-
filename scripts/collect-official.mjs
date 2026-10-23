// Fetch public search results using the server-provided next-page cursor only.
// No guessed cursors, account credentials, or third-party merchant datasets.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
const url='https://www.shinhancard.com/mob/MOBFM204N/MOBFM204R1101.ajax';
const districts=['분당구','수정구','중원구'];
const folder=process.env.COLLECT_OUTPUT || `.local/official-source/${new Date().toISOString().replaceAll(':','-')}`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await mkdir(folder,{recursive:true});
console.log(`Collection folder: ${folder}`);
const startedAt=new Date().toISOString();
async function collect(district){
 const file=`${folder}/${district}.json`;let partitionStartedAt=startedAt,rows=[],cursor='',pages=0,seenCursors=new Set();
 try{const saved=JSON.parse(await readFile(file,'utf8'));if(saved.complete){console.log(`${district}: retained completed ${saved.rows.length}`);return saved;}if(saved.district===district){partitionStartedAt=saved.startedAt;rows=saved.rows;cursor=saved.cursor;pages=saved.pages;seenCursors=new Set(saved.seenCursors);}}catch{}
 const ids=new Set(rows.map(r=>r.MCT_N));
 async function save(complete){const state={district,sourceUrl:url,startedAt:partitionStartedAt,completedAt:complete?new Date().toISOString():null,pages,rows,cursor,seenCursors:[...seenCursors],complete};await writeFile(file+'.tmp',JSON.stringify(state));await rename(file+'.tmp',file);return state;}
 while(true){
  await wait(450);
  const params={siDo:'경기',siGunGu:`성남시 ${district}`,category:'',mchtNm:'',NXT_QY_KEY:cursor};
  let payload;
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',Referer:'https://www.shinhancard.com/mob/MOBFM204N/MOBFM204R11.shc'},body:new URLSearchParams(params),signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const result=await response.json();if(result.mbw_result!=='S'||!result.mbw_json)throw new Error('Unexpected source result');payload=result.mbw_json;break;
   }catch(error){if(attempt===2){await save(false);throw error;}await wait(2000*(attempt+1));}
  }
  const columns=payload.mchtList;
  if(!columns||typeof columns!=='object'||Array.isArray(columns))throw new Error('Invalid columns');
  const keys=Object.keys(columns),length=keys.length?columns[keys[0]].length:0;
  if(keys.some(k=>!Array.isArray(columns[k])||columns[k].length!==length))throw new Error('Unequal source columns');
  for(let i=0;i<length;i++){
   const row=Object.fromEntries(keys.map(k=>[k,String(columns[k][i]??'')]));
   if(!row.MCT_N||!row.MCT_NM||!row.MCT_AR.includes(district))throw new Error('District or required field mismatch');
   if(ids.has(row.MCT_N))throw new Error('Repeated merchant id');ids.add(row.MCT_N);rows.push(row);
  }
  pages++;const next=String(payload.NXT_QY_KEY||'').trim();
  if(next&&(seenCursors.has(next)||!length||next===cursor))throw new Error('Repeated or empty next page');
  if(next)seenCursors.add(next);cursor=next;
  if(pages%25===0||!next){await save(!next);console.log(`${district}: pages=${pages}, merchants=${rows.length}, complete=${!next}`);}
  if(!next)return save(true);
  if(pages>=3000)throw new Error('Page safety limit');
 }
}
const results=await Promise.allSettled(districts.map(collect));
if(results.some(r=>r.status!=='fulfilled')){for(let i=0;i<results.length;i++)if(results[i].status==='rejected')console.error(districts[i],results[i].reason.message);process.exitCode=1;}
else{const rows=results.flatMap(r=>r.value.rows);if(new Set(rows.map(r=>r.MCT_N)).size!==rows.length)throw new Error('Duplicate across districts');const result={sourceUrl:url,sourcePage:'https://www.shinhancard.com/mob/MOBFM204N/MOBFM204R11.shc',startedAt:results.map(r=>r.value.startedAt).sort()[0],completedAt:new Date().toISOString(),complete:true,partitions:results.map(r=>({district:r.value.district,pages:r.value.pages,count:r.value.rows.length,completedAt:r.value.completedAt})),rows};await writeFile(`${folder}/raw-all.json`,JSON.stringify(result));console.log(`All partitions complete: ${rows.length} merchants`);}
