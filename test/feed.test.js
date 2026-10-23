import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeed } from '../feed.js';
const merchant = { id:'1', name:'검증 매장', category:'도서·문구', district:'분당구', address:'성남시 분당구' };
test('가맹점 필수 정보 검증 및 임의 필드 제거',()=>assert.deepEqual(validateFeed([{...merchant, token:'excluded'}]),[merchant]));
test('성남시 외 지역 거부',()=>assert.throws(()=>validateFeed([{...merchant,district:'강남구'}])));
test('중복 ID 거부',()=>assert.throws(()=>validateFeed([merchant,merchant])));
test('잘못된 제공처 응답 및 누락된 주소 거부',()=>{assert.throws(()=>validateFeed({error:'denied'}));assert.throws(()=>validateFeed([{...merchant,address:''}]));});
test('빈 목록은 유효한 데이터로 수용',()=>assert.deepEqual(validateFeed([]),[]));
test('정상 성남시 인근 좌표를 보존하고 잘못된 좌표를 제거한다',()=>{
assert.deepEqual(validateFeed([{...merchant,location:[37.4,127.1]}])[0].location,[37.4,127.1]);
for(const location of [[0,0],[127.1,37.4],['37.4',127.1],[37.4],null])assert.equal(validateFeed([{...merchant,location}])[0].location,undefined);
});
