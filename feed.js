import { classifyFood } from './food.js';
const districts = new Set(['분당구', '수정구', '중원구']);
export function validateFeed(data) {
  if (!Array.isArray(data) || data.length > 50000) throw new Error('가맹점 배열이 필요합니다.');
  const ids = new Set();
  return data.map(item => {
    for (const field of ['id', 'name', 'category', 'district', 'address']) {
      if (typeof item[field] !== 'string' || !item[field].trim() || item[field].length > 300) throw new Error(`잘못된 필드: ${field}`);
    }
    if (!districts.has(item.district) || ids.has(item.id)) throw new Error('지역 또는 고유 ID를 확인하세요.');
    ids.add(item.id);
    const result = Object.fromEntries(['id', 'name', 'category', 'district', 'address'].map(key => [key, item[key]]));
    if (typeof item.industry === 'string' && item.industry.length <= 300) result.industry = item.industry;
    if (Array.isArray(item.location) && item.location.length === 2 && item.location.every(Number.isFinite) && item.location[0] >= 37.2 && item.location[0] <= 37.6 && item.location[1] >= 126.9 && item.location[1] <= 127.4) result.location = [...item.location];
    const food = classifyFood(result);
    if (food) { result.foodTypes = food.types; result.foodClassification = food.basis; }
    return result;
  });
}
