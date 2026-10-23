# 아이랑 성남

성남시 아동수당 포인트 가맹점을 지도·목록에서 검색하는 웹사이트입니다. Node.js 24 이상을 사용합니다.

```sh
npm ci --cache /tmp/sn-npm-cache
npm test
npm start
```

외부 실행 프로세스는 재시작해야 합니다. PORT 기본값은 3000이며 Render에서는 제공된 PORT를 사용합니다. 설치·시작 과정에서 데이터 수집이나 좌표 API 호출을 실행하지 않습니다.

## 기본 데이터: 신한카드 공식 조회 직접 수집본

기본 데이터는 `data/official-merchants.json`입니다. 다른 개발자의 가공 JSON을 기본 피드로 사용하지 않습니다. [공식 조회 페이지](https://www.shinhancard.com/mob/MOBFM204N/MOBFM204R11.shc)의 응답을 직접 수집하고, 해당 응답의 원본 좌표를 변환했습니다. 비교 조사와 근거는 [데이터 출처 조사](docs/DATA_SOURCES.md)에 기록했습니다.

스냅샷에는 직접 수집 시각, 원본 조회 URL, 세 구의 페이지·건수, 원본 응답 SHA-256, 좌표 변환 정보를 포함합니다. **원본 명부의 기준일은 API가 제공하지 않아 알 수 없습니다.** 수집일을 명부 기준일이나 현재 결제 가능 보장으로 표현하지 않습니다. 공식 명부에 등재되어도 단말기·사업자 변경 등의 이유로 포인트 결제가 안 될 수 있습니다.

서버는 검증된 스냅샷을 즉시 읽어 실행하므로 무료 호스팅의 절전 복귀 때 수천 페이지를 다시 수집하지 않습니다. 기본 데이터는 **수동 수집·검토·배포** 방식으로 갱신됩니다. 브라우저의 60초 서버 상태 조회는 신한카드 원본의 실시간 갱신이 아닙니다. sourceMode=`official-snapshot`, refreshSeconds=`null`로 구분합니다.

### 공식 자료 갱신

1. `npm run data:collect` 실행. 3개 구를 병행하며 각 구는 공식 다음 페이지 커서만 순서대로 따라갑니다. 폴더가 출력됩니다. API 속도에 따라 수십 분 걸릴 수 있습니다.
2. 완료 후 Python 3 환경에 선택적 수집 도구를 설치합니다.

```sh
python -m venv /tmp/shinhan-geo-env
/tmp/shinhan-geo-env/bin/pip install --cache-dir /tmp/sn-pip-cache -r scripts/requirements-collection.txt
/tmp/shinhan-geo-env/bin/python scripts/normalize-official.py COLLECTION_FOLDER/raw-all.json COLLECTION_FOLDER/prepared.json
npm run data:import -- COLLECTION_FOLDER/prepared.json
npm test
```

`COLLECTION_FOLDER`는 출력된 실제 경로로 바꿉니다. 실패한 작업만 이어가려면 `COLLECT_OUTPUT=실제폴더 npm run data:collect`로 명시합니다. 기본 실행은 새 폴더를 만들어 새로 수집합니다. 구별 중간 파일이나 일부 결과를 공개용으로 바꾸지 마세요. 세 구의 종료 확인, ID 중복·페이지 반복·불균형 열 검증을 거치며 비정상 감소는 게시를 차단합니다. 원본 응답은 `.local`에만 남기고 불필요한 전화번호 등을 공개 스냅샷에 넣지 않습니다. 수집이 끝나면 검토 후 Git 커밋과 별도 배포가 필요합니다.

좌표계 EPSG:5174는 원본 API가 선언한 값이 아니라 표본 대조로 선택한 해석입니다. pyproj로 4326으로 변환합니다. 0 또는 성남시 주변의 넓은 범위(위도37.2~37.6, 경도126.9~127.4)를 벗어난 좌표는 지도에서 제외하고 목록에는 유지합니다. 이 검증은 행정경계나 출입구 정확도의 보장이 아닙니다. 다른 개발자가 가공한 좌표를 복사하지 않습니다. 상세 근거는 출처 문서를 참조하세요.

### 선택적 외부 피드

`MERCHANT_FEED_URL`을 명시하면 기본 스냅샷 대신 HTTPS JSON 배열을 수신합니다. `MERCHANT_SOURCE_NAME`, `MERCHANT_SOURCE_PAGE`로 출처를 함께 설정하세요. `REFRESH_SECONDS`는 외부 피드에만 적용되며 기본900초·최소60초입니다. 기존 SN Child Pay URL을 명시한 경우에만 호환 변환기를 사용합니다. 외부 피드는 `.local/merchants.json`에 마지막 정상 데이터를 보관하며 다른 URL 캐시를 혼용하지 않습니다.

```json
[{"id":"unique-id","name":"매장명","category":"음식점","industry":"한식","district":"분당구","address":"성남시 분당구 상세주소","location":[37.4,127.1]}]
```

## 지도와 탐색

- Kakao Maps: `KAKAO_MAP_JAVASCRIPT_KEY`에 본인 **JavaScript 키**를 설정하고, Kakao Developers에서 카카오맵을 활성화한 뒤 실제 접속 origin을 SDK 허용 도메인에 등록합니다. REST/Admin 키를 사용하지 않습니다. 키는 브라우저에 전달되는 공개 플랫폼 키이므로 도메인 제한이 필요합니다. `.env` 자동 로드는 하지 않습니다.
- 카카오 키가 없으면 Leaflet 참고 지도로 동작합니다. OpenStreetMap 타일 실패 시 로컬 2013 통계청 구 경계만 표시하고 실패를 안내합니다. 참고 경계 출처는 [southkorea-maps](https://github.com/southkorea/southkorea-maps)이며 최신 법정경계가 아닙니다.
- 지도 숫자를 누르면 확대하면서 **클릭 시점에 그 묶음에 속한 매장 목록**을 표시합니다. `전체 결과 보기`로 해제합니다. 검색·지역·업종 변경은 선택을 해제하고 정렬 변경은 유지합니다.
- 카드 전체 클릭 또는 Enter/Space로 지도 이동과 상세 표시. 선택 핀은 빨간색·체크로 강조하고, 테두리와 꼬리가 완전한 말풍선을 사용합니다. 모바일에서는 가게명과 닫기만 표시하며 같은 좌표의 매장은 이름 선택 메뉴를 제공합니다.
- 음식점 세부 필터: 한식·일식·중식·양식·피자·치킨·돈까스·분식·카페/디저트 등. 원본 업종과 매장명을 사용하고 이름 기반은 `매장명 추정`으로 표시합니다. 피자·치킨 복합점은 두 범주에 포함될 수 있어 합계가 중복될 수 있습니다.
- 위치 허용 시 가까운순. 허용되지 않으면 전체 목록 유지. 위치는 페이지 메모리에서만 사용하며 앱 서버나 로컬 저장소에 보관하지 않습니다. 지도 제공처에는 표시 영역에 따른 지도 요청이 발생합니다.
- 내 주변 1·3·5km/제한 없음. Haversine 직선거리이며 경계를 포함합니다. 범위 적용 시 좌표 없는 매장을 제외하고 지도·목록·구별 합계에 동일하게 반영합니다. 검색 초기화는 범위도 해제합니다.
- 모바일은 지도와 스크롤 목록을 위아래로, PC는 좌우로 배치합니다.

클라우드 Chromium의 프록시 CA 문제 때문에 브라우저 검증은 Node fetch가 TLS를 검증한 리소스를 테스트 전용 경로로 전달해 수행합니다. 인증서 검증 해제는 하지 않습니다. SDK의 동적 실행을 위해 CSP가 `unsafe-eval`을 허용하며 공개 배포는 HTTPS를 사용합니다.

## 배포와 이용 조건

[Render 배포 안내](DEPLOY.md)와 `render.yaml`을 사용합니다. Free 플랜, 자동 배포 꺼짐이 기본입니다. 공개 origin 등록은 개발용 origin 등록과 별개입니다. `/healthz`는 데이터 준비와 키 형식 존재를 확인하며 실제 지도 인증은 브라우저에서도 검증해야 합니다.

공개 조회에서 직접 수집했다고 해서 상업적 재배포·광고 수익화가 자동 허용되는 것은 아닙니다. 신한카드/제공기관의 조건은 별도 확인해야 합니다. 공공데이터포털의 공공누리 유형 역시 원문에서 확인하지 못한 사항을 확정적으로 표기하지 않습니다.
