(() => {
 const key=window.mapConfig?.kakaoKey;
 if(!key)return;
 document.querySelector('.map-disclaimer').textContent='위치는 제공처 좌표 기준이며 실제 출입구·층수와 다를 수 있습니다.';
 const $=id=>document.getElementById(id);
 const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 // The SDK chooses HTTP image URLs on local HTTP origins. Normalize its CDN
 // images to verified HTTPS for local testing as well as public deployments.
 const secureImages = () => {
  for(const image of $('merchant-map').querySelectorAll('img[src^="http:"]')){
   const url=new URL(image.src);
   if(url.hostname.endsWith('.kakaocdn.net') || url.hostname.endsWith('.daumcdn.net')){url.protocol='https:';image.src=url.href;}
  }
 };
 const imageObserver=new MutationObserver(secureImages);
 imageObserver.observe($('merchant-map'),{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 let map,clusterer,info,markers=new Map(),current=[],pending=null,ready=false,lastKey='',lastMembers='',pendingLocation=null,locationOverlay=null,radiusCircle=null,pendingRadius=null,lastRadius='',selectedMarker=null,selectedImage=null,pendingFocus=null,hasPainted=false;
 function updateStatus(){if(!map)return;const bounds=map.getBounds();const n=current.filter(m=>bounds.contain(new kakao.maps.LatLng(...m.location))).length;$('map-visible').textContent=`현재 지도 안 ${n.toLocaleString()}곳`;}
 function fit(){if(!current.length){map.setCenter(new kakao.maps.LatLng(37.427,127.13));map.setLevel(8);return;}const bounds=new kakao.maps.LatLngBounds();current.forEach(m=>bounds.extend(new kakao.maps.LatLng(...m.location)));map.setBounds(bounds,45,45,45,45);}
 function details(m){
  const box=node('div');box.className='map-popup kakao-popup selected-callout';box.setAttribute('role','region');box.setAttribute('aria-label','선택한 가맹점');
  box.addEventListener('click',event=>event.stopPropagation());box.addEventListener('pointerdown',event=>event.stopPropagation());
  const close=node('button','×');close.className='popup-close';close.setAttribute('aria-label','상세 닫기');close.onclick=()=>info.close();
  box.append(close,node('small',m.foodTypes?.length?`${m.foodTypes.join(' · ')} · ${m.foodClassification}`:m.industry||m.category),node('h3',m.name),node('p',m.address),node('p','제공처 등록 위치 · 방문 전 결제 가능 여부 확인'));
  const link=node('a','카카오맵에서 확인 ↗');link.href=`https://map.kakao.com/link/map/${encodeURIComponent(m.name)},${m.location[0]},${m.location[1]}`;link.target='_blank';link.rel='noopener noreferrer';box.append(link);return box;
 }
 function show(m,marker){
  const box=details(m);
  const colocated=current.filter(other=>other.location[0]===m.location[0]&&other.location[1]===m.location[1]);
  if(colocated.length>1){
   box.classList.add('has-colocated');
   const select=node('select');select.className='colocated-select';select.setAttribute('aria-label','같은 위치의 가맹점 선택');
   for(const other of colocated){const option=node('option',other.name);option.value=other.id;option.selected=other.id===m.id;select.append(option);}
   select.onchange=()=>{const item=markers.get(select.value);if(item)show(item.m,item.marker);};box.append(select);
   const choices=node('div');choices.className='same-location';choices.append(node('p',`같은 좌표에 ${colocated.length}곳 · 매장을 선택하세요`));for(const other of colocated){const button=node('button',other.name);button.onclick=()=>show(other,markers.get(other.id).marker);choices.append(button);}box.append(choices);}
  if(selectedMarker && selectedMarker!==marker){selectedMarker.setImage(null);selectedMarker.setZIndex(0);}
  selectedMarker=marker;marker.setImage(selectedImage);marker.setZIndex(20);
  info.setContent(box);info.open(map,marker);
  window.dispatchEvent(new CustomEvent('merchant-selected',{detail:{id:m.id}}));
 }
 window.merchantMap={update(list,version,options={}){
  pending=[list,version,options];
  if(!ready){$('map-status').textContent='카카오 지도를 불러오는 중입니다…';return;}
  $('district-counts').replaceChildren();
  for(const district of ['분당구','수정구','중원구']){const b=node('button');b.append(node('span',district),node('strong',`${list.filter(m=>m.district===district).length.toLocaleString()}곳`));b.onclick=()=>{$('district').value=district;$('district').dispatchEvent(new Event('change'));};$('district-counts').append(b);}
  const members=list.map(m=>m.id).join(',');const signature=version+'|'+members;if(signature===lastKey){updateStatus();return;}const shouldFit=!hasPainted || (!options.preserveView && members!==lastMembers);hasPainted=true;lastMembers=members;lastKey=signature;
  current=list.filter(m=>Array.isArray(m.location));info.close();clusterer.clear();markers.clear();
  const layers=current.map(m=>{const marker=new kakao.maps.Marker({position:new kakao.maps.LatLng(...m.location),title:m.name});marker.merchantId=m.id;kakao.maps.event.addListener(marker,'click',()=>show(m,marker));markers.set(m.id,{marker,m});return marker;});
  clusterer.addMarkers(layers);$('map-status').textContent=`카카오 지도 · 위치 표시 ${current.length.toLocaleString()}곳 · 좌표 없는 ${list.length-current.length}곳은 목록에서 확인`;
  if(shouldFit)fit();updateStatus();
 },setRadius(location,radius,force=false){
   pendingRadius=[location,radius];if(!ready)return;
   const signature=JSON.stringify(pendingRadius);if(signature===lastRadius&&!force)return;lastRadius=signature;
   if(radiusCircle){radiusCircle.setMap(null);radiusCircle=null;}
   if(!location || !radius)return;
   radiusCircle=new kakao.maps.Circle({map,center:new kakao.maps.LatLng(...location),radius:radius*1000,strokeWeight:2,strokeColor:'#008a43',strokeOpacity:.55,fillColor:'#008a43',fillOpacity:.06});
   map.setBounds(radiusCircle.getBounds(),30,30,30,30);
 },locate(location,nearby){
   pendingLocation=[location,nearby];if(!ready)return;info.close();
   const position=new kakao.maps.LatLng(...location);
   if(locationOverlay)locationOverlay.setMap(null);
   const dot=node('div');dot.className='user-position';dot.setAttribute('role','img');dot.setAttribute('aria-label','내 현재 위치');dot.title='내 현재 위치';
   locationOverlay=new kakao.maps.CustomOverlay({position,content:dot,yAnchor:.5,zIndex:10});locationOverlay.setMap(map);
   if(nearby?.length){const bounds=new kakao.maps.LatLngBounds();nearby.forEach(p=>bounds.extend(new kakao.maps.LatLng(...p)));map.setBounds(bounds,45,45,45,45);}
   else{map.setLevel(5);map.setCenter(position);}
 },focus(id){if(!ready){pendingFocus=id;return;}const item=markers.get(id);if(!item)return;map.setLevel(2);map.setCenter(item.marker.getPosition());show(item.m,item.marker);}};
 const script=document.createElement('script');script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=clusterer`;
 script.onerror=()=>{$('map-status').textContent='카카오 지도 연결 실패';$('tile-warning').textContent='카카오 지도에 연결하지 못했습니다. 앱 키, 등록된 웹 도메인과 네트워크 접근 설정을 확인해 주세요.';$('tile-warning').hidden=false;};
 script.onload=()=>{
  if(!window.kakao?.maps?.load){script.onerror();return;}
  kakao.maps.load(()=>{
   try{
    map=new kakao.maps.Map($('merchant-map'),{center:new kakao.maps.LatLng(37.427,127.13),level:8});
    map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);
    clusterer=new kakao.maps.MarkerClusterer({map,averageCenter:true,minLevel:3,disableClickZoom:true,gridSize:65,styles:[{width:'50px',height:'50px',background:'#2b7458e8',border:'4px solid #ffffffb0',borderRadius:'50%',color:'#fff',textAlign:'center',fontWeight:'700',lineHeight:'42px'}]});
    kakao.maps.event.addListener(clusterer,'clusterclick',cluster=>{
      const ids=cluster.getMarkers().map(marker=>marker.merchantId);
      map.setLevel(Math.max(1,map.getLevel()-2),{anchor:cluster.getCenter()});
      window.dispatchEvent(new CustomEvent('merchant-cluster-select',{detail:{ids}}));
    });
    selectedImage=new kakao.maps.MarkerImage('/selected-marker.svg',new kakao.maps.Size(38,50),{offset:new kakao.maps.Point(19,49)});
    const callout=new kakao.maps.CustomOverlay({yAnchor:1,zIndex:30,clickable:true});
    info={
     setContent(content){callout.setContent(content);},
     open(target,marker){
       callout.setPosition(marker.getPosition());callout.setMap(target);
       requestAnimationFrame(()=>{
        const content=callout.getContent();if(!content?.isConnected)return;
        const box=content.getBoundingClientRect(),frame=$('merchant-map').getBoundingClientRect();
        const dx=box.left<frame.left+12?box.left-frame.left-12:box.right>frame.right-48?box.right-frame.right+48:0;
        const dy=box.top<frame.top+12?box.top-frame.top-12:box.bottom>frame.bottom-12?box.bottom-frame.bottom+12:0;
        if(dx||dy)target.panBy(dx,dy);
       });
     },
     close(){callout.setMap(null);if(selectedMarker){selectedMarker.setImage(null);selectedMarker.setZIndex(0);}selectedMarker=null;window.dispatchEvent(new CustomEvent('merchant-selected',{detail:{id:null}}));}
    };
    // At identical coordinates, let the visitor select every co-located merchant.
    kakao.maps.event.addListener(map,'click',()=>info.close());kakao.maps.event.addListener(map,'idle',updateStatus);
    let viewCenter=map.getCenter();
    kakao.maps.event.addListener(map,'idle',()=>{viewCenter=map.getCenter();});
    new ResizeObserver(()=>{map.relayout();map.setCenter(viewCenter);}).observe($('merchant-map'));
    $('map-fit').onclick=fit;ready=true;$('tile-warning').hidden=true;
    if(pending)window.merchantMap.update(...pending);
    if(pendingLocation)window.merchantMap.locate(...pendingLocation);
    if(pendingRadius)window.merchantMap.setRadius(...pendingRadius);
    if(pendingFocus){const id=pendingFocus;pendingFocus=null;window.merchantMap.focus(id);}
   }catch{script.onerror();}
  });
 };
 document.head.append(script);
})();
