import {weekOf} from './clock.js';
import {GENRES} from './data.js';
const hash=text=>{let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
export const APP_VERSION='1.4.3';
export const CREATOR='도구리';
export const RELEASE_DATE='2026-09-11';
export const VERSION_HISTORY=[
 {version:'1.4.3',date:'2026-09-12',title:'선택창 안정화와 최종 섭외 인물 교체',items:['모바일 세부장르 변경 시 선택창을 재생성·재포커스하지 않고 설명만 갱신','최종 섭외의 감독·주연·조연 모든 인물에 교체 버튼','교체 후보 선택 취소 시 기존 조합 보존, 교체 수락 후 전체 상호관계·요구조건 재계산','이전 추가 개런티 수락 무효화와 전체 섭외 조건 재확인','교체 전후 브라우저 뒤로가기 및 계약 확정 전 현금 보존','제작자: 도구리']},
 {version:'1.4.2',date:'2026-09-12',title:'모바일 제안 탐색과 초상화·제작비 개선',items:['첫 화면 영화사가 시작되는 띄어쓰기 수정','원본 얼굴의 눈 위치·기울기·변형을 반영한 안경과 렌즈 겹침 수정','모바일 세부장르 선택창을 3열로 배치','특수상영 준비비·규모·러닝타임·작업량을 반영한 비용과 견적 표시','모바일 시나리오 제안 전체를 세로 스크롤로 표시, 인물 목록 페이지 유지','이전 제작 계약·실적·저장 형식 보존','제작자: 도구리']},
 {version:'1.4.1',date:'2026-09-12',title:'모바일 탐색과 하단 진행 개선',items:['브라우저 뒤로가기·앞으로가기와 게임 화면·상세창의 이동 기록 연결','모바일 하단 1주 진행 고정, 다섯 메뉴 균등 정렬·짧은 가로 화면 한 줄 배치','개봉 전망 보기에서 박스오피스의 개봉 전망 탭으로 바로 이동','더보기에서 플레이 가이드·버전 기록을 닫으면 더보기로 복귀','더보기 하단 닫기 버튼·화면 이동과 게임 진행 기록 분리','제작자: 도구리']},
 {version:'1.4.0',date:'2026-09-12',title:'변화하는 영화인, 한 화면의 제작 데스크',items:['주간 능력치·월 기준료 변화와 최근 32건 기록','인물 검색·필터 상시 한 줄, 인물·시나리오 화면 높이 기반 페이지 나눔','원작 20종류·40편, 4주마다 두 작품 제안','8개 장르와 새 시나리오 32편','주간 소식 40종·현장 선택 사건 16종 추가·조용한 주는 진행 요약','이전 저장의 현재 능력치와 계약·흥행 기록 보존','제작자: 도구리']},
 {version:'1.3.0',date:'2026-09-12',title:'원작에서 최종 편집까지',items:['원작 8편의 저자·세계관·등장인물·전체 이야기·계약 조건','영화 상세 상단의 포스터와 제목, 인물 히스토리 뒤로가기 복구','은퇴 인물 전용 메뉴·검색 및 세대가 바뀌어도 남는 기록','대시보드 소식 상세·제안 연결 및 네 가지 지표의 세부 목록','2026년 일반 법인 누진세율·표준 지방세율 기반 월 운영비 세금 적립','90·120·150·180분 기획과 러닝타임별 제작비·상영 여력·작품성','후반작업 편집안과 감독의 동의·갈등·협의·강행·취소 및 영구 기록','기존 저장은 120분 기본값, 과거 실적·현금 보존, 세금 소급 부과 없음','제작자: 도구리']},
 {version:'1.2.0',date:'2026-09-12',title:'관객의 목소리, 새로운 상영관',items:['누적 관객·독립 관객 평점·다양한 평론과 상세평 팝업','주간 관객·매출 추세 및 실제 기록 그래프','재무 지표별 과거 기록과 최근 입출금 10건·전체 내역','과도한 평점과 흥행을 낮춘 새 작품 밸런스','3D·4D·IMAX·사운드 특화 제작 옵션과 제작비·품질 반영','가상 패러디 OTT 5개사 직접 계약·전용 상영관·시청자 평가','인물·제작사 클릭 상세, 촬영 중 중복 섭외 차단','인물정보 카드 밀도 개선·오름차순과 내림차순 정렬','스페이스키 다음 진행·실수 선택 방지·생애 및 대흥행 알림','완성작 줄거리·포스터 타이포그래피·이전 저장 기록 보존','제작자: 도구리']},
 {version:'1.1.0',date:'2026-09-12',title:'일주일마다, 새로운 장면',items:['1주 단위 제작·흥행 및 날짜 전환 연출 (1개월=4주)','첫 화면 복귀·저장 이어하기·전체화면·효과음 켜기/끄기','인물별 고유 초상화 합성으로 반복 사진 개선','0.5억 원으로 시나리오 6편 다시 받기','시나리오·장르·제작사·제작진 관계에 따른 섭외 거절과 추가 개런티 협상','선택 장르 재클릭 취소 및 제작 완료·포스터 선택 모달','홍보사 한 곳 선택 → 홍보 시작 → 1주 뒤 결과 알림','우측 하단 홍보·주간 흥행 알림과 지난 알림함 (개봉 후 8주)','포스터가 보이는 박스오피스·접이식 상세정보·적응형 목록으로 스크롤 축소','제작자: 도구리 · 이전 버전 저장 이어하기 지원']},
 {version:'1.0.3',date:RELEASE_DATE,title:'시작 화면 자동 맞춤',items:['시작 화면 전체를 화면 폭·높이에 맞춰 동일한 비율로 축소','세로 스크롤 없이 시작 버튼과 하단 안내까지 표시','화면 회전·창 크기·주소창·키보드에 따른 표시 영역 변화 반영','게임 시작 후에는 기존 화면과 대화창 스크롤 유지']},
 {version:'1.0.2',date:RELEASE_DATE,title:'초상화와 선택창 수정',items:['초상화 이미지 선로딩 및 로딩 실패 재시도','영화 제작진 기록에 초상화 표시','캐스팅 화면·인물 목록의 스크롤 독립 보존']},
 {version:'1.0.1',date:RELEASE_DATE,title:'휴대폰 세로 모드',items:['화면 폭에 따른 세로 레이아웃 자동 전환','인물·제작·캐스팅 카드 한 열 배치','전체 화면 대화창과 독립 스크롤·하단 결정 버튼','안전 영역 여백과 터치 크기, 입력 글자 크기 조정']},
 {version:'1.0.0',date:RELEASE_DATE,title:'정식 버전',items:['홍보매체 대표 일러스트와 기관 카드','기간 한정 장르 흥행 이벤트와 관객 보너스','창고영화 보관·꺼내기·나중 개봉','크랭크인·크랭크업·제작 완료·개봉 월 분리 기록','추가 제작 이력 보존 및 이전 저장 호환']},
 {version:'0.4.0',title:'관계와 작품의 방향',items:['매체별 10곳, 총 50개 가상 홍보 기관','궁합과 독립된 5단계 친밀도와 시간 변화','장르별 세부장르 39종 및 조합 효과']},
 {version:'0.3.0',title:'제작 현장과 관객의 반응',items:['홍보 방식과 상호작용, 미담·사회적 이슈','개런티·하차·교체와 계약 정산','무료 카메오, 원작 라이선스','포스터 12종, 연령별 초상화, 제작사 로고']},
 {version:'0.2.0',title:'영화인의 생애',items:['나이·은퇴·세대 교체','작품 이력과 궁합, 속편 제작','작품당 한 번의 추가 제작']},
 {version:'0.1.0',title:'첫 플레이 데모',items:['10개 제작사와 영화인 1,600명','시나리오·캐스팅·병렬 제작·개봉','흥행·평론·시상식·은행과 자동 저장']}
];
export function initTimeline(s,f,legacy=false){
 if(f.productionCycles)return;
 const finished=['ready','shelved','showing','closed'].includes(f.status),originalEnd=f.extended?f.start+f.months:finished?(f.readyMonth??f.start+f.months):null;
 f.productionCycles=[{kind:'original',start:f.start,crankIn:f.start,crankUp:legacy&&(finished||f.status==='reshoot')?Math.min(originalEnd??f.start+f.months,f.start+Math.ceil(f.months*.8)):null,completed:originalEnd,inferred:legacy}];
 if(f.extended)f.productionCycles.push({kind:'additional',start:f.reshootStart??f.start+f.months,crankIn:f.reshootStart??f.start+f.months,crankUp:finished?(f.reshootStart??f.start+f.months)+10:null,completed:finished?(f.readyMonth??f.releaseMonth):null,inferred:legacy});
 f.productionCompletedMonth=finished?f.readyMonth??f.releaseMonth:null;
 f.storageHistory??=[];
}
export function recordWrap(s,f){initTimeline(s,f);const cycle=f.productionCycles.at(-1),elapsed=f.status==='reshoot'?f.reshootElapsed:f.elapsed,threshold=f.status==='reshoot'?10:Math.ceil(f.months*.8);if(cycle.crankUp==null&&elapsed>=threshold&&f.pending==null){cycle.crankUp=s.month;cycle.crankUpWeek=weekOf(s);return true;}return false;}
export function finishTimeline(s,f){initTimeline(s,f);const cycle=f.productionCycles.at(-1);cycle.crankUp??=s.month;cycle.crankUpWeek??=weekOf(s);cycle.completed=s.month;cycle.completedWeek=weekOf(s);f.productionCompletedMonth=s.month;f.productionCompletedWeek=weekOf(s);}
const MOMENTS=[
 {title:'방학 극장 나들이',genres:['family','animation','adventure'],reason:'방학을 맞은 관객들이 함께 볼 수 있는 영화를 찾습니다.'},
 {title:'도시를 달리는 이야기',genres:['action','thriller','mystery'],reason:'긴장감 있는 이야기와 빠른 전개의 영화가 입소문을 탑니다.'},
 {title:'음악과 봄의 설렘',genres:['music','romance','drama'],reason:'공연과 감성적인 이야기에 대한 관객의 관심이 높아집니다.'},
 {title:'상상력의 계절',genres:['sf','fantasy','animation'],reason:'새로운 세계관을 경험하려는 관객이 극장을 찾습니다.'},
 {title:'웃음이 필요한 날들',genres:['comedy','family','drama'],reason:'기분을 바꾸는 유쾌하고 따뜻한 영화가 주목받습니다.'},
 {title:'역사를 다시 읽다',genres:['history','mystery','adventure'],reason:'역사와 발견을 다룬 이야기들이 문화계의 화제가 됩니다.'},
 {title:'새로운 장르의 발견',genres:GENRES.map(g=>g.id),reason:'예상 밖의 장르가 관객 커뮤니티에서 새로운 흐름을 만듭니다.'}
];
export function startMarketEvent(s){s.marketEvents??=[];if(s.marketEvents.some(e=>e.start===s.month))return null;const n=hash((s.relationSeed??s.seed)+':market:'+s.month),season=s.month%12;const moment=MOMENTS[season===0||season===6?0:n%MOMENTS.length],genre=moment.genres[Math.floor(n/7)%moment.genres.length],duration=2+Math.floor(n/97)%4;const event={id:'market-'+s.month,start:s.month,end:s.month+duration,genre,title:moment.title,reason:moment.reason,boost:15+Math.floor(n/997)%21};s.marketEvents.push(event);s.marketEvents=s.marketEvents.slice(-60);return event;}
export const currentMarketEvents=s=>(s.marketEvents??[]).filter(e=>e.start<=s.month&&s.month<e.end);
export function marketBoost(s,f,month=s.month){return Math.max(0,...(s.marketEvents??[]).filter(e=>e.start<=month&&month<e.end&&f.genres.includes(e.genre)).map(e=>e.boost));}
