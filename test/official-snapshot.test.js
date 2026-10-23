import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOfficialSnapshot} from '../official-snapshot.js';
function sample(){const districts=['분당구','수정구','중원구'];return {sourceType:'official-query-snapshot',complete:true,collectedAt:'2026-10-23T00:00:00Z',sourcePage:'https://www.shinhancard.com/mob/MOBFM204N/MOBFM204R11.shc',sourceCount:3,partitions:districts.map(district=>({district,count:1,pages:1})),merchants:districts.map((district,i)=>({id:`shinhan-${i}`,name:`매장 ${i}`,district,address:`성남시 ${district}`,category:'음식점',industry:'한식'}))};}
test('세 구를 끝까지 수집한 공식 원본만 수용한다',()=>assert.equal(validateOfficialSnapshot(sample()).merchants.length,3));
test('일부 페이지, 구 누락, 총계 불일치를 거부한다',()=>{
 const a=sample();a.complete=false;assert.throws(()=>validateOfficialSnapshot(a));
 const b=sample();b.partitions.pop();assert.throws(()=>validateOfficialSnapshot(b));
 const c=sample();c.sourceCount=4;assert.throws(()=>validateOfficialSnapshot(c));
 const d=sample();d.partitions[0].count=2;d.partitions[1].count=0;assert.throws(()=>validateOfficialSnapshot(d));
});
test('제3자 자료를 공식 자료로 잘못 표기하지 못하게 한다',()=>{const a=sample();a.sourcePage='https://example.com';assert.throws(()=>validateOfficialSnapshot(a));const b=sample();b.merchants[0].id='sn-1';assert.throws(()=>validateOfficialSnapshot(b));});
