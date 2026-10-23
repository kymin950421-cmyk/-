import { validateFeed } from './feed.js';
export const DEFAULT_FEED = 'https://raw.githubusercontent.com/whlee0525/sn-child-pay/main/public/data/all.json';
export const SOURCE_PAGE = 'https://github.com/whlee0525/sn-child-pay';
const groups = [
 ['음식점', ['한식','중식','일식','양식','일반대중음식','커피전문점','패스트푸드','제과점','맥주홀']],
 ['도서·문구',['서적','문구용품']],
 ['교육·문화',['일반전문학원','유치원','독서실','학교등록금','과학기자재','교육기자재']],
 ['병원·약국',['개인병원','치과병원','약국','한의원,한약방','의료기기,건강진단','인삼  및  건강제품','동물병원','안경,콘텍트렌즈']],
 ['의류·미용',['피부미용실','이용,미용','남.여기성복','화장품','악세사리','미용재료','내의류판매업']],
 ['마트·식품',['식품잡화','생활잡화','편의점','할인점/슈퍼마켓','대량양판점','정육점','농수산물','청과물','미곡상','농가공산품']],
 ['운동·여가',['스포츠센타/레포츠클럽','운동경기,레져용품','레저스포츠','당구장','실내골프장','대중목욕탕','관광여행사']],
];
const categories = new Map(groups.flatMap(([group,items])=>items.map(item=>[item,group])));
export function convertSnFeed(rows) {
 if (!Array.isArray(rows) || rows.length > 50000 || !rows.length) throw new Error('제공처 목록 형식 오류');
 const merchants = [], seen = new Set(); let excludedCount = 0;
 for (const row of rows) {
  if (!row || !['string','number'].includes(typeof row.id) || !String(row.id).trim() || typeof row.n !== 'string' || !row.n.trim() || typeof row.a !== 'string' || typeof row.c !== 'string' || !row.c.trim()) throw new Error('제공처 필드 오류');
  const id = `sn-${row.id}`;
  if(seen.has(id)) throw new Error('제공처 중복 ID'); seen.add(id);
  // Do not guess the district from coordinates or similarly named neighborhoods.
  const district = ['분당구','수정구','중원구'].find(d=>new RegExp(`성남시\\s+${d}`).test(row.a));
  if (!district) { excludedCount++; continue; }
  merchants.push({id,name:row.n.trim(),category:categories.get(row.c.trim()) || '기타',district,address:row.a.trim(),industry:row.c.trim(),location:row.l});
 }
 if(!merchants.length) throw new Error('유효한 성남시 가맹점 없음');
 return { merchants:validateFeed(merchants), sourceCount:rows.length, excludedCount };
}
