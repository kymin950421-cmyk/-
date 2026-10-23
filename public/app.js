import { distanceKm, formatDistance, isWithinRadius, isWithinBounds } from './geo.js';
// Keep the map visible beside search and results.
const main=document.querySelector('main');
const sidebar=document.createElement('div');sidebar.className='map-sidebar';
for(const selector of ['.hero','#notice','.browse','.results','.guide','footer']){const section=main.querySelector(selector);if(section)sidebar.append(section);}
main.prepend(sidebar);main.classList.add('map-app');
if(!window.mapConfig?.kakaoKey){
 const message=document.createElement('p');message.className='map-warning';message.id='kakao-setup';message.textContent='카카오 지도 연결 대기 · 본인 앱의 JavaScript 키와 사이트 도메인 등록이 필요합니다. 현재는 참고 지도입니다.';document.querySelector('.map-section').prepend(message);
}
const $ = id => document.getElementById(id);
const icons = {'전체':'✦','음식점':'🥄🍴','마트·식품':'▧','병원·약국':'✚','도서·문구':'▤','의류·미용':'♧','교육·문화':'♫','운동·여가':'◉','기타':'◇'};
let data = null, category = '', foodType = '', page = 1;
const pageSize = 60;
let clusterIds = null, selectedMerchant = null, userLocation = null, locationRequested = false, locationPending = false;
let distances = new Map(), radiusKm = 0, areaBounds = null;
function element(tag, text, className) { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; }
function render({updateMap=true,preserveView=true} = {}) {
  if (!data) return;
  updateAreaButton();
  const query = $('search').value.trim().toLocaleLowerCase();
  const district = $('district').value;
  const demo = data.mode === 'demo';
  const visible = demo && !$('showDemo').checked ? [] : data.merchants;
  const baseList = visible.filter(m => isWithinRadius(distances.get(m.id) ?? Infinity,radiusKm) && (!category || m.category === category) && (!district || m.district === district) && `${m.name} ${m.address} ${m.industry || m.category} ${(m.foodTypes || []).join(' ')}`.toLocaleLowerCase().includes(query));
  const matches = baseList.filter(m=>!foodType || (m.foodTypes || []).includes(foodType));
  const list = matches.filter(m=>isWithinBounds(m.location,areaBounds) && (!clusterIds || clusterIds.has(m.id)));
  $('food-panel').hidden = category !== '음식점';
  $('food-types').replaceChildren();
  const foodTypes = ['전체','한식','일식','중식','양식','피자','치킨','돈까스','분식','카페·디저트','패스트푸드','주점','기타 음식점'];
  for (const type of foodTypes) {
    const button=element('button');const value=type==='전체'?'':type;
    const count=baseList.filter(m=>m.category==='음식점'&&(!value||(m.foodTypes||[]).includes(value))).length;
    button.append(element('span',type),element('small',count.toLocaleString()));button.classList.toggle('selected',foodType===value);button.setAttribute('aria-pressed',String(foodType===value));
    button.onclick=()=>{foodType=value;clusterIds=null;page=1;render();};$('food-types').append(button);
  }
  list.sort((a,b) => ($('sort').value === 'distance' && userLocation ? (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity) : $('sort').value === 'district' ? a.district.localeCompare(b.district,'ko') : 0) || a.name.localeCompare(b.name,'ko'));
  if(updateMap) {
    window.merchantMap?.update(matches,data.updatedAt || data.mode,{preserveView});
    window.merchantMap?.setRadius(userLocation,radiusKm);
  }
  document.querySelectorAll('[data-radius]').forEach(button=>{const value=Number(button.dataset.radius);button.disabled=value>0&&!userLocation;button.setAttribute('aria-pressed',String(value===radiusKm));});
  $('radius-hint').textContent=!userLocation?'위치를 허용하면 선택할 수 있어요.':radiusKm?`내 위치에서 직선 ${radiusKm}km 이내 · 좌표 없는 매장 제외`:'내 위치 기준 직선거리 · 모든 성남시 가맹점';
  $('cluster-selection').hidden = !clusterIds && !areaBounds;
  $('cluster-label').textContent = `${areaBounds ? '이 지도 영역' : '선택한 지도 묶음'} · ${list.length.toLocaleString()}곳`;

  $('count').textContent = list.length.toLocaleString();
  $('cards').replaceChildren();
  const pages = Math.max(1,Math.ceil(list.length/pageSize)); page = Math.min(page,pages);
  $('page-label').textContent = `${page} / ${pages} 페이지`; $('previous').disabled = page <= 1; $('next').disabled = page >= pages; $('pagination').hidden = list.length <= pageSize;
  for (const m of list.slice((page-1)*pageSize,page*pageSize)) {
    const card = element('article',null,'card');
    card.dataset.merchantId=m.id;
    if(!demo && m.location) {
      card.classList.add('selectable-card');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`${m.name} 지도에서 보기`);
      card.classList.toggle('is-selected',selectedMerchant===m.id);
      const choose=()=>{selectedMerchant=m.id;document.querySelectorAll('.card.is-selected').forEach(c=>c.classList.remove('is-selected'));card.classList.add('is-selected');window.merchantMap?.focus(m.id);};
      card.addEventListener('click',event=>{if(event.target.closest('a,button'))return;choose();});
      card.addEventListener('keydown',event=>{if(event.target===card && ['Enter',' '].includes(event.key)){event.preventDefault();choose();}});
    }

    const top = element('div',null,'card-top');
    top.append(element('span',icons[m.category] || '◇','shop-icon'), element('span',demo ? '예시 데이터' : '제공처 수록','badge'));
    card.append(top,element('div',m.industry ? `${m.category} · ${m.industry}` : m.category,'category-label'),element('h3',m.name),element('p',m.address,'address'));
    if(m.foodTypes?.length) card.append(element('div',`${m.foodTypes.join(' · ')}${m.foodClassification==='매장명 추정'?' · 매장명 추정':''}`,'food-tag'));
    const bottom = element('div',null,'card-bottom'); bottom.append(element('span',m.district));
    if (!demo && m.location) bottom.append(element('span',userLocation ? formatDistance(distances.get(m.id) ?? Infinity) : '눌러서 위치 보기','distance-label'));
    else if (!demo) { const link = element('a','지도에서 찾기 ↗'); link.href = 'https://map.naver.com/p/search/' + encodeURIComponent(`${m.name} ${m.address}`); link.target='_blank'; link.rel='noopener noreferrer'; bottom.append(link); }
    else bottom.append(element('span','실제 사용처 아님'));
    card.append(bottom); $('cards').append(card);
  }
  $('empty').hidden = list.length > 0;
  $('empty-message').textContent = demo && !$('showDemo').checked ? '공식 데이터가 아직 연결되지 않았습니다. 예시 화면 보기로 기능을 체험할 수 있어요.' : areaBounds ? '이 지도 영역에 조건에 맞는 매장이 없어요. 지도를 옮겨 다시 검색하거나 전체 결과 보기를 눌러주세요.' : radiusKm ? `${radiusKm}km 안에 조건에 맞는 매장이 없어요. 거리를 넓히거나 필터를 바꿔보세요.` : '검색어나 필터를 바꿔보세요.';
  $('active-filters').textContent = [radiusKm && `내 주변 ${radiusKm}km`,district,category,foodType,query && `“${$('search').value.trim()}”`].filter(Boolean).join(' · ');
  for (const button of $('categories').children) { const active = button.dataset.category === category; button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active)); }
}
async function load() {
  try {
    const response = await fetch('/api/merchants'); if (!response.ok) throw new Error();
    data = await response.json();
    const demo = data.mode === 'demo';
    const sourceNotice=data.sourceMode==='official-snapshot' ? '신한카드 공식 조회에서 직접 수집한 목록입니다. 수집 시각 이후 변경될 수 있으니 방문 전 결제 가능 여부를 확인하세요.' : `${data.sourceName} · 원본 기준: ${data.dataAsOf || '제공처 확인 필요'}. 방문 전 결제 가능 여부를 확인하세요.`;
    $('notice').textContent = demo ? '체험 화면입니다. 아래 매장은 모두 가상 예시이며 실제 아동수당 사용처가 아닙니다. 공식 데이터 연결을 기다리고 있어요.' : data.error || sourceNotice;
    $('notice').classList.toggle('live',!demo && !data.error);
    document.querySelector('.demo-toggle').hidden = !demo;
    $('freshness').textContent = demo ? '공식 데이터 미연결 · 예시 데이터' : `출처: ${data.sourceName} · ${data.sourceMode==='official-snapshot'?'수집 시각':'마지막 수신'}: ${new Date(data.updatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국시간) · ${data.sourceMode==='official-snapshot'?'공식 조회 직접 수집 · 원본 기준일 미제공 · 수동 갱신':`${Math.round(data.refreshSeconds/60)}분마다 수신 확인`}${data.excludedCount ? ` · 지역 미확인 ${data.excludedCount}건 제외` : ''}`;
    $('source-link').hidden = !data.sourcePage; if(data.sourcePage) $('source-link').href = data.sourcePage;
    const cats = ['전체',...new Set([...Object.keys(icons).filter(c=>c!=='전체'),...data.merchants.map(m=>m.category)])];
    $('categories').replaceChildren();
    for (const c of cats) { const b=element('button'); b.dataset.category=c==='전체'?'':c; b.append(element('span',icons[c] || '◇'),element('strong',c)); b.onclick=()=>{category=b.dataset.category;foodType='';clusterIds=null;page=1;render();}; $('categories').append(b); }
    updateDistances();render();
    if(!locationRequested) requestLocation();
  } catch { $('notice').textContent = '서버에서 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; }
}
for (const id of ['search','district','sort','showDemo']) $(id).addEventListener(id==='search'?'input':'change',()=>{if(id!=='sort')clusterIds=null;if(id==='district')areaBounds=null;page=1;render({preserveView:id!=='district'});});
$('reset').onclick = () => { $('search').value=''; $('district').value=''; category='';foodType='';radiusKm=0;areaBounds=null;clusterIds=null;page=1;render(); };
document.querySelectorAll('[data-search]').forEach(b=>b.onclick=()=>{$('search').value=b.dataset.search;clusterIds=null;page=1;render();});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
$('previous').onclick=()=>{page--;render();}; $('next').onclick=()=>{page++;render();};
function updateDistances(){
  distances=new Map();if(!userLocation || !data)return;
  for(const m of data.merchants)distances.set(m.id,distanceKm(userLocation,m.location));
}
function requestLocation({returnToUser=false} = {}){
  if(locationPending)return;locationRequested=true;
  if(!navigator.geolocation){$('location-status').textContent='이 브라우저는 위치 확인을 지원하지 않습니다.';return;}
  locationPending=true;$('map-locate').disabled=true;$('map-locate').setAttribute('aria-busy','true');$('locate').disabled=true;$('location-status').textContent='위치 확인 중… 브라우저의 위치 권한을 허용해 주세요.';
  navigator.geolocation.getCurrentPosition(position=>{
    locationPending=false;$('map-locate').disabled=false;$('map-locate').setAttribute('aria-busy','false');$('locate').disabled=false;
    const {latitude,longitude}=position.coords;
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)){$('location-status').textContent='위치 정보를 확인하지 못했습니다.';return;}
    userLocation=[latitude,longitude];updateDistances();$('distance-sort').disabled=false;$('sort').value='distance';areaBounds=null;clusterIds=null;page=1;render();
    const nearest=data?.merchants.filter(m=>m.location).sort((a,b)=>distances.get(a.id)-distances.get(b.id)).slice(0,5)||[];
    const far=nearest.length && distances.get(nearest[0].id)>30;
    $('location-status').textContent=far?'성남시와 거리가 있어요. 가까운 성남시 가맹점순으로 표시합니다.':'내 위치 기준 가까운순 · 거리는 직선거리입니다.';
    window.merchantMap?.locate(userLocation,far&&!returnToUser?nearest.map(m=>m.location):null);
    if(radiusKm&&returnToUser)window.merchantMap?.setRadius(userLocation,radiusKm,true);
  },error=>{
    locationPending=false;$('map-locate').disabled=false;$('map-locate').setAttribute('aria-busy','false');$('locate').disabled=false;
    $('location-status').textContent=userLocation?'위치를 갱신하지 못했어요. 마지막 확인 위치를 기준으로 표시합니다.':error.code===1?'위치 권한이 꺼져 있어요. 전체 가맹점을 보여드립니다.':error.code===3?'위치 확인 시간이 초과됐어요. 내 위치를 눌러 다시 시도하세요.':'위치를 확인할 수 없어요. 전체 목록을 이용할 수 있습니다.';
  },{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
}
document.querySelectorAll('[data-radius]').forEach(button=>button.onclick=()=>{
  const value=Number(button.dataset.radius);if(value&&!userLocation)return;
  radiusKm=value;areaBounds=null;clusterIds=null;selectedMerchant=null;page=1;render();
});
$('locate').onclick=requestLocation;
$('map-locate').onclick=()=>{
  if(!userLocation){requestLocation({returnToUser:true});return;}
  areaBounds=null;clusterIds=null;selectedMerchant=null;page=1;$('sort').value='distance';render();
  window.merchantMap?.locate(userLocation);
  if(radiusKm)window.merchantMap?.setRadius(userLocation,radiusKm,true);
  $('location-status').textContent='확인한 내 위치로 돌아왔어요. 업종·거리 조건은 유지합니다.';
  requestLocation({returnToUser:true});
};
$('clear-cluster').onclick=()=>{areaBounds=null;clusterIds=null;page=1;render({updateMap:false});};
window.addEventListener('merchant-selected',event=>{
  selectedMerchant=event.detail.id;
  document.querySelectorAll('.selectable-card').forEach(card=>card.classList.toggle('is-selected',card.dataset.merchantId===selectedMerchant));
});
window.addEventListener('merchant-cluster-select',event=>{
  areaBounds=null;clusterIds=new Set(event.detail.ids);page=1;selectedMerchant=null;render({updateMap:false});
  document.querySelector('.map-sidebar').scrollTo({top:$('cluster-selection').offsetTop-document.querySelector('.map-sidebar').offsetTop-10,behavior:'smooth'});
});
function updateAreaButton() {
  const bounds=window.merchantMap?.getBounds();
  $('map-search-area').disabled=!bounds || !data;
  const same=areaBounds && bounds && ['south','north','west','east'].every(key=>Math.abs(bounds[key]-areaBounds[key])<0.000001);
  $('map-search-area').textContent=same?'이 영역 검색 완료':areaBounds?'이 지도 영역 다시 검색':'이 지도 영역에서 검색';
}
$('map-search-area').onclick=()=>{
  const bounds=window.merchantMap?.getBounds();if(!bounds || !data)return;
  areaBounds={...bounds};clusterIds=null;selectedMerchant=null;page=1;
  render({updateMap:false});updateAreaButton();
};
$('map-fit').addEventListener('click',()=>{areaBounds=null;clusterIds=null;page=1;render({updateMap:false});updateAreaButton();});
window.addEventListener('merchant-map-view',updateAreaButton);
load(); setInterval(load,60000);
