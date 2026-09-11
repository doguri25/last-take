import {weekOf,notify} from './clock.js';
import {offerPeriod,offerWeeksLeft} from './license-offers.js';
export const WEEKLY_EVENTS = [
  {
    "id": "week-0",
    "stage": "prep",
    "title": "첫 리딩의 발견",
    "text": "배우들이 대본을 함께 읽으며 인물의 말투를 다듬었습니다.",
    "quality": 0.3,
    "publicity": 0
  },
  {
    "id": "week-1",
    "stage": "prep",
    "title": "미술팀의 작은 모형",
    "text": "축소 모형으로 세트의 동선을 미리 점검했습니다.",
    "quality": 0.25,
    "publicity": 0
  },
  {
    "id": "week-2",
    "stage": "prep",
    "title": "로케이션 답사",
    "text": "배경과 잘 어울리는 촬영 장소 후보를 확인했습니다.",
    "quality": 0.2,
    "publicity": 0
  },
  {
    "id": "week-3",
    "stage": "prep",
    "title": "대본의 빈칸",
    "text": "인물의 동기를 설명하는 짧은 장면을 보완했습니다.",
    "quality": 0.3,
    "publicity": 0
  },
  {
    "id": "week-4",
    "stage": "prep",
    "title": "의상 색상 테스트",
    "text": "카메라 테스트에서 의상과 배경의 색이 겹쳐 다시 조율했습니다.",
    "quality": -0.15,
    "publicity": 0
  },
  {
    "id": "week-5",
    "stage": "prep",
    "title": "첫 제작 노트",
    "text": "제작 과정의 짧은 소개를 공개해 관심을 모았습니다.",
    "quality": 0,
    "publicity": 0.4
  },
  {
    "id": "week-6",
    "stage": "prep",
    "title": "장면별 준비표",
    "text": "촬영 순서를 점검해 부서 간 준비가 매끄러워졌습니다.",
    "quality": 0.2,
    "publicity": 0
  },
  {
    "id": "week-7",
    "stage": "prep",
    "title": "배경 자료 도착",
    "text": "자문가의 자료를 받고 일부 설정의 표현을 다듬었습니다.",
    "quality": 0.25,
    "publicity": 0
  },
  {
    "id": "week-8",
    "stage": "shoot",
    "title": "장면의 새로운 호흡",
    "text": "리허설에서 자연스러운 호흡을 발견했습니다.",
    "quality": 0.3,
    "publicity": 0
  },
  {
    "id": "week-9",
    "stage": "shoot",
    "title": "흐린 날의 조명",
    "text": "바뀐 날씨에 맞춰 조명을 조정했습니다.",
    "quality": -0.2,
    "publicity": 0
  },
  {
    "id": "week-10",
    "stage": "shoot",
    "title": "대사의 작은 변화",
    "text": "즉흥적인 한마디가 장면의 감정을 살렸습니다.",
    "quality": 0.35,
    "publicity": 0
  },
  {
    "id": "week-11",
    "stage": "shoot",
    "title": "안전 점검 완료",
    "text": "점검을 마치고 계획한 실내 장면을 촬영했습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-12",
    "stage": "shoot",
    "title": "동선 다시 맞추기",
    "text": "복잡한 동선을 다시 연습하며 집중도를 되찾았습니다.",
    "quality": 0.2,
    "publicity": 0
  },
  {
    "id": "week-13",
    "stage": "shoot",
    "title": "소품의 연속성",
    "text": "장면 사이 소품 위치 차이를 찾아 보완했습니다.",
    "quality": 0.15,
    "publicity": 0
  },
  {
    "id": "week-14",
    "stage": "shoot",
    "title": "현장 스틸 공개",
    "text": "분위기를 담은 스틸 사진에 작은 관심이 모였습니다.",
    "quality": 0,
    "publicity": 0.6
  },
  {
    "id": "week-15",
    "stage": "shoot",
    "title": "촬영팀의 단체 인터뷰",
    "text": "서로의 작업을 소개하는 짧은 인터뷰가 공유되었습니다.",
    "quality": 0,
    "publicity": 0.5
  },
  {
    "id": "week-16",
    "stage": "shoot",
    "title": "배경 소음 점검",
    "text": "외부 소음 때문에 일부 대사를 후반작업 목록에 넣었습니다.",
    "quality": -0.2,
    "publicity": 0
  },
  {
    "id": "week-17",
    "stage": "shoot",
    "title": "좋은 테이크",
    "text": "여러 부서의 호흡이 맞아 중요한 장면을 안정적으로 마쳤습니다.",
    "quality": 0.4,
    "publicity": 0
  },
  {
    "id": "week-18",
    "stage": "shoot",
    "title": "빛의 연결",
    "text": "앞 장면과 빛의 방향이 달라 촬영 구도를 보완했습니다.",
    "quality": -0.15,
    "publicity": 0
  },
  {
    "id": "week-19",
    "stage": "shoot",
    "title": "예고편 소재 확보",
    "text": "작품의 분위기를 보여 줄 짧은 장면을 확보했습니다.",
    "quality": 0,
    "publicity": 0.3
  },
  {
    "id": "week-20",
    "stage": "post",
    "title": "편집 리듬 점검",
    "text": "장면 사이의 간격을 다듬어 이야기의 흐름을 살렸습니다.",
    "quality": 0.35,
    "publicity": 0
  },
  {
    "id": "week-21",
    "stage": "post",
    "title": "테스트 상영의 의견",
    "text": "제작진 시사에서 초반 전개가 어렵다는 의견이 나왔습니다.",
    "quality": -0.25,
    "publicity": 0
  },
  {
    "id": "week-22",
    "stage": "post",
    "title": "소리의 공간감",
    "text": "배경음을 정리해 대사의 전달이 선명해졌습니다.",
    "quality": 0.3,
    "publicity": 0
  },
  {
    "id": "week-23",
    "stage": "post",
    "title": "색보정 테스트",
    "text": "시간대별 색감을 통일했습니다.",
    "quality": 0.25,
    "publicity": 0
  },
  {
    "id": "week-24",
    "stage": "post",
    "title": "자막 교정",
    "text": "작품 속 표기와 엔딩 크레딧을 검수했습니다.",
    "quality": 0.1,
    "publicity": 0
  },
  {
    "id": "week-25",
    "stage": "post",
    "title": "완성에 가까운 음악",
    "text": "장면과 잘 맞는 음악 구성을 찾아냈습니다.",
    "quality": 0.3,
    "publicity": 0
  },
  {
    "id": "week-26",
    "stage": "post",
    "title": "예고편의 온도",
    "text": "첫 편집 예고편에 기대와 다른 반응이 함께 나왔습니다.",
    "quality": 0,
    "publicity": -0.3
  },
  {
    "id": "week-27",
    "stage": "post",
    "title": "상영본 검수",
    "text": "기술 점검 중 발견한 작은 오류를 최종 수정 목록에 넣었습니다.",
    "quality": -0.15,
    "publicity": 0
  },
  {
    "id": "week-28",
    "stage": "idle",
    "title": "다음 이야기를 기다리며",
    "text": "작가들이 새 이야기를 준비하고 있습니다. 시나리오 제안에서 다음 작품을 살펴보세요.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-29",
    "stage": "idle",
    "title": "새로운 장르의 대화",
    "text": "제작진 모임에서 익숙하지 않은 장르에 관한 아이디어가 오갔습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-30",
    "stage": "idle",
    "title": "원작 시장의 소식",
    "text": "서로 다른 매체의 이야기가 영화화 제안을 기다립니다. 현재 원작 제안 두 편을 확인하세요.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-31",
    "stage": "idle",
    "title": "영화인의 연습 시간",
    "text": "촬영하지 않는 기간에도 인물들은 연습과 휴식으로 다음 작품을 준비합니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-32",
    "stage": "general",
    "title": "독립극장의 기획전",
    "text": "동네 극장의 장르 기획전이 영화 팬들 사이에서 이야깃거리가 되었습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-33",
    "stage": "general",
    "title": "관객 모임의 추천",
    "text": "영화 동호회가 새로운 제작사의 작품을 소개하는 시간을 마련했습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-34",
    "stage": "general",
    "title": "제작진의 자료 교환",
    "text": "여러 팀이 촬영 경험과 참고 자료를 서로 나누었습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-35",
    "stage": "general",
    "title": "작은 영화제의 초대",
    "text": "지역 영화제의 소식이 도착했습니다. 다음 작품의 방향을 생각해 볼 기회입니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-36",
    "stage": "general",
    "title": "극장 로비의 대화",
    "text": "이번 주 개봉작을 두고 관객들이 서로 다른 감상을 나누었습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-37",
    "stage": "general",
    "title": "주말 문화 기사",
    "text": "문화면에서 다양한 영화를 만드는 제작사의 시도를 조명했습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-38",
    "stage": "general",
    "title": "관객 취향의 발견",
    "text": "장르 취향 조사에서 예상과 다른 조합에 대한 관심이 나타났습니다.",
    "quality": 0,
    "publicity": 0
  },
  {
    "id": "week-39",
    "stage": "general",
    "title": "제작 기술 세미나",
    "text": "새로운 제작 방법을 소개하는 세미나 자료가 업계에 공유되었습니다.",
    "quality": 0,
    "publicity": 0
  }
];

const hash=x=>{let n=2166136261;for(const c of String(x)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round(n*100)/100;
export function productionStage(f){
 if(f.status==='reshoot')return (f.reshootElapsedWeeks??0)<32?'shoot':'post';
 const ratio=(f.elapsedWeeks??f.elapsed*4)/(f.months*4);
 return ratio<.25?'prep':ratio<.75?'shoot':'post';
}
export function progressSummary(s){
 const films=s.films.filter(f=>f.company==='c0'),active=films.filter(f=>['production','reshoot'].includes(f.status));
 if(!active.length){const ready=films.filter(f=>['ready','shelved'].includes(f.status)).length,showing=films.filter(f=>f.status==='showing').length;return `촬영 중인 작품 없음 · 개봉 대기/보관 ${ready}편 · 극장 상영 ${showing}편. 시나리오를 골라 다음 영화를 준비하세요.`;}
 return active.map(f=>{const total=f.status==='reshoot'?48:f.months*4,done=f.status==='reshoot'?f.reshootElapsedWeeks:f.elapsedWeeks;return `「${f.title}」 ${{prep:'촬영 준비',shoot:'촬영',post:'후반작업'}[productionStage(f)]} ${Math.min(100,Math.round(done/total*100))}% · ${f.pending!=null?'현장 결정 대기':f.staffVacancy?.length?'제작진 충원 대기':`완료까지 ${Math.max(0,total-done)}주 예정`}`;}).join('\n');
}
export function weeklyExperience(s,{force}={}){
 const week=weekOf(s);if(s.weeklyExperienceWeek===week)return null;
 s.weeklyExperienceWeek=week;s.weeklyExperienceSeed??=s.relationSeed??s.seed;
 const roll=hash(`${s.weeklyExperienceSeed}:${week}:weekly`);
 const film=s.films.filter(f=>f.company==='c0'&&['production','reshoot'].includes(f.status)&&f.pending==null&&!f.staffVacancy?.length);
 const target=film.length?film[roll%film.length]:null;
 const stage=target?productionStage(target):'idle';
 const recent=new Set((s.weeklyExperienceHistory??[]).slice(-10).map(x=>x.event));
 const eligible=WEEKLY_EVENTS.filter(e=>(e.stage===stage||e.stage==='general')&&!recent.has(e.id));
 const major=s.notifications.some(n=>n.week===week&&['complete','career','record','event'].includes(n.type));
 let item;
 if(force!=='progress'&&(force==='event'||(!major&&roll%100<68))&&eligible.length){
  const event=eligible[Math.floor(roll/100)%eligible.length];let effect='';
  if(target){
   const q0=target.weeklyQuality??0,q=clamp(round(q0+event.quality),-3,3)-q0;
   const v0=target.weeklyPublicity??0,v=clamp(round(v0+event.publicity),-4,6)-v0;
   target.weeklyQuality=round(q0+q);target.weeklyPublicity=round(v0+v);
   target.quality=round(clamp(target.quality+q,20,99));target.publicity=round(clamp((target.publicity??0)+v,0,100));
   if(q||v)effect=` (${q?'품질 '+(q>0?'+':'')+round(q):''}${q&&v?' · ':''}${v?'홍보 인지도 '+(v>0?'+':'')+round(v):''})`;
  }
  item=notify(s,{key:`weekly-experience:${week}`,type:'weekly-event',filmId:target?.id,action:target?'film':null,title:event.title,text:(target?`「${target.title}」 `:'')+event.text+effect,eventId:event.id});
  s.weeklyExperienceHistory=[...(s.weeklyExperienceHistory??[]),{week,event:event.id,filmId:target?.id??null}].slice(-64);
 }else item=notify(s,{key:`weekly-experience:${week}`,type:'weekly-progress',filmId:target?.id,action:target?'film':null,title:'이번 주 제작 진행 요약',text:progressSummary(s)});
 if(week%4===0)notify(s,{key:`rights-window:${offerPeriod(s)}`,type:'rights',action:'licenses',title:'새 원작 제안 두 편 도착',text:`원작 라이선스 제안이 교체되었습니다. 이번 제안은 ${offerWeeksLeft(s)}주 동안 확인할 수 있습니다.`});
 return item;
}
