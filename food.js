// Detailed cuisine is a discovery aid, not an official merchant category.
export const FOOD_TYPES = ['한식','일식','중식','양식','피자','치킨','돈까스','분식','카페·디저트','패스트푸드','주점','기타 음식점'];
export function classifyFood(merchant) {
 if(merchant.category !== '음식점') return null;
 const name=merchant.name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 const industry=merchant.industry || '';
 // Preserve explicit cafe/bakery and pub industries rather than guessing from incidental names.
 if(['커피전문점','제과점'].includes(industry))return {types:['카페·디저트'],basis:'원본 업종'};
 if(industry==='맥주홀')return {types:['주점'],basis:'원본 업종'};
 const special=[];
 if(/피자|pizza|도미노|파파존스/.test(name))special.push('피자');
 if(/치킨|통닭|닭강정|교촌|굽네|비비큐|bbq|bhc|푸라닭|노랑통닭|처갓집|페리카나|네네치킨|멕시카나|지코바/.test(name))special.push('치킨');
 if(/돈까스|돈가스|돈카츠|돈카쓰|돈까츠|돈가츠|카츠|가츠|사보텐|코바코/.test(name))special.push('돈까스');
 if(special.length)return {types:special,basis:'매장명 추정'};
 const rules=[
 ['일식',/스시|초밥|사시미|이자카야|우동|소바|라멘|오마카세|텐동|규동|야키토리/],
 ['한식',/삼겹|삼겹살|갈비|국밥|감자탕|설렁탕|곰탕|삼계탕|순대국|순댓국|김치찌개|부대찌개|백반|한정식|해장국|보쌈|족발|닭갈비|냉면/],
 ['중식',/중화|짜장|자장면|짬뽕|마라탕|마라샹궈|양꼬치|훠궈/],
 ['분식',/떡볶이|떡복이|김밥|분식/],
 ['양식',/파스타|스테이크|리조또|이탈리안/],
 ['카페·디저트',/카페|커피|베이커리|디저트|cafe|coffee|아이스크림|배스킨|베스킨/],
 ['패스트푸드',/버거|맥도날드|롯데리아|서브웨이|샌드위치/]
 ];
 const explicit={'한식':'한식','일식':'일식','중식':'중식','양식':'양식','패스트푸드':'패스트푸드'};
 // Respect specific original cuisines; name rules refine generic or broad records.
 if(explicit[industry] && !['패스트푸드','양식'].includes(industry)) {
  const specific=rules.find(([type,re])=>re.test(name)&&type!==explicit[industry]);
  if(!specific)return {types:[explicit[industry]],basis:'원본 업종'};
 }
 for(const [type,re] of rules)if(re.test(name))return {types:[type],basis:'매장명 추정'};
 return {types:[explicit[industry] || '기타 음식점'],basis:explicit[industry] ? '원본 업종' : '미분류'};
}
