(() => {
 if(window.mapConfig?.kakaoKey)return;
 const $ = id=>document.getElementById(id);
 const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 let map,clusters,markers=new Map(),lastKey='',displayed=[],districtLayers=[],tileErrors=0;
 const centers={'분당구':[37.382,127.117],'수정구':[37.456,127.106],'중원구':[37.434,127.164]};
 const colors={'분당구':'#518e71','수정구':'#91b2a3','중원구':'#719b96'};
 function status(){
  if(!map)return;
  const n=displayed.filter(m=>map.getBounds().contains(m.location)).length;
  $('map-visible').textContent=`현재 지도 안 ${n.toLocaleString()}곳`;
 }
 function init(){
  if(map)return true;
  if(!window.L || !L.markerClusterGroup){$('map-status').textContent='지도 기능을 불러오지 못했습니다. 목록은 계속 이용할 수 있어요.';return false;}
  map=L.map('merchant-map',{maxZoom:19,minZoom:10,scrollWheelZoom:false}).setView([37.427,127.13],12);
  map.attributionControl.setPrefix(false);
  L.control.scale({imperial:false}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'도로 지도 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',crossOrigin:true}).addTo(map);
  tiles.on('tileerror',()=>{tileErrors++;$('tile-warning').hidden=false;});
  tiles.on('tileload',()=>{tileErrors=0;$('tile-warning').hidden=true;});
  map.attributionControl.addAttribution('참고 경계: <a href="https://github.com/southkorea/southkorea-maps" target="_blank" rel="noopener noreferrer">통계청 2013 / southkorea-maps</a>');
  clusters=L.markerClusterGroup({maxClusterRadius:60,chunkedLoading:true,chunkInterval:40,chunkDelay:10,animate:false,spiderfyOnMaxZoom:true,showCoverageOnHover:false,iconCreateFunction:cluster=>L.divIcon({html:`<span>${cluster.getChildCount().toLocaleString()}</span>`,className:'merchant-cluster',iconSize:[52,52]})});
  clusters.on('clusterclick',e=>{if(e.layer.getChildCount()>1)$('map-status').textContent=`${e.layer.getChildCount().toLocaleString()}곳이 모여 있어요. 확대하거나 숫자를 다시 눌러 개별 위치를 확인하세요.`;});
  map.addLayer(clusters);
  map.on('moveend',status);
  fetch('/districts.json').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(geo=>{
   L.geoJSON(geo,{style:f=>({color:colors[f.properties.name.slice(-3)],weight:2,fillOpacity:.07}),onEachFeature:(f,layer)=>{layer.bindTooltip(f.properties.name.replace('성남시',''),{permanent:true,direction:'center',className:'district-name'});districtLayers.push(layer);}}).addTo(map);
  }).catch(()=>{});
  $('map-fit').onclick=()=>fit();
  return true;
 }
 function fit(){if(displayed.length)map.fitBounds(L.latLngBounds(displayed.map(m=>m.location)),{padding:[35,35],maxZoom:16});else map.setView([37.427,127.13],12);}
 function popup(m){
  const box=node('div');box.className='map-popup';
  box.append(node('small',m.foodTypes?.length ? `${m.foodTypes.join(' · ')} · ${m.foodClassification}` : m.industry || m.category),node('h3',m.name),node('p',m.address),node('p','제공처 등록 위치 · 방문 전 결제 가능 여부 확인'));
  const link=node('a','네이버 지도에서 확인 ↗');link.href='https://map.naver.com/p/search/'+encodeURIComponent(`${m.name} ${m.address}`);link.target='_blank';link.rel='noopener noreferrer';box.append(link);return box;
 }
 window.merchantMap={
  update(list,version){
   if(!init())return;
   const withLocations=list.filter(m=>Array.isArray(m.location));
   const key=version+'|'+list.map(m=>m.id).join(',');
   const counts=$('district-counts');counts.replaceChildren();
   for(const district of Object.keys(centers)){
    const n=list.filter(m=>m.district===district).length;
    const button=node('button');button.append(node('span',district),node('strong',`${n.toLocaleString()}곳`));
    button.onclick=()=>{document.getElementById('district').value=district;document.getElementById('district').dispatchEvent(new Event('change'));};
    counts.append(button);
   }
   const missing=list.length-withLocations.length;
   $('map-status').textContent=`위치 표시 ${withLocations.length.toLocaleString()}곳${missing ? ` · 좌표 없음·범위 외 ${missing.toLocaleString()}곳은 목록에서 확인` : ''}`;
   if(key===lastKey){status();return;}lastKey=key;
   const firstLoad=displayed.length===0;displayed=withLocations;
   clusters.clearLayers();markers.clear();
   const layers=withLocations.map(m=>{
    const marker=L.marker(m.location,{title:m.name,keyboard:true,icon:L.divIcon({className:'merchant-pin',html:'<span></span>',iconSize:[22,28],iconAnchor:[11,28],popupAnchor:[0,-27]})});
    marker.bindPopup(()=>popup(m)); markers.set(m.id,marker);return marker;
   });
   clusters.addLayers(layers);
   if(withLocations.length)fit();else if(firstLoad)map.setView([37.427,127.13],12);
   status();
  },
  focus(id){const marker=markers.get(id);if(!marker)return;document.getElementById('merchant-map').scrollIntoView({behavior:'smooth',block:'center'});map.setView(marker.getLatLng(),18);clusters.zoomToShowLayer(marker,()=>marker.openPopup());}
 };
})();
