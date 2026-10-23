import { validateFeed } from './feed.js';
const districts=['분당구','수정구','중원구'];
export function validateOfficialSnapshot(value){
 if(value?.sourceType!=='official-query-snapshot'||value.complete!==true||!Number.isFinite(Date.parse(value.collectedAt)))throw new Error('Incomplete official snapshot');
 if(value.sourcePage!=='https://www.shinhancard.com/mob/MOBFM204N/MOBFM204R11.shc')throw new Error('Unexpected official source');
 if(!Array.isArray(value.partitions)||value.partitions.length!==3||new Set(value.partitions.map(p=>p.district)).size!==3||value.partitions.some(p=>!districts.includes(p.district)||!Number.isInteger(p.count)||p.count<1||!Number.isInteger(p.pages)||p.pages<1))throw new Error('Incomplete district partitions');
 const merchants=validateFeed(value.merchants);
 if(value.sourceCount!==merchants.length||value.partitions.reduce((sum,p)=>sum+p.count,0)!==merchants.length)throw new Error('Official snapshot counts differ');
 for(const partition of value.partitions)if(merchants.filter(m=>m.district===partition.district).length!==partition.count)throw new Error('District count mismatch');
 if(merchants.some(m=>!m.id.startsWith('shinhan-')))throw new Error('Unexpected official merchant identity');
 return {...value,merchants};
}
