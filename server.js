import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateFeed } from './feed.js';
import { DEFAULT_FEED, SOURCE_PAGE, convertSnFeed } from './provider.js';
const root = path.dirname(fileURLToPath(import.meta.url));
const feedUrl = process.env.MERCHANT_FEED_URL || DEFAULT_FEED;
const snProvider = feedUrl === DEFAULT_FEED;
const sourceName = process.env.MERCHANT_SOURCE_NAME || (snProvider ? 'SN Child Pay 공개 GitHub 데이터' : '연결된 데이터 제공처');
const sourcePage = process.env.MERCHANT_SOURCE_PAGE || (snProvider ? SOURCE_PAGE : '');
const interval = Math.max(60, Number(process.env.REFRESH_SECONDS) || 900);
const cachePath = path.join(root, '.local', 'merchants.json');
let state = { merchants: validateFeed(JSON.parse(await readFile(path.join(root, 'data/demo.json'), 'utf8'))), mode: 'demo', updatedAt: null, lastAttemptAt: null, error: null };
if (feedUrl) {
  if (!feedUrl.startsWith('https://')) throw new Error('MERCHANT_FEED_URL은 HTTPS 주소여야 합니다.');
  try {
    const cache = JSON.parse(await readFile(cachePath, 'utf8'));
    if (cache.feedUrl === feedUrl) state = { ...state, merchants: validateFeed(cache.merchants), mode: 'live', updatedAt: cache.updatedAt, sourceCount: cache.sourceCount, excludedCount: cache.excludedCount };
  } catch {}
}
async function refresh() {
  if (!feedUrl) return;
  state.lastAttemptAt = new Date().toISOString();
  try {
    const response = await fetch(feedUrl, { signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(`제공처 응답: ${response.status}`);
    const text = await response.text();
    if (Buffer.byteLength(text) > 20_000_000) throw new Error('데이터 크기 제한 초과');
    const payload = JSON.parse(text);
    const converted = snProvider ? convertSnFeed(payload) : { merchants: validateFeed(payload), sourceCount: payload.length, excludedCount: 0 };
    const { merchants, sourceCount, excludedCount } = converted;
    const updatedAt = new Date().toISOString();
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(cachePath + '.tmp', JSON.stringify({ feedUrl, merchants, updatedAt, sourceCount, excludedCount }));
    await rename(cachePath + '.tmp', cachePath);
    state = { ...state, merchants, mode: 'live', updatedAt, sourceCount, excludedCount, error: null };
  } catch { state.error = '데이터 갱신에 실패했습니다. 마지막 수신 상태를 확인하세요.'; }
}
const files = { '/theme.css':['theme.css','text/css; charset=utf-8'], '/districts.json':['districts.json','application/json; charset=utf-8'], '/kakao-map.js':['kakao-map.js','text/javascript; charset=utf-8'], '/map.js':['map.js','text/javascript; charset=utf-8'], '/': ['index.html','text/html; charset=utf-8'], '/app.js':['app.js','text/javascript; charset=utf-8'], '/style.css':['style.css','text/css; charset=utf-8'] };
const vendorFiles = {
 '/vendor/leaflet.js':['leaflet/dist/leaflet.js','text/javascript; charset=utf-8'],
 '/vendor/leaflet.css':['leaflet/dist/leaflet.css','text/css; charset=utf-8'],
 '/vendor/cluster.js':['leaflet.markercluster/dist/leaflet.markercluster.js','text/javascript; charset=utf-8'],
 '/vendor/cluster.css':['leaflet.markercluster/dist/MarkerCluster.css','text/css; charset=utf-8']
};
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy', "upgrade-insecure-requests; default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' https://dapi.kakao.com https://t1.daumcdn.net https://t1.kakaocdn.net; img-src 'self' data: https://tile.openstreetmap.org https://*.daumcdn.net https://*.kakaocdn.net; connect-src 'self' https://dapi.kakao.com https://*.daumcdn.net https://*.kakaocdn.net; base-uri 'none'; frame-ancestors 'none'");
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  if(url.pathname === '/healthz') {
    const keyReady=/^[a-zA-Z0-9]{16,100}$/.test(process.env.KAKAO_MAP_JAVASCRIPT_KEY || '');
    const ready=state.mode==='live' && state.merchants.length>0 && (process.env.NODE_ENV!=='production' || keyReady);
    res.writeHead(ready ? 200 : 503,{'Content-Type':'application/json; charset=utf-8'});
    return res.end(JSON.stringify({status:ready?'ready':'starting',dataReady:state.mode==='live',mapConfigured:keyReady}));
  }
  if(url.pathname === '/map-config.js') {
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    const key=process.env.KAKAO_MAP_JAVASCRIPT_KEY || '';
    return res.end('window.mapConfig='+JSON.stringify({kakaoKey:/^[a-zA-Z0-9]{16,100}$/.test(key)?key:null})+';');
  }
  if (url.pathname === '/api/merchants') {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.end(JSON.stringify({ ...state, dataAsOf: snProvider ? '2025년 6월 (제공처 README 기준)' : null, sourceCount: state.sourceCount ?? null, excludedCount: state.excludedCount ?? null, sourceName: state.mode === 'live' ? sourceName : '화면 체험용 가상 데이터', sourcePage: state.mode === 'live' && /^https:\/\//.test(sourcePage) ? sourcePage : null, refreshSeconds: feedUrl ? interval : null }));
  }
  const vendor = vendorFiles[url.pathname];
  if(vendor) {
    try {res.setHeader('Content-Type',vendor[1]); return res.end(await readFile(path.join(root,'node_modules',vendor[0])));}
    catch {res.writeHead(503);return res.end('Run npm ci to install map libraries');}
  }
  const file = files[url.pathname];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  try { res.setHeader('Content-Type',file[1]); res.end(await readFile(path.join(root,'public',file[0]))); }
  catch { res.writeHead(500); res.end('Server error'); }
});
server.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => console.log('서버 시작 완료'));
await refresh();
setInterval(refresh, interval * 1000).unref();
