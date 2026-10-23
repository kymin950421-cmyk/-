import { readFile, writeFile, rename } from 'node:fs/promises';
import { validateOfficialSnapshot } from '../official-snapshot.js';
import { categoryForIndustry } from '../provider.js';
const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/import-official.mjs PREPARED_JSON');
let snapshot=JSON.parse(await readFile(input,'utf8'));
if(snapshot.sourceType!=='official-query-snapshot'||!snapshot.complete||snapshot.partitions?.length!==3||!snapshot.collectedAt||snapshot.sourceCount!==snapshot.merchants?.length)throw new Error('Invalid source completeness metadata');
snapshot.merchants=snapshot.merchants.map(m=>({...m,category:categoryForIndustry(m.industry)}));
snapshot=validateOfficialSnapshot(snapshot);
if(snapshot.merchants.length<20000)throw new Error('Suspiciously small source; do not silently replace public data');
let previous;
try{previous=JSON.parse(await readFile('data/official-merchants.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(previous&&snapshot.merchants.length<previous.merchants.length*.8)throw new Error('Source decreased by over 20%; inspect before publication');
await writeFile('data/official-merchants.json.tmp',JSON.stringify(snapshot));
await rename('data/official-merchants.json.tmp','data/official-merchants.json');
console.log(`Validated official snapshot imported: ${snapshot.merchants.length} merchants`);
