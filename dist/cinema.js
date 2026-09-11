import {sourceInfo} from './source-rights.js';
/** Last Take 1.2: fictional reception, presentation formats and OTT offer model.
 * These are game-design assumptions, not forecasts or real platform quotes.
 */
import {STORY_DEVELOPMENTS} from './plot-seeds.js';
import {hash} from './career.js';
import {GENRE,SCALE} from './data.js';
import {runtimeOf} from './runtime.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const average=a=>a.reduce((n,v)=>n+v,0)/Math.max(1,a.length);
const unit=(f,key)=>{let n=hash(`${f.id}:${f.title}:${f.script?.id}:${key}`);n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);n^=n>>>16;return (n>>>0)/4294967296;};
const pick=(f,key,list)=>list[Math.floor(unit(f,key)*list.length)];
/** Rates below are documented gameplay coefficients, not vendor quotes. */
export const FORMAT_COST_MODEL='workload-v142';
export const FORMATS=[
 {id:'3d',name:'3D',rate:.22,setup:1.5,quality:2,genres:['sf','fantasy','animation','adventure'],description:'입체 영상 설계·변환·장면별 검수'},
 {id:'4d',name:'4D',rate:.015,setup:.25,quality:1.5,genres:['action','adventure','sf'],description:'모션·환경 효과 코딩과 동기화 검수'},
 {id:'imax',name:'IMAX',rate:.12,setup:1.2,quality:2.5,genres:['sf','action','adventure','history','fantasy'],description:'대형 화면 대응 촬영·리마스터링'},
 {id:'sound',name:'사운드 특화',rate:.02,setup:.2,quality:2,genres:['music','thriller','animation','mystery'],description:'공간 음향 설계·믹싱·납품 검수'}
];
export function normalizeFormats(d) {return FORMATS.filter(x=>(d.formats??[]).includes(x.id)).map(x=>x.id);}
export function formatProductionBase(d) {
 const genres=d.genres??[];
 return (SCALE[d.scale]?.base??0)*Math.max(1,...genres.map(g=>GENRE[g]?.cost??1))*(1+Math.max(0,genres.length-1)*.1);
}
export function formatWorkload(d,id) {
 const gs=d.genres??[],has=ids=>gs.some(g=>ids.includes(g));
 if(id==='3d')return has(['sf','fantasy','disaster'])?1.25:has(['action','adventure','war'])?1.15:1;
 if(id==='4d')return has(['action','adventure','sf','disaster','war','sports'])?1.3:1;
 if(id==='imax')return has(['sf','fantasy','action','adventure','history','disaster','war'])?1.15:1;
 if(id==='sound')return has(['music','musical'])?1.4:has(['thriller','horror','mystery','war'])?1.2:1;
 return 1;
}
/** The runtime is applied once, to variable technical work only. Fees/rights are excluded. */
export function formatCostBreakdown(d,productionBase=formatProductionBase(d),ids=normalizeFormats(d)) {
 const base=Number.isFinite(productionBase)?Math.max(0,productionBase):0;
 return FORMATS.filter(f=>ids.includes(f.id)).map(f=>{
  const duration=runtimeOf(d)/120,workload=formatWorkload(d,f.id);
  const variable=round(base*f.rate*duration*workload);
  return {id:f.id,name:f.name,setup:f.setup,rate:f.rate,productionBase:base,duration,workload,variable,cost:round(f.setup+variable)};
 });
}
export function formatEffect(d,productionBase=formatProductionBase(d)) {
 const selected=FORMATS.filter(x=>normalizeFormats(d).includes(x.id));
 const raw=selected.reduce((n,x)=>n+((d.genres??[]).some(g=>x.genres.includes(g))?x.quality:.4),0);
 const breakdown=formatCostBreakdown(d,productionBase);
 return {selected,breakdown,cost:round(breakdown.reduce((n,x)=>n+x.cost,0)),quality:round(Math.min(6,raw)),
   // Preserve the existing limited premium-seat share and past reception rules.
   ticketFactor:round(1+Math.min(.12,selected.length*.025))};
}
export const CRITICS=[
 {name:'스크린노트 · 한서경',focus:'서사',taste:['drama','history','mystery']},
 {name:'시네마 페이퍼 · 오유담',focus:'연출',taste:['thriller','sf','fantasy']},
 {name:'필름뷰 · 정해솔',focus:'연기',taste:['drama','romance','family']},
 {name:'프레임저널 · 신도겸',focus:'영상',taste:['adventure','animation','sf']},
 {name:'오프스크린 · 이가온',focus:'리듬',taste:['action','comedy','music']},
 {name:'장면과 문장 · 박시율',focus:'주제',taste:['history','family','drama']},
 {name:'라스트로우 · 문채원',focus:'장르',taste:['mystery','fantasy','thriller']}
];
const REVIEW_LINES={
 서사:{good:['인물의 작은 선택이 다음 사건으로 자연스럽게 이어진다.','복선을 설명으로 소모하지 않고 장면의 변화로 회수한다.','두 갈등을 끝까지 붙잡는 각본의 집중력이 돋보인다.','익숙한 출발점에서 인물만의 이유를 찾아낸다.','결말을 향한 단서가 대화와 행동 속에 고르게 놓인다.','사소한 약속이 후반부의 중요한 선택으로 돌아온다.'],mixed:['흥미로운 전제를 세웠지만 연결부의 설명이 길다.','초반의 질문에 비해 후반의 답은 다소 안전하다.','인물의 목표는 분명하지만 전환의 설득력이 고르지 않다.','주요 사건은 읽히지만 주변 인물의 동기는 얇다.','중간부의 반복이 마지막 선택의 무게를 덜어낸다.','갈등을 풀어내는 속도가 앞선 축적에 비해 빠르다.'],poor:['우연이 중요한 갈림길을 대신하며 인물의 선택을 약화한다.','설정 설명과 사건이 나란히 갈 뿐 서로를 밀어주지 못한다.','대사가 대신 설명하는 부분이 많아 이야기의 긴장이 흐려진다.','전개가 서둘러 접히면서 주요 인물의 변화가 충분히 남지 않는다.','갈등의 원인보다 해결 방식이 먼저 제시되어 몰입이 끊긴다.','서로 다른 에피소드를 잇는 중심 질문이 약하다.']},
 연출:{good:['말보다 시선과 거리를 활용한 연출이 오래 남는다.','장면을 끝내는 타이밍에 감독의 판단이 분명하다.','작은 몸짓까지 화면 안의 관계로 조직한다.','긴장을 쌓고 풀어내는 장면 배치가 정교하다.','감정을 과장하지 않는 거리감이 오히려 울림을 만든다.','비워 둔 순간이 인물의 다음 선택을 기다리게 한다.'],mixed:['강한 장면과 관성적인 연결 장면 사이의 온도차가 있다.','보여주려는 의도는 분명하나 강조가 겹치는 구간이 있다.','좋은 착상에 비해 전체를 묶는 시선은 흔들린다.','초반의 차분함을 끝까지 유지하지는 못한다.','몇 장면은 효과적이지만 감정의 방향을 미리 정해 버린다.','다양한 연출 기법이 하나의 관점으로 모이지는 않는다.'],poor:['장면마다 다른 강조가 이어져 작품의 중심을 잡기 어렵다.','인물의 감정이 쌓이기 전에 연출이 결론을 재촉한다.','핵심 순간을 지나치게 설명해 장면의 여백이 사라진다.','강한 효과가 인물 사이의 관계를 가린다.','반복되는 강조가 긴장을 만들기보다 소진한다.','누구의 시선을 따라가야 하는지 장면 사이에서 자주 흔들린다.']},
 연기:{good:['상대의 말을 듣는 순간에도 인물의 생각이 읽힌다.','주연과 조연의 호흡이 대사 밖의 관계를 만든다.','큰 감정과 미세한 반응 사이의 조절이 섬세하다.','인물의 변화가 설명보다 표정과 동작으로 전달된다.','서로 다른 연기 톤이 충돌하지 않고 장면을 채운다.','익숙한 배역에서도 작은 버릇으로 개성을 남긴다.'],mixed:['주연의 집중력에 비해 주변 배역의 활용은 아쉽다.','배우들의 좋은 순간이 있지만 연기 톤이 균일하지 않다.','감정이 큰 장면보다 일상의 짧은 대화가 더 설득력 있다.','배우의 매력이 각본의 빈 곳을 일부 메운다.','개별 장면은 살아 있지만 관계의 변화가 갑작스럽다.','장면의 요구와 배우의 표현 강도가 어긋나는 순간이 있다.'],poor:['배우가 보여줄 관계의 층위가 대사에 묻혀 버린다.','인물의 반응이 사건의 크기를 따라가지 못한다.','배역 사이의 정서적 연결이 충분히 드러나지 않는다.','감정의 전환이 급해 배우가 숨 쉴 공간이 부족하다.','서로 다른 연기 방향을 조율하지 못한 흔적이 보인다.','관계보다 대사 전달에 무게가 실려 인물이 평면적으로 남는다.']},
 영상:{good:['공간의 깊이와 색의 변화가 서사에 참여한다.','화면 구성이 인물의 고립과 연결을 또렷하게 드러낸다.','주요 이미지가 마지막 장면에서 다른 의미로 돌아온다.','시각적 효과를 이야기의 필요에 맞게 절제한다.','빛의 방향과 움직임이 장면의 정서를 일관되게 잇는다.','배경의 디테일이 세계에 실제로 머무는 감각을 준다.'],mixed:['인상적인 이미지가 있으나 장면마다 완성도가 다르다.','넓은 화면의 장점에 비해 인물의 배치가 단조롭다.','아름다운 배경이 이야기와 만나는 순간은 제한적이다.','색채와 질감은 매력적이지만 일부 장면이 과하게 꾸며졌다.','시각적 아이디어는 풍부하나 감정과의 연결은 약하다.','기술적 처리보다 구도의 선택에서 아쉬움이 남는다.'],poor:['효과의 밀도가 인물의 행동을 읽는 데 방해가 된다.','장면 전환의 시각적 연결이 고르지 않아 집중이 흐트러진다.','의도한 분위기에 비해 화면의 정보 배분이 어수선하다.','공간의 관계가 불명확해 중요한 장면을 따라가기 어렵다.','장식적인 이미지가 중심 사건과 따로 움직인다.','화면을 채우려는 선택이 여백의 힘을 지워 버린다.']},
 리듬:{good:['편집과 소리가 장면 사이의 호흡을 유연하게 연결한다.','느린 구간에서도 인물의 긴장이 이어진다.','핵심 장면까지 기다리게 만드는 리듬감이 있다.','빠른 장면과 고요한 장면의 대비가 효과적이다.','반복 모티프가 나올 때마다 새로운 정보가 더해진다.','소리의 여운을 이용한 전환이 감정을 다음 장면으로 넘긴다.'],mixed:['도입은 산뜻하지만 중반부에서 같은 호흡이 반복된다.','중요한 장면을 기다리는 시간이 다소 길다.','후반의 속도가 빨라지며 감정을 따라갈 틈이 줄어든다.','편집의 탄력은 있으나 몇 장면의 길이가 균형을 깨뜨린다.','음악이 감정을 이끄는 구간과 지나치게 설명하는 구간이 섞여 있다.','짧은 장면들은 좋지만 전체를 묶는 리듬이 평탄하다.'],poor:['서로 비슷한 기능의 장면이 이어져 전개가 정체된다.','급한 편집이 사건의 맥락을 충분히 전달하지 못한다.','음악의 반복이 장면의 감정 변화를 단순하게 만든다.','중요한 전환점과 연결 장면의 무게가 뒤바뀐다.','박자를 올릴수록 오히려 이야기를 따라가기 어려워진다.','침묵과 대사의 간격이 인물의 상태와 잘 맞지 않는다.']},
 주제:{good:['설명을 늘리기보다 인물의 선택으로 질문을 남긴다.','쉽게 답할 수 없는 문제를 끝까지 성급히 닫지 않는다.','개인의 이야기가 더 넓은 관계의 문제와 이어진다.','일상적인 순간에서 주제의 무게를 발견하게 한다.','다른 입장의 인물에게도 자기 논리를 허용한다.','결말 이후에도 인물이 치른 대가를 생각하게 한다.'],mixed:['전하려는 메시지는 선명하지만 질문의 폭은 좁다.','한쪽의 설명에 비해 다른 인물의 목소리가 부족하다.','주제를 직접 말하는 순간에 장면의 힘이 줄어든다.','문제 제기는 흥미롭지만 해결 과정은 익숙하다.','감정의 설득력과 메시지의 강조가 엇갈린다.','좋은 의도가 드러나지만 이야기 속에서 충분히 시험되지 않는다.'],poor:['인물을 이해하기보다 결론을 전달하는 데 급하다.','갈등의 복잡함이 단순한 대립으로 정리된다.','주제를 반복해 말하지만 새로운 관점을 더하지 못한다.','등장인물이 논점을 설명하는 역할에 머문다.','선택의 결과가 충분히 그려지지 않아 메시지가 가볍게 남는다.','관객에게 남길 질문을 작품이 먼저 지워 버린다.']},
 장르:{good:['장르의 약속을 지키면서도 예상 밖의 방향으로 나아간다.','익숙한 장치가 인물의 사정과 만나 새로운 긴장을 만든다.','장르적 쾌감과 이야기의 감정이 서로를 북돋운다.','관습을 깨뜨리는 순간에도 작품의 규칙은 유지된다.','재미를 위한 장면이 이후 갈등의 단서로 작동한다.','장르의 표면보다 그 안의 정서를 이해한 작품이다.'],mixed:['장르 팬에게 반가운 요소는 있으나 새로움은 제한적이다.','장르적 장치가 개별적으로는 좋지만 결합이 매끄럽지 않다.','기대했던 재미를 일부 채우지만 결정적 한 수는 부족하다.','장르를 섞는 시도가 장점과 어색함을 함께 만든다.','친숙함은 강점이지만 예상 가능한 전개가 많다.','설정의 가능성에 비해 장르적 밀어붙임이 약하다.'],poor:['관습을 반복하면서도 그 장면이 주는 재미를 살리지 못한다.','장르의 규칙이 필요에 따라 바뀌어 긴장이 무너진다.','서로 다른 장르의 장치가 인물의 목표를 흐린다.','기대감을 쌓는 장면에 비해 보상이 작다.','장르의 분위기는 있으나 핵심적인 쾌감에 도달하지 못한다.','익숙한 장면을 잇는 데 머물러 작품만의 방향이 약하다.']}
};
const CLOSINGS={good:['작품의 크기보다 선택의 정확성이 기억에 남는다.','다시 볼 때 주변 장면을 살펴볼 만하다.','완벽하지는 않아도 자기 언어를 가진 영화다.','특히 후반부의 절제가 앞선 장면을 다시 떠올리게 한다.','장점이 단점을 넘어서는 순간을 분명히 만든다.','호불호와 별개로 창작진의 의도는 또렷하다.'],mixed:['한두 장면의 매력이 전체의 아쉬움과 공존한다.','취향에 따라 장점과 단점의 무게가 달라질 작품이다.','다음 작품에서 더 단단해질 가능성을 남겼다.','좋은 재료를 한 번 더 다듬었다면 어땠을까.','기대치를 낮추면 발견할 부분도 있다.','단점이 있지만 끝까지 따라갈 동력은 남아 있다.'],poor:['좋은 전제만으로는 완성된 영화의 설득력을 대신하기 어렵다.','무엇을 덜어낼지 결정하는 과정이 더 필요해 보인다.','관객이 인물에게 다가갈 이유를 충분히 만들지 못했다.','핵심 장면의 효과를 다시 점검할 필요가 있다.','의도보다 결과의 일관성이 더 중요함을 보여준다.','도전의 의미와 작품의 성취를 분리해 보아야 한다.']};
function tier(score){return score>=75?'good':score>=52?'mixed':'poor';}
export function criticText(f,r,index=0) {
 const t=tier(r.base),focus=r.focus??CRITICS[index%CRITICS.length].focus;
 const lines=REVIEW_LINES[focus][t],a=pick(f,`review:${r.name}:a`,lines),b=pick(f,`review:${r.name}:b`,CLOSINGS[t]);
 const g=GENRE[f.genres[0]]?.name??'이야기';
 const angle=pick(f,`review:${r.name}:angle`,[
   `${g}의 익숙함을 어떻게 자기 것으로 만드는지에 초점을 맞췄다.`,
   `「${f.title}」의 강점과 약점은 ${focus}에서 특히 선명해진다.`,
   `화려한 설정의 유무보다 장면이 인물에게 어떤 변화를 남기는지를 보았다.`,
   `이 작품은 ${g} 관객이 기대하는 지점과 다른 지점에서 반응을 나눌 수 있다.`,
   `한 장면의 인상보다 처음과 끝의 연결을 기준으로 평가했다.`,
   `소재의 매력과 완성된 영화의 성취가 꼭 같지는 않다.`]);
 return `${a} ${angle} ${b}`;
}
export function makeCriticReviews(f) {
 // A strong internal production quality does not translate into a 90+ critic score.
 const centre=58+(f.quality-70)*.82+(unit(f,'critical-reading')-.5)*16;
 f.reviewModel=2;
 f.reviews=CRITICS.map((r,i)=>{
   const fit=f.genres.some(g=>r.taste.includes(g))?3:-2;
   const base=Math.round(clamp(centre+fit+(unit(f,`critic:${i}`)-.5)*22,12,94));
   const entry={name:r.name,focus:r.focus,base};entry.text=criticText(f,entry,i);return entry;
 });
 return f.reviews;
}
export function criticScore(f) {return f.reviews?.length?Math.round(average(f.reviews.map(r=>r.base))):null;}
const VIEWER_LINES={
 good:['기대했던 장르의 재미가 있어서 끝까지 집중해서 봤어요.','등장인물의 선택을 이해할 수 있어서 마지막이 더 좋았어요.','배우들끼리 주고받는 장면이 자연스러워 기억에 남아요.','앞부분의 작은 장면이 뒤에서 이어지는 점이 좋았어요.','화려함보다 이야기에 몰입하게 되는 순간이 많았어요.','중반 이후부터 시간을 거의 의식하지 않고 봤어요.','전개를 예상했는데도 표현 방식이 달라 재미있었어요.','음악과 장면이 잘 맞아서 여운이 남았어요.','자주 보는 장르인데도 새롭게 느껴지는 부분이 있었어요.','다 보고 나서 인물의 선택에 대해 이야기하게 됐어요.','좋아하는 장면을 다시 찾아보고 싶은 영화예요.','과한 설명 없이도 감정이 전달되어 좋았어요.'],
 mixed:['재미있게 본 장면도 있지만 중간에 조금 늘어진다고 느꼈어요.','배우는 좋았는데 인물이 왜 그렇게 행동하는지 궁금한 부분이 있어요.','소재는 마음에 들지만 결말이 조금 급하게 느껴졌어요.','기대가 컸던 만큼 아쉬운 부분도 있었어요.','처음보다 뒤쪽의 이야기가 더 흥미로웠어요.','장르 취향이 맞는 사람에게 더 잘 맞을 것 같아요.','영상은 기억에 남지만 이야기는 익숙했어요.','한 번 보기에는 괜찮았지만 다시 볼 정도는 아니었어요.','웃거나 긴장한 장면은 있는데 전체적으로 기복이 있었어요.','친구와 좋았던 부분이 달랐던 영화예요.','설정은 흥미로운데 주변 인물을 더 알고 싶었어요.','음악을 조금 덜 썼다면 감정이 더 잘 전해졌을 것 같아요.'],
 poor:['인물에게 공감하기 전에 사건이 넘어가서 따라가기 어려웠어요.','기대했던 재미와 실제 영화의 방향이 많이 달랐어요.','비슷한 장면이 이어져 집중이 자꾸 끊겼어요.','중요한 인물의 결정이 충분히 설명되지 않은 느낌이에요.','예고처럼 느껴질 만큼 큰 장면만 남고 이야기는 아쉬웠어요.','끝부분을 너무 서둘러 정리해서 여운이 적었어요.','배우의 장점을 더 살리는 장면이 있었으면 좋겠어요.','재료는 좋은데 하나의 이야기로 연결되지 않았어요.','중간부터 무엇을 기다려야 할지 잘 모르겠더라고요.','분위기보다 인물의 이야기가 더 필요했다고 느꼈어요.','새로운 시도는 보이지만 감정적으로는 멀게 느껴졌어요.','설명하는 대사가 많아 직접 발견할 재미가 줄었어요.']
};
const VIEWER_HANDLES=['주말한장면','조용한엔딩','오후의필름','목요일극장','크레딧끝까지','별빛상영관','다시재생','컷사이사이','이야기수집','필름산책','두번째관람','작은스크린','프레임찾기','잠깐의여운','오늘의좌석','느린장면'];
export function audienceAppeal(f) {
 const cast=f.leads.map(id=>f.castSnapshot?.[id]).filter(Boolean),skill=average(cast.map(p=>p.skill));
 const friendly=f.genres.some(g=>['comedy','family','animation','action'].includes(g))?4:0;
 return clamp(57+(f.quality-70)*.70+(skill-65)*.10+friendly+(unit(f,'audience-taste')-.5)*26,22,92);
}
export function ensureViewerReviews(f) {
 if(f.viewerReviews?.length)return f.viewerReviews;
 if(!(f.audience>0||f.status==='streaming'&&f.ott?.availableReviews))return [];
 const centre=audienceAppeal(f);
 f.viewerReviews=VIEWER_HANDLES.map((name,i)=>{
  const score=Math.round(clamp(centre+(unit(f,`viewer:${i}`)-.5)*30,5,98)),t=tier(score);
  const text=VIEWER_LINES[t][(Math.floor(unit(f,'viewer-lines')*12)+i)%12];
  const detail=pick(f,`viewer-detail:${i}`,[`특히 ${GENRE[f.genres[0]].name} 특유의 분위기에 주목했어요.`,`「${f.title}」를 보고 난 개인적인 감상이에요.`,`가장 기억에 남는 것은 배우들 사이의 짧은 대화였어요.`,`줄거리보다 장면의 흐름을 중요하게 보는 편이에요.`,`같이 본 사람과는 다른 감상이었어요.`,`평점보다 직접 느낀 인상을 적었어요.`,`처음의 기대와 비교해서 남긴 점수예요.`,`취향에 따라 다르게 볼 만한 작품이에요.`]);
  return {name,score,text:`${text} ${detail}`};
 });
 f.audienceScore=Math.round(average(f.viewerReviews.map(r=>r.score)));
 return f.viewerReviews;
}
export const viewerScore=f=>f.viewerReviews?.length?f.audienceScore:null;
const PLOT_ARCS={
 drama:['서로의 일상을 우연히 알게 된 인물들은 도움을 주려다 오랫동안 숨겨 둔 약속을 마주한다.','작은 오해가 쌓인 관계를 다시 이어 보려 하지만, 한 사람의 양보만으로는 이전으로 돌아갈 수 없다는 사실을 깨닫는다.','마지막에는 모든 문제가 해결되지는 않아도 각자가 감당할 선택을 말하고, 함께 다음 날을 준비한다.'],
 comedy:['일을 간단히 끝내려던 계획에 서로 다른 목적을 가진 사람들이 끼어들며 작은 거짓말이 뜻밖의 소동으로 커진다.','정체를 감추기 위해 만든 임시방편은 더 큰 오해를 부르고, 가장 엉뚱해 보였던 인물이 해결의 단서를 발견한다.','결국 주인공들은 체면보다 솔직함을 택한다. 완벽한 성공 대신 새로운 동료와 웃으며 기억할 경험을 얻는다.'],
 romance:['우연히 이어진 만남 속에서 두 사람은 같은 기억을 전혀 다르게 간직하고 있다는 사실을 알게 된다.','가까워질수록 각자의 오래된 계획과 서로에게 바라던 미래가 충돌하고, 두 사람은 잠시 거리를 두며 자기 선택을 돌아본다.','끝내 상대를 대신 결정하려 하지 않고 각자의 마음을 직접 전한다. 다시 마주한 익숙한 장소에서 관계의 다음 장면을 함께 선택한다.'],
 thriller:['평온해 보이던 상황에서 발견된 작은 불일치가 더 큰 문제의 단서가 된다. 주인공은 주변의 설명을 하나씩 대조한다.','도움을 준 인물의 목적까지 의심하게 되면서 조사 방향이 뒤집힌다. 시간은 줄어들고, 진실을 공개하는 일에는 자신이 지키던 것을 포기할 위험이 따른다.','결정적인 순간 주인공은 처음 지나쳤던 기록을 다시 확인한다. 감춰진 연결을 드러내고, 사건 뒤에 남은 책임을 피하지 않기로 한다.'],
 mystery:['사라진 기록과 서로 맞지 않는 증언을 따라가며, 주인공은 각각의 단서가 다른 사건처럼 보이게 배치되어 있음을 발견한다.','가장 믿었던 설명이 무너지자 인물들은 같은 날을 다른 위치에서 다시 재구성한다. 평범한 물건 하나가 증언 사이의 빈 시간을 연결한다.','처음부터 눈앞에 있었던 단서가 마지막 질문의 답이 된다. 수수께끼를 푼 뒤에도 인물들은 진실을 알리는 방식에 대해 마지막 선택을 내린다.'],
 action:['각자의 목적 때문에 같은 목표를 좇던 인물들은 뜻밖의 방해로 한 팀이 된다. 혼자서는 넘을 수 없는 장애물이 길을 가로막는다.','계획이 어긋나며 팀 내부의 불신이 커지고, 빠르게 도착하는 것보다 서로를 믿는 일이 더 어렵다는 사실이 드러난다.','마지막 작전에서는 각자가 가장 잘하는 일을 맡는다. 목표를 달성한 뒤 주인공은 처음의 명예보다 함께 돌아온 사람들을 더 소중히 여긴다.'],
 sf:['새로운 기술이 일상이 된 세계에서 발견된 예외 하나가 모두가 당연하게 받아들인 규칙을 흔든다.','주인공 일행은 시스템의 바깥으로 나가 기록을 추적하고, 편리함을 위해 지워졌던 선택의 흔적을 발견한다.','거대한 장치를 없애는 대신 그 사용을 결정할 권리를 사람들에게 돌려준다. 달라진 세계의 첫날은 작지만 자발적인 선택으로 시작된다.'],
 fantasy:['평범한 일상에서 벗어난 주인공은 낯선 세계의 규칙과 자신에게 주어진 약속을 알게 된다. 안내자와의 여정에서 작은 도움들이 서로 연결된다.','목적지에 다가갈수록 바라고 있던 기적에도 대가가 있다는 사실이 드러난다. 주인공은 정해진 예언과 동료를 위한 선택 사이에서 갈등한다.','마지막 문 앞에서 주인공은 특별한 힘보다 함께 배운 것을 믿는다. 새로운 길을 열고 돌아온 뒤 일상의 작은 장면을 전과 다르게 바라본다.'],
 adventure:['흩어진 단서를 모으기 위해 서로 다른 경험을 가진 동료들이 길을 떠난다. 첫 목적지는 다음 장소를 가리키는 질문을 남긴다.','예상하지 못한 우회로에서 일행은 추적하던 목표가 누군가의 기억과 연결되어 있음을 알게 된다. 목적을 두고 의견이 갈리지만 서로의 사정을 듣는다.','여정의 끝에서 눈앞의 보상보다 발견을 지키는 일을 택한다. 돌아오는 길, 일행은 출발할 때와 다른 의미로 처음의 지도를 펼친다.'],
 family:['함께 있으면서도 서로의 일상을 몰랐던 사람들이 뜻밖의 일을 계기로 같은 문제를 해결해야 한다.','각자가 기억하는 지난날의 모습이 달라 다툼이 생기지만, 오래된 약속을 따라가며 말하지 못했던 사정을 하나씩 듣게 된다.','큰 변화 대신 작은 일을 함께 하기로 약속한다. 마지막에는 전과 같은 풍경 속에서도 서로를 기다리는 방식이 달라져 있다.'],
 animation:['작은 세계를 벗어난 주인공은 자신과 다른 방식으로 살아가는 친구들을 만난다. 서툰 첫 시도는 오히려 새로운 길의 단서가 된다.','각자의 장점만으로 해결하려던 계획이 어긋나고, 가장 약점이라 여겼던 특징이 동료들에게 도움이 된다는 사실을 깨닫는다.','마지막 도전에서 모두의 작은 역할이 하나로 이어진다. 돌아온 주인공은 누군가의 새로운 출발을 응원하며 자신의 세계를 조금 더 넓힌다.'],
 music:['하나의 무대를 준비하게 된 인물들은 실력도 취향도 달라 처음부터 호흡이 맞지 않는다. 연습 과정에서 각자가 음악을 시작한 이유가 드러난다.','중요한 기회를 앞두고 팀의 방향이 갈리며 연습이 멈춘다. 흩어졌던 인물들은 화려한 성공이 아닌 자신들만의 소리를 찾기 위해 다시 만난다.','최종 무대는 계획과 다르게 시작되지만 서로의 호흡을 듣는 순간 하나의 연주가 된다. 공연이 끝난 뒤에도 각자의 일상에 그 리듬이 남는다.'],
 history:['급격히 변하는 시대 속에서 서로 다른 위치에 선 인물들이 같은 사건을 마주한다. 작은 기록 하나가 드러나지 않았던 관계를 연결한다.','개인의 약속과 공동체의 요구가 충돌하면서 누구도 모든 것을 지킬 수 없는 선택을 해야 한다. 서로 대립했던 인물의 사정도 서서히 드러난다.','중요한 결정을 내린 뒤 인물들은 각자의 자리에서 결과를 감당한다. 세월이 흐른 후 남겨진 기록이 처음과 다른 의미로 읽히며 이야기가 마무리된다.']
};
export function ensurePlot(f) {
 if(f.plot||['production','reshoot'].includes(f.status))return f.plot??'';
 if(f.script.license){const ip=sourceInfo(f.script.license);if(ip.plot){f.plot=ip.plot;f.plotGenerated=true;return f.plot;}}
 const arcs=STORY_DEVELOPMENTS[f.script.original]??STORY_DEVELOPMENTS[f.script.title]??PLOT_ARCS[f.genres[0]]??PLOT_ARCS.drama;
 f.plot=[f.script.synopsis,...arcs].join('\n\n');f.plotGenerated=true;
 return f.plot;
}
export const OTT_PLATFORMS=[
 {id:'nemoflix',name:'네모플릭스',wordmark:'NEMOFLIX',mark:'N',color:'#ef5263',shape:'tiles',genres:['thriller','sf','mystery'],multiplier:1.13,tag:'장르물 · 글로벌 이야기'},
 {id:'dizring',name:'디즈링+',wordmark:'DIZRING+',mark:'D+',color:'#83b8ff',shape:'orbit',genres:['family','animation','fantasy'],multiplier:1.02,tag:'가족 · 상상력'},
 {id:'wavelet',name:'웨이브릿',wordmark:'WAVELET',mark:'w',color:'#7cb6de',shape:'waves',genres:['drama','history','romance'],multiplier:.94,tag:'드라마 · 정서'},
 {id:'tivring',name:'티브링',wordmark:'TIVRING',mark:'T',color:'#ff859e',shape:'screen',genres:['comedy','music','romance'],multiplier:.98,tag:'친근함 · 대중성'},
 {id:'cushion',name:'쿠션플레이',wordmark:'CUSHION PLAY',mark:'C',color:'#75ccb8',shape:'cushion',genres:['action','adventure','comedy'],multiplier:1.06,tag:'활동적인 이야기 · 오락'}
];
export function ottOffers(f) {
 const appeal=audienceAppeal(f),base=(f.budget*.48+({small:3,medium:8,large:15}[f.scale]??3));
 return OTT_PLATFORMS.map(p=>{
  const match=f.genres.filter(g=>p.genres.includes(g)).length,variation=.85+unit(f,`ott:${p.id}`)*.26;
  const amount=round(base*p.multiplier*(.68+f.quality/155)*(1+match*.10)*(1+(appeal-60)/240)*variation);
  const royalty=round(amount*(f.script.license?.share??0));
  return {platform:p.id,amount,royalty,net:round(amount-royalty),match,reason:match?`선호 장르 ${f.genres.filter(g=>p.genres.includes(g)).map(g=>GENRE[g].name).join('·')} 반영`:'일반 편성 제안'};
 });
}
export function initCinema(s) {
 for(const c of s.companies)c.totalOttReceipts??=0;
 for(const f of s.films){
  f.formats=normalizeFormats(f);
  f.distribution??=(f.releaseMonth!=null?'theatrical':null);
  if(f.reviews.length){
   if(f.reviewModel==null){
    if(f.releaseMonth==null&&f.status!=='streaming')makeCriticReviews(f);
    else{f.reviewModel='legacy';f.reviews=f.reviews.map((r,i)=>({...r,focus:r.focus??CRITICS[i%CRITICS.length].focus,text:r.text??criticText(f,r,i)}));}
   }
   ensurePlot(f);ensureViewerReviews(f);
  }
 }
}
/** Demand is conservative; a rare breakout is deterministic and cannot be rerolled. */
export function openingDemand(f,{competition=1,trend=1,stars=50,reach=1,franchise=1}={}) {
 const appeal=audienceAppeal(f),critical=criticScore(f)??50;
 const chance=unit(f,'breakout'),luck=chance>.985&&appeal>=72?3.1:.55+unit(f,'market-fit')*.9;
 const scale=20000+260000*Math.pow(appeal/100,2.3)*reach*(.42+stars/120);
 return Math.round(scale*(.90+critical/500)*(1+Math.min(f.awareness,80)/180)*competition*trend*luck*franchise);
}
export function weeklyRetention(f) {
 // High public approval can create a slow burn; most films drop materially each week.
 const appeal=audienceAppeal(f),rare=unit(f,'word-of-mouth')>.96&&appeal>=75;
 return clamp(.42+appeal*.0038+(rare?.075:0),.48,.86);
}
export function calibratedGain(quality,gain) {return gain<=0?gain:round(gain*clamp((102-quality)/37,.24,1));}
