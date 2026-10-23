import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFood } from '../food.js';
const food=(name,industry='일반대중음식')=>classifyFood({name,industry,category:'음식점'});
test('스시, 삼겹살, 피자, 치킨, 돈까스 세분화',()=>{
for(const [name,type] of [['정자스시','일식'],['동네 삼겹살','한식'],['우리 피자','피자'],['교촌 정자점','치킨'],['바삭 돈가스','돈까스']])assert.deepEqual(food(name).types,[type]);
});
test('피자·치킨 복합 매장은 두 필터에서 검색',()=>assert.deepEqual(food('피자나라 치킨공주').types,['피자','치킨']));
test('원본 업종과 매장명 추정을 구분',()=>{assert.equal(food('행복식당','한식').basis,'원본 업종');assert.equal(food('동네 삼겹살').basis,'매장명 추정');assert.equal(food('행복식당').basis,'미분류');});
test('원본 카페·제과 업종과 비음식점은 보존',()=>{assert.deepEqual(food('피자베이커리','제과점').types,['카페·디저트']);assert.equal(classifyFood({name:'피자책방',category:'도서·문구'}),null);});
test('돈까스가 원본 일식보다 세부 필터를 우선',()=>assert.deepEqual(food('바삭돈까스','일식').types,['돈까스']));
