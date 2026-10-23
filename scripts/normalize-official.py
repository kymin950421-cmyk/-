"""Normalize our official response snapshot, without another developer's coordinates.
Usage: python scripts/normalize-official.py RAW_JSON OUTPUT_JSON
Requires pyproj==3.7.2. EPSG:5174 is an interpretation cross-checked against landmarks,
not a coordinate reference declaration supplied by the API itself.
"""
import collections, hashlib, json, math, pathlib, sys
from pyproj import Transformer
raw_path, output_path = map(pathlib.Path, sys.argv[1:3])
raw_bytes = raw_path.read_bytes()
data = json.loads(raw_bytes)
if not data.get('complete') or len(data.get('partitions', [])) != 3:
    raise SystemExit('Incomplete collection; refusing to prepare publication')
if sum(p['count'] for p in data['partitions']) != len(data['rows']):
    raise SystemExit('Partition totals do not match')
transformer = Transformer.from_crs('EPSG:5174', 'EPSG:4326', always_xy=True)
merchants, ids = [], set()
no_position = 0
for row in data['rows']:
    identity = row['MCT_N'].strip()
    if not identity or identity in ids: raise SystemExit('Invalid or duplicate official ID')
    ids.add(identity)
    address, name, industry = row['MCT_AR'].strip(), row['MCT_NM'].strip(), row['MCT_RY_NM'].strip()
    districts = [d for d in ['분당구', '수정구', '중원구'] if d in address]
    if len(districts) != 1 or not name or not industry: raise SystemExit('Required source field mismatch')
    merchant = dict(id='shinhan-'+identity, name=name, address=address, industry=industry, district=districts[0])
    try:
        x, y = float(row['MCT_XC_VL']), float(row['MCT_YC_VL'])
        lng, lat = transformer.transform(x, y)
        if x == 0 or y == 0 or not (math.isfinite(lat) and math.isfinite(lng) and 37.2 <= lat <= 37.6 and 126.9 <= lng <= 127.4): raise ValueError()
        merchant['location'] = [round(lat, 7), round(lng, 7)]
    except (ValueError, TypeError): no_position += 1
    merchants.append(merchant)
result = dict(schemaVersion=1, sourceType='official-query-snapshot', sourceName='신한카드 성남시 아동수당 공식 조회', sourcePage=data['sourcePage'], sourceUrl=data['sourceUrl'], collectedAt=data['completedAt'], collectionStartedAt=data['startedAt'], sourceDataAsOf=None, complete=True, sourceCount=len(merchants), excludedCount=0, unmappedCount=no_position, partitions=data['partitions'], rawSha256=hashlib.sha256(raw_bytes).hexdigest(), coordinates=dict(source='MCT_XC_VL / MCT_YC_VL', interpretedCRS='EPSG:5174', targetCRS='EPSG:4326', note='표본 대조에 따른 좌표계 해석. 원본 위치 및 출입구 정확도를 보장하지 않음.'), merchants=merchants)
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')))
print(json.dumps(dict(sourceCount=len(merchants), unmappedCount=no_position, districts=dict(collections.Counter(m['district'] for m in merchants))), ensure_ascii=False))
