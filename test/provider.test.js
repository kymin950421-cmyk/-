import test from 'node:test';
import assert from 'node:assert/strict';
import { convertSnFeed } from '../provider.js';
const row={id:1,n:'테스트 약국',c:'약국',a:'경기 성남시 분당구 정자로 1'};
test('SN Child Pay 필드를 변환하고 업종을 분류한다',()=>{
const result=convertSnFeed([row]);assert.equal(result.merchants[0].category,'병원·약국');assert.equal(result.merchants[0].industry,'약국');assert.equal(result.merchants[0].district,'분당구');assert.equal(result.sourceCount,1);
});
test('지역을 확정할 수 없는 행을 제외하고 집계한다',()=>{const result=convertSnFeed([row,{...row,id:2,a:'경기도 분당구 확인불가'}]);assert.equal(result.excludedCount,1);assert.equal(result.merchants.length,1);});
test('중복 ID, 손상된 응답과 빈 응답을 거부한다',()=>{assert.throws(()=>convertSnFeed([row,row]));assert.throws(()=>convertSnFeed([{...row,n:null}]));assert.throws(()=>convertSnFeed([]));});
test('알 수 없는 업종은 기타로 보존한다',()=>{const result=convertSnFeed([{...row,c:'새 업종'}]);assert.equal(result.merchants[0].category,'기타');assert.equal(result.merchants[0].industry,'새 업종');});
test('원본 위경도를 보존하고 비정상 좌표 매장은 목록에 유지한다',()=>{
assert.deepEqual(convertSnFeed([{...row,l:[37.4,127.1]}]).merchants[0].location,[37.4,127.1]);
const merchant=convertSnFeed([{...row,l:[0,0]}]).merchants[0];assert.equal(merchant.location,undefined);assert.equal(merchant.name,row.n);
});
