import {GENRES} from './data.js';
const hash=text=>{let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
export const APP_VERSION='1.0.2';
export const RELEASE_DATE='2026-09-11';
export const VERSION_HISTORY=[
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
export function recordWrap(s,f){initTimeline(s,f);const cycle=f.productionCycles.at(-1),elapsed=f.status==='reshoot'?f.reshootElapsed:f.elapsed,threshold=f.status==='reshoot'?10:Math.ceil(f.months*.8);if(cycle.crankUp==null&&elapsed>=threshold&&f.pending==null){cycle.crankUp=s.month;return true;}return false;}
export function finishTimeline(s,f){initTimeline(s,f);const cycle=f.productionCycles.at(-1);cycle.crankUp??=s.month;cycle.completed=s.month;f.productionCompletedMonth=s.month;}
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
