import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, formatDistance } from '../public/geo.js';
test('동일 좌표는 0이고 성남 인근 두 지점의 거리는 대칭이다',()=>{
 const a=[37.4,127.1],b=[37.41,127.1];assert.equal(distanceKm(a,a),0);assert(Math.abs(distanceKm(a,b)-1.112)<.01);assert.equal(distanceKm(a,b),distanceKm(b,a));
});
test('좌표 없는 매장은 거리순에서 마지막으로 보낸다',()=>{assert.equal(distanceKm([37.4,127.1],undefined),Infinity);assert.equal(distanceKm([37.4,127.1],[NaN,127.1]),Infinity);});
test('미터와 킬로미터를 구분해 직선거리를 표시한다',()=>{assert.equal(formatDistance(.35),'직선 350m');assert.equal(formatDistance(3.25),'직선 3.3km');assert.equal(formatDistance(Infinity),'거리 정보 없음');});
test('반경 경계 포함, 반경 밖과 좌표 없는 매장 제외, 제한 없음은 전체 포함',async()=>{
 const {isWithinRadius}=await import('../public/geo.js');
 assert.equal(isWithinRadius(1,1),true);assert.equal(isWithinRadius(1.00001,1),false);assert.equal(isWithinRadius(Infinity,3),false);assert.equal(isWithinRadius(Infinity,0),true);
});
