import * as K from './economy.js';
import * as B from './studio-growth.js';
export {filmProfit} from './studio-growth.js';
import {initAbilities,advanceAbilities} from './abilities.js';
import {weeklyExperience} from './weekly-experience.js';
import * as RT from './runtime.js';
import * as T from './taxes.js';
import {adjust,affinity} from './relationships.js';
import * as C from './cinema.js';
import {initFinanceHistory,recordFinance} from './finance-history.js';
import {weekOf, weekDate, recordDate, initClock, initFilmClock, notify, releaseWaitWeeks} from './clock.js';
export {weekOf, weekDate, recordDate, notify, releaseWaitWeeks} from './clock.js';
import {negotiationReport, validateNegotiations} from './casting.js';
import {initTimeline,recordWrap,finishTimeline,startMarketEvent,marketBoost} from './release.js';
import {initRelations,productionBonds,teamAffinity,normalizeSubgenres,subgenreEffect,SUBGENRES} from './relationships.js';
import {initFilm,specialEvent,socialNews,trait,resolvePromotions,scanPromotionAvailability} from './expansion.js';
import {person,people,initializeRoster,available,eligible,career,credits,teamCompatibility,contractQuote,historyEffect,cycleYear,finishRetirements,invalidateCareer} from './career.js';
export {person,people,ageGroup,available,eligible,career,credits,pairCompatibility,teamCompatibility,contractQuote} from './career.js';
import {VERSION,GENRES,GENRE,SCALE,STUDIOS,STORIES,EVENTS,SYNERGIES} from './data.js';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export const date=m=>`${2026+Math.floor(m/12)}년 ${m%12+1}월`;
export const money=n=>`${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(n)}억`;
export const viewers=n=>n>=10000?`${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(n/10000)}만`:new Intl.NumberFormat('ko-KR').format(n);
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function pick(s,a){return a[Math.floor(random(s)*a.length)];}
const mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
export const player=s=>s.companies[0];
export const active=s=>s.films.filter(f=>['production','reshoot'].includes(f.status));
export const productionSlots=(s,company='c0')=>s.films.filter(f=>f.company===company&&(['production','reshoot'].includes(f.status)||(f.screening?.status==='editing'&&f.screening.decision?.id==='reshoot')));
export const myFilms=s=>s.films.filter(f=>f.company==='c0');
export const pendingEvents=s=>s.films.filter(f=>f.company==='c0'&&f.pending!=null);
export const crewIds=f=>[f.script.writer,f.director,...f.leads,...f.supports];
export const busyFilm=(s,id,except)=>active(s).find(f=>f.id!==except&&[...crewIds(f),...(f.cameos??[])].includes(id))??B.screeningCrewBusy(s,id,except);
export function genreFit(p,genres){if(!genres.length)return 0;return Math.round(mean(genres.map(g=>p.genres.includes(g)?94:48)));}
export function genreBonus(genres){if(genres.length===1)return 2;let n=0;for(let i=0;i<genres.length;i++)for(let j=i+1;j<genres.length;j++)n+=SYNERGIES[[genres[i],genres[j]].sort().join('|')]??-1;return clamp(n,-10,10);}
export function qualityEstimate(d,s){
  const cast=[d.director,...d.leads,...d.supports].map(id=>person(s,id)).filter(Boolean);
  if(cast.length!==7||!d.genres.length)return null;
  const talent=d.script.quality*.22+person(s,d.director).skill*.28+mean(cast.slice(1).map(p=>p.skill))*.3+mean(cast.map(p=>genreFit(p,d.genres)))*.2;
  return Math.round(clamp(talent*.85+subgenreEffect(d)+(teamAffinity(s,crewIds(d))-50)/15+(cast.filter(p=>trait(p)==='연기파').length*.4)+7+C.formatEffect(d).quality+RT.runtimeQuality(d)+SCALE[d.scale].quality+genreBonus(d.genres)+(mean(cast.map(p=>p.coop))-70)/12+(s?(teamCompatibility(s,crewIds(d))-50)/12+historyEffect(s,crewIds(d)):0),30,94));
}
export function estimate(d,s){
  const scale=SCALE[d.scale];
  const mult=Math.max(1,...d.genres.map(g=>GENRE[g].cost))*(1+(d.genres.length-1)*.1);
  const sizeFactor={small:.75,medium:1,large:1.35}[d.scale];
  const crew=[d.director,...d.leads,...d.supports].map(id=>person(s,id)).filter(Boolean);
  const ids=crewIds(d).filter(Boolean);const set=round((d.script.license?.fee??0)+scale.base*mult*RT.runtimeCostFactor(d)+(d.script.sequelOf?scale.base*.06:0)),writer=round(d.script.fee*(s?(contractQuote(s,person(s,d.script.writer),ids,d.company??'c0').chemistryFactor*contractQuote(s,person(s,d.script.writer),ids,d.company??'c0').relationshipFactor):1)),cast=round(crew.reduce((n,p)=>n+(s?contractQuote(s,p,ids,d.company??'c0').fee:p.fee),0)*sizeFactor);
  const presentation=C.formatEffect(d,scale.base*mult);
  const negotiation=d.requireNegotiation&&s?round(negotiationReport(s,d).filter(r=>r.status==='counter').reduce((n,r)=>n+r.extra,0)):0;
  return B.adjustEstimate(s,d,{set,writer,runtime:RT.runtimeOf(d),runtimeQuality:RT.runtimeQuality(d),runtimeAdjustment:round(scale.base*mult*(RT.runtimeCostFactor(d)-1)),cast:round(cast+negotiation),negotiation,formats:presentation.cost,formatBreakdown:presentation.breakdown,formatQuality:presentation.quality,total:round(set+writer+cast+negotiation+presentation.cost),reserve:round((set+writer+cast+negotiation+presentation.cost)*.16),months:scale.months,quality:qualityEstimate(d,s)});
}
function log(s,title,text,kind='news',filmId){s.messages.unshift({id:++s.messageCounter,month:s.month,week:weekOf(s),title,text,kind,filmId});s.messages=s.messages.slice(0,100);}
function transaction(s,c,amount,description,kind='expense',filmId,metadata={}){
  amount=round(amount);c.cash=round(c.cash+amount);
  if(c.id==='c0'){s.ledger.unshift({id:++s.ledgerCounter,month:s.month,week:weekOf(s),amount,description,kind,filmId,...metadata});recordFinance(s,description);}
}
export function createPitch(s,writerId,genre){
  const writer=writerId?person(s,writerId):pick(s,people(s).filter(p=>p.role==='writer'&&available(s,p)&&!busyFilm(s,p.id)));
  if(!writer||writer.role!=='writer'||!available(s,writer))throw Error('시나리오를 의뢰할 작가를 선택해 주세요.');
  const g=genre??pick(s,writer.genres);const story=pick(s,STORIES[g]);
  const n=++s.pitchCounter;const duplicates=s.films.filter(f=>f.script.original===story[0]).length;
  const quality=Math.round(clamp(writer.skill*.74+17+random(s)*10,40,96));
  return{id:`s${n}`,writer:writer.id,title:duplicates?`${story[0]}: ${['또 다른 시작','새로운 장면','그다음 이야기','돌아온 계절'][duplicates%4]} ${duplicates+1}`:story[0],original:story[0],synopsis:story[1],genre:g,quality,fee:round(contractQuote(s,writer).fee*(1+quality/130)),month:s.month};
}
export const PITCH_REFRESH_COST = .5;
export function refreshPitches(s, { initial = false } = {}) {
  // Initial setup is free; every subsequent refresh is a paid, atomic replacement.
  const first = initial && s.pitchCounter === 0 && s.pitches.length === 0;
  if (!first && player(s).cash < PITCH_REFRESH_COST) throw Error('새 제안 수신 비용 0.5억 원이 부족합니다.');
  const writers = people(s).filter(p => p.role === 'writer' && available(s, p) && !busyFilm(s, p.id));
  if (writers.length < 6) throw Error('제안을 보낼 수 있는 작가가 부족합니다.');
  const old = new Set(s.pitches.map(p => p.original));
  const next = [];
  // Use different available writers, and favor stories not in the current inbox.
  for (let i = 0; i < 6; i++) {
    const ix = Math.floor(random(s) * writers.length), writer = writers.splice(ix, 1)[0];
    let pitch; for (let tries = 0; tries < 16; tries++) {
      pitch = createPitch(s, writer.id);
      if (!old.has(pitch.original) && !next.some(x => x.original === pitch.original)) break;
    }
    next.push(pitch);
  }
  if (!first) transaction(s, player(s), -PITCH_REFRESH_COST, '시나리오 새 제안 6편 수신', 'script');
  s.pitches = next; s.lastPitchRefresh = s.month; s.lastPitchRefreshWeek = weekOf(s);
  if (!first) {log(s, '새 시나리오 6편 도착', '이전 제안을 교체했습니다. 수신 비용 0.5억 원을 집행했습니다.', 'script');s.messages[0].pitchIds=next.map(p=>p.id);}
  return next;
}
export function requestPitch(s,id){
  const p=person(s,id);if(!p||p.role!=='writer')throw Error('작가를 선택해 주세요.');
  if(!available(s,p)||busyFilm(s,id))throw Error('지금 계약할 수 없는 작가입니다.');
  const previous=s.pitches.find(x=>x.writer===id&&x.month===s.month);
  if(previous)return previous;
  const pitch=createPitch(s,id);s.pitches=[pitch,...s.pitches].slice(0,12);
  log(s,`${p.name} 작가의 새 제안`,`「${pitch.title}」 시놉시스가 도착했습니다.`,'script');Object.assign(s.messages[0],{pitchId:pitch.id,personId:p.id});return pitch;
}
export function recommend(s,d){
  const selected=[d.script.writer];
  const choose=(role,gender)=>{
    let pool=people(s).filter(p=>p.role===role&&(!gender||p.gender===gender)&&eligible(s,p,d.genres)&&!busyFilm(s,p.id)&&!selected.includes(p.id));
    pool=pool.map(p=>({p,score:p.skill*.52+genreFit(p,d.genres)*.4+p.coop*.12-contractQuote(s,p,selected,d.company??'c0').fee*8+teamCompatibility(s,[...selected,p.id])*.08})).sort((a,b)=>b.score-a.score).map(x=>x.p);
    const p=pool[0];if(!p)throw Error('섭외 가능한 인물이 없습니다.');selected.push(p.id);return p.id;
  };
  return{...d,subgenres:normalizeSubgenres(d),director:choose('director'),leads:[choose('lead','M'),choose('lead','F')],supports:[choose('support','M'),choose('support','F'),choose('support','M'),choose('support','F')]};
}
function validateDraft(s,d,c){
  if(productionSlots(s,c.id).length>=3)throw Error('동시에 제작할 수 있는 영화는 3편입니다.');
  if(!d.script||person(s,d.script.writer)?.role!=='writer')throw Error('작가의 시나리오를 먼저 선택해 주세요.');
  if(!Array.isArray(d.genres)||d.genres.length<1||d.genres.length>3||new Set(d.genres).size!==d.genres.length||d.genres.some(g=>!GENRE[g]))throw Error('장르를 1~3개 선택해 주세요.');
  if(d.runtime!=null&&!RT.RUNTIMES.includes(d.runtime))throw Error('러닝타임은 90·120·150·180분 중 선택해 주세요.');
  if(!SCALE[d.scale])throw Error('제작 규모를 선택해 주세요.');
  if(d.formats&&(!Array.isArray(d.formats)||new Set(d.formats).size!==d.formats.length||d.formats.some(id=>!C.FORMATS.some(x=>x.id===id))))throw Error('특수상영 형식을 확인해 주세요.');
  if(!d.title?.trim()||d.title.trim().length>40)throw Error('영화 제목은 1~40자로 적어 주세요.');
  if(person(s,d.director)?.role!=='director'||d.leads?.length!==2||d.leads.some(id=>person(s,id)?.role!=='lead')||d.supports?.length!==4||d.supports.some(id=>person(s,id)?.role!=='support'))throw Error('감독 1명, 주연 2명, 조연 4명을 선정해 주세요.');
  const ids=crewIds(d);for(const id of ids)if(!eligible(s,person(s,id),d.genres))throw Error('은퇴·별세·성장 중인 인물 또는 배역에 맞지 않는 인물이 있습니다.');if(new Set(ids).size!==ids.length)throw Error('한 사람을 중복 배역으로 선택할 수 없습니다.');
  for(const id of ids)if(busyFilm(s,id))throw Error(`${person(s,id).name} 님은 다른 영화를 제작 중입니다.`);
  if(d.script.sequelOf){const parent=s.films.find(f=>f.id===d.script.sequelOf);if(!parent||parent.company!==c.id||parent.status!=='closed'||s.films.some(f=>f.sequelOf===parent.id))throw Error('속편 제작 조건이 바뀌었습니다. 가장 최근 상영 종료작을 확인해 주세요.');}
  if(c.id==='c0'&&!s.pitches.some(p=>p.id===d.script.id))throw Error('현재 받은 시나리오를 선택해 주세요.');
  if(d.subgenres&&(Object.keys(d.subgenres).some(g=>!d.genres.includes(g))||d.genres.some(g=>!SUBGENRES[g].some(x=>x[0]===d.subgenres[g]))))throw Error('선택한 장르별 세부장르를 확인해 주세요.');
  validateNegotiations(s,d);
  const e=estimate({...d,company:c.id},s);B.validateFunding(s,d,e);if(c.cash<e.cashNeeded)throw Error(`제작비가 ${money(e.cashNeeded-c.cash)} 부족합니다. 은행에서 자금을 확보해 주세요.`);
  return e;
}
export function greenlight(s,d,company='c0'){
  const c=s.companies.find(c=>c.id===company);if(!c)throw Error('제작사를 찾을 수 없습니다.');
  const e=validateDraft(s,d,c);const events=[];while(events.length<4){const id=Math.floor(random(s)*EVENTS.length);if(!events.includes(id))events.push(id);}
  const f={id:`f${++s.filmCounter}`,company,title:d.title.trim(),script:{...d.script},genres:[...d.genres],scale:d.scale,director:d.director,leads:[...d.leads],supports:[...d.supports],start:s.month,months:e.months,elapsed:0,status:'production',budget:e.total,spent:e.total,quality:e.quality,awareness:5,events,decisions:[],pending:null,extended:false,reshootElapsed:0,releaseMonth:null,readyMonth:null,reviews:[],score:null,gross:0,receipts:0,audience:0,lastAudience:0,openingAudience:null,runs:[],awards:[]};
  f.castSnapshot=Object.fromEntries(crewIds(f).map(id=>[id,{...person(s,id)}]));f.chemistry=teamCompatibility(s,crewIds(f));f.historyInfluence=historyEffect(s,crewIds(f));f.sequelOf=d.script.sequelOf??null;f.seriesRoot=d.script.seriesRoot??f.id;f.episode=d.script.episode??1;f.pastCrew=[];
  f.runtime=RT.runtimeOf(d);f.plannedRuntime=f.runtime;f.runtimeQuality=RT.runtimeQuality(d);f.editHistory=[];f.runtimeLegacy=false;
  f.formats=C.normalizeFormats(d);f.presentationBudget=e.formats;f.presentationCostModel=C.FORMAT_COST_MODEL;f.presentationCostBreakdown=e.formatBreakdown;f.formatQuality=e.formatQuality;f.receptionVersion=2;
  f.subgenres=d.subgenres?{...d.subgenres}:{};f.subgenreBonus=subgenreEffect(d);f.socialAffinity=teamAffinity(s,crewIds(f));initFilm(s,f);initTimeline(s,f);f.startWeek=weekOf(s);f.elapsedWeeks=0;f.reshootElapsedWeeks=0;f.productionCycles[0].startWeek=weekOf(s);f.productionCycles[0].crankInWeek=weekOf(s);f.completionAcknowledged=false;
  if(d.requireNegotiation){f.negotiations=negotiationReport(s,d);for(const r of f.negotiations)f.contracts[r.person].paid=r.total;}
  productionBonds(s,f,1,'새 작품 계약');
  K.initFilmEconomy(s,f);
  if(company==='c0')B.attachProduction(s,d,f,e);
  transaction(s,c,-e.total,`「${f.title}」 제작 계약`,'production',f.id,{externalFunding:K.modernFilm(f)?f.investment?.amount??0:0});s.films.push(f);
  if(company==='c0'){s.pitches=s.pitches.filter(p=>p.id!==d.script.id);log(s,'새 영화가 시작됩니다',`「${f.title}」 · ${e.months*4}주 제작 · ${money(e.total)} 집행`,'production',f.id);}
  return f;
}
export const eventCost=(f,choice)=>round(Math.max(0,f.budget*choice[1]));
export function resolveEvent(s,id,index){
  const f=s.films.find(f=>f.id===id);if(!f||f.pending==null)throw Error('결정할 제작 사건이 없습니다.');
  if(!Number.isInteger(index)||index<0||index>2)throw Error('선택지를 골라 주세요.');
  const event=EVENTS[f.pending],choice=event[2][index],cost=eventCost(f,choice);const c=s.companies.find(c=>c.id===f.company);
  if(cost>0&&c.cash<cost)throw Error('선택에 필요한 자금이 부족합니다. 비용 없는 대안 또는 은행 대출을 이용해 주세요.');
  const beforeSpent=f.spent,beforeQuality=f.quality;specialEvent(s,f,event,index);
  transaction(s,c,-cost,`「${f.title}」 ${event[0]}`,'event',f.id);f.spent=round(f.spent+cost);f.quality=clamp(f.quality+choice[2],20,99);f.awareness=clamp(f.awareness+choice[3],0,50);
  f.decisions.push({event:f.pending,index,cost:round(f.spent-beforeSpent),quality:f.quality-beforeQuality,awareness:choice[3],month:s.month,week:weekOf(s)});f.pending=null;recordWrap(s,f);productionBonds(s,f,choice[2]>0?2:choice[2]<0?-2:0,'현장 사건 선택');
  if(f.company==='c0')log(s,event[0],`${choice[0]} · 품질 ${choice[2]>=0?'+':''}${choice[2]} · ${money(round(f.spent-beforeSpent))} 비용 변동`,'decision',f.id);
  return f;
}
export function expectedRelease(f){if(f.status==='streaming'||f.status==='shelved')return Infinity;return f.releaseMonth??(f.status==='ready'?f.readyMonth+1:f.status==='reshoot'?f.reshootStart+12+(f.screeningDelayWeeks??0)/4:f.start+f.months+(f.screeningDelayWeeks??0)/4);}
export function competitors(s,f,month=s.month,planned=false){
  return s.films.filter(o=>o.id!==f.id&&o.genres.some(g=>f.genres.includes(g))&&(planned?Math.abs(expectedRelease(o)-month)<=1:o.releaseMonth!=null&&Math.abs(o.releaseMonth-month)<=1));
}
function prepareReviews(s,f){
  if(!f.creativeOutcome){const unfamiliar=crewIds(f).filter(id=>genreFit(person(s,id),f.genres)<65).length;const surprise=unfamiliar>0&&random(s)<.2+unfamiliar*.035;const chemistryTurn=random(s)<.17?(f.chemistry<55?5:-4):0;const variation=Math.round(random(s)*8-4);const change=(surprise?7:0)+chemistryTurn+variation;f.quality=clamp(f.quality+change,20,99);f.creativeOutcome={surprise,chemistryTurn,variation,change};f.audienceLuck=.9+random(s)*.2;if(f.quality>=75&&random(s)<.06)f.audienceLuck=1.65; if(f.company==='c0')log(s,surprise?'낯선 장르에서 발견한 새 강점':'제작진의 호흡이 작품으로 남았습니다',`「${f.title}」 창작 결과 ${change>=0?'+':''}${change} · 이력과 궁합은 성공을 보장하지 않습니다.`,'decision',f.id);}

  C.makeCriticReviews(f);
  finishTimeline(s,f);productionBonds(s,f,2,'촬영 완료');f.readyMonth=s.month;f.readyWeek=weekOf(s);f.status='ready';f.completionAcknowledged=false;C.ensurePlot(f);
  if(f.company==='c0')log(s,'개봉 전 평론이 도착했습니다',`「${f.title}」 제작 완료. 평론을 확인하고 개봉 시기를 정해 주세요.`,'review',f.id);
}
export function reviewScore(s,f,planned=true){
  if(!f.reviews.length)return null;
  if(f.reviewModel===2)return C.criticScore(f);
  if(f.scoreLocked)return f.score;
  const count=competitors(s,f,f.releaseMonth??s.month,planned).length;
  return Math.round(clamp(mean(f.reviews.map(r=>r.base))-Math.min(7,count*1.5),10,99));
}
export const releaseWait=(s,company='c0')=>Math.ceil(releaseWaitWeeks(s,company)/4);
export function releaseFilm(s,id){
  const f=s.films.find(f=>f.id===id);if(!f||!['ready','shelved'].includes(f.status))throw Error('제작과 평론이 완료된 영화만 개봉할 수 있습니다.');
  if(f.company==='c0')B.assertDistribution(s,f);
  if(f.activePromotion)throw Error('진행 중인 홍보가 다음 주에 완료됩니다. 결과를 확인한 뒤 개봉해 주세요.');
  const c=s.companies.find(c=>c.id===f.company),wait=releaseWait(s,c.id);if(wait)throw Error(`다음 개봉은 ${weekDate(weekOf(s)+releaseWaitWeeks(s,c.id))}부터 가능합니다.`);
  if(f.status==='shelved'){f.storageHistory??=[];f.storageHistory.push({action:'release',month:s.month,week:weekOf(s)});}f.distribution='theatrical';f.poster??=GENRES.findIndex(g=>g.id===f.genres[0])%12;f.status='showing';f.releaseMonth=s.month;f.releaseWeek=weekOf(s);c.lastRelease=s.month;c.lastReleaseWeek=weekOf(s);invalidateCareer(s);
  for(const o of s.films.filter(o=>o.releaseMonth===s.month&&!o.scoreLocked))o.score=reviewScore(s,o,false);
  if(f.company==='c0')log(s,'오늘 개봉합니다',`「${f.title}」 첫 흥행 성적은 1주 뒤 집계됩니다. 개봉 후 8주간 주간 성과를 알려 드립니다.`,'release',f.id);
  return f;
}
export function shelveFilm(s,id){const f=s.films.find(f=>f.id===id);if(!f||f.company!=='c0'||f.status!=='ready')throw Error('완성된 우리 영화를 창고에 보관할 수 있습니다.');f.status='shelved';f.shelvedMonth=s.month;f.storageHistory??=[];f.storageHistory.push({action:'shelve',month:s.month,week:weekOf(s)});log(s,'창고영화로 보관합니다',`「${f.title}」 개봉을 미뤘습니다. 제작 슬롯과 별도 보관료 없이 원하는 시기를 기다릴 수 있습니다.`,'production',f.id);return f;}
export function unshelveFilm(s,id){const f=s.films.find(f=>f.id===id);if(!f||f.company!=='c0'||f.status!=='shelved')throw Error('창고에 보관한 우리 영화를 선택해 주세요.');f.status='ready';f.storageHistory??=[];f.storageHistory.push({action:'restore',month:s.month,week:weekOf(s)});log(s,'개봉 준비를 다시 시작합니다',`「${f.title}」 창고에서 꺼냈습니다. 홍보와 개봉 시기를 결정해 주세요.`,'production',f.id);return f;}
export function extendFilm(s,id){
  const f=s.films.find(f=>f.id===id);if(!f||f.company!=='c0'||f.status!=='ready'||f.extended)throw Error('개봉 전 완성작을 한 번만 추가 제작할 수 있습니다.');
  B.assertDistribution(s,f);
  if(active(s).filter(o=>o.company===f.company).length>=3)throw Error('추가 제작도 제작 슬롯 1개가 필요합니다.');
  for(const pid of [...crewIds(f),...(f.cameos??[])]){if(!available(s,person(s,pid)))throw Error(`${person(s,pid).name} 님의 은퇴·별세로 기존 제작진의 추가 제작이 어렵습니다. 새 제작진으로 속편을 기획할 수 있습니다.`);if(busyFilm(s,pid,f.id))throw Error(`${person(s,pid).name} 님의 제작 일정이 겹칩니다. 일정이 비면 추가 제작할 수 있습니다.`);}
  const cost=round(f.budget*.4);if(player(s).cash<cost)throw Error('추가 제작비가 부족합니다.');
  transaction(s,player(s),-cost,`「${f.title}」 12개월 추가 제작`,'production',f.id);f.spent=round(f.spent+cost);f.extended=true;f.status='reshoot';f.reviews=[];f.readyMonth=null;f.reshootStart=s.month;f.reshootStartWeek=weekOf(s);f.reshootElapsedWeeks=0;f.completionAcknowledged=false;initTimeline(s,f);f.productionCycles.push({kind:'additional',start:s.month,startWeek:weekOf(s),crankIn:s.month,crankInWeek:weekOf(s),crankUp:null,completed:null,inferred:false});
  log(s,'한 번 더, 라스트 테이크',`「${f.title}」 12개월 추가 제작 · ${money(cost)} · 완료 시 품질 +8`,'production',f.id);return f;
}
export function createSequelPitch(s,id,company='c0'){
  const parent=s.films.find(f=>f.id===id);
  if(!parent||parent.company!==company||parent.status!=='closed')throw Error('우리 제작사의 상영 종료작에서 속편을 기획할 수 있습니다.');
  if(s.films.some(f=>f.sequelOf===id))throw Error('이미 이 작품의 속편이 있습니다. 가장 최근 후속작에서 이어서 기획해 주세요.');
  const existing=s.pitches.find(p=>p.sequelOf===id&&available(s,person(s,p.writer))&&!busyFilm(s,p.writer));if(existing)return existing;
  const original=person(s,parent.script.writer),writer=available(s,original)&&!busyFilm(s,original.id)?original:people(s).filter(p=>p.role==='writer'&&available(s,p)&&!busyFilm(s,p.id)).sort((a,b)=>genreFit(b,parent.genres)-genreFit(a,parent.genres)||b.skill-a.skill)[0];
  if(!writer)throw Error('속편을 집필할 작가의 일정이 아직 비지 않았습니다.');
  const pitch=createPitch(s,writer.id,parent.genres[0]),root=s.films.find(f=>f.id===(parent.seriesRoot??parent.id))??parent;
  Object.assign(pitch,{title:root.title.slice(0,32)+' '+((parent.episode??1)+1),synopsis:`「${parent.title}」 이후의 이야기. ${parent.script.synopsis} 이전 선택이 남긴 변화를 따라 새로운 갈등과 해결을 그립니다.`,original:root.script.original,sequelOf:parent.id,seriesRoot:root.id,episode:(parent.episode??1)+1,license:parent.script.license?{...parent.script.license}:undefined,quality:Math.round(clamp(writer.skill*.65+parent.script.quality*.2+random(s)*12+5,35,95))});
  pitch.fee=round(contractQuote(s,writer).fee*(1+pitch.quality/130));
  if(company==='c0')s.pitches=[pitch,...s.pitches].slice(0,12);return pitch;
}
function replaceUnavailableCrew(s){
  for(const f of active(s)){
    f.staffVacancy=[];
    for(const id of [...crewIds(f)]){
      const departed=person(s,id);if(departed?.status!=='dead')continue;
      const candidates=people(s).filter(p=>p.role===departed.role&&p.gender===departed.gender&&eligible(s,p,f.genres)&&!busyFilm(s,p.id)&&!crewIds(f).includes(p.id));
      candidates.sort((a,b)=>genreFit(b,f.genres)-genreFit(a,f.genres)||b.skill-a.skill);const replacement=candidates[0];
      if(!replacement){f.staffVacancy.push(departed.name);continue;}
      f.pastCrew=[...new Set([...(f.pastCrew??[]),id])];
      if(f.director===id)f.director=replacement.id;
      if(f.script.writer===id)f.script.writer=replacement.id;
      f.leads=f.leads.map(x=>x===id?replacement.id:x);f.supports=f.supports.map(x=>x===id?replacement.id:x);
      f.castSnapshot??={};f.castSnapshot[replacement.id]={...replacement};invalidateCareer(s);f.quality=clamp(f.quality-3,20,99);
      const fee=round(contractQuote(s,replacement,crewIds(f),f.company).fee*.25);f.contracts??={};f.contracts[replacement.id]={paid:fee,settled:false};f.spent=round(f.spent+fee);transaction(s,s.companies.find(c=>c.id===f.company),-fee,`「${f.title}」 제작진 교체`,'production',f.id);
      if(f.company==='c0')log(s,'제작진을 새로 구성했습니다',`${departed.name} 님의 기록은 남기고 ${replacement.name} 님이 작업을 이어갑니다. 품질 -3 · 추가 비용 ${money(fee)}`,'career',f.id);
    }
  }
}
export function migrateSave(s){
  if(!validateSave(s))throw Error('저장 내용을 읽을 수 없습니다.');
  if(s.version<6){
    // Month-format saves have no authoritative week. Never trust newer leftover fields.
    s.week=s.month*4;
    for(const c of s.companies)c.lastReleaseWeek=c.lastRelease*4;
    for(const f of s.films){
      f.startWeek=f.start*4;f.elapsedWeeks=Math.round((f.elapsed||0)*4);
      f.reshootElapsedWeeks=Math.round((f.reshootElapsed||0)*4);
      if(f.reshootStart!=null)f.reshootStartWeek=f.reshootStart*4;
      if(f.readyMonth!=null)f.readyWeek=f.readyMonth*4;
      if(f.releaseMonth!=null)f.releaseWeek=f.releaseMonth*4;
    }
  }
  initializeRoster(s,s.version===1);initRelations(s);s.marketEvents??=[];if(!s.marketEvents.length)startMarketEvent(s);s.version=VERSION;initClock(s);
  for(const f of s.films){initFilm(s,f);initTimeline(s,f,true);f.castSnapshot??=Object.fromEntries(crewIds(f).map(id=>[id,{...person(s,id)}]));f.pastCrew??=[];f.chemistry??=teamCompatibility(s,crewIds(f));f.historyInfluence??=0;f.seriesRoot??=f.id;f.episode??=1;if(f.reviews.length)f.creativeOutcome??={surprise:false,chemistryTurn:0,variation:0,change:0};}
  C.initCinema(s);B.initGrowth(s);for(const f of s.films)RT.initRuntime(f);T.initTax(s);initFinanceHistory(s);initAbilities(s);
  K.initEconomy(s);return s;
}
export const loanLimit=s=>round(150+Math.min(150,player(s).totalReceipts*.2));
export function borrow(s,amount){
  if(!Number.isFinite(amount)||amount<=0||amount%10!==0)throw Error('대출은 10억 원 단위로 가능합니다.');
  const c=player(s);if(c.debt+amount>loanLimit(s))throw Error('대출 한도를 초과합니다.');
  c.debt=round(c.debt+amount);transaction(s,c,amount,'은행 대출 실행','loan');log(s,'운영 자금 확보',`${money(amount)} 대출 · 월 이자율 0.5%`,'finance');return c;
}
export function repay(s,amount){
  const c=player(s);if(!Number.isFinite(amount)||amount<=0||amount>c.debt||amount>c.cash)throw Error('보유 현금과 대출 잔액 안에서 상환해 주세요.');
  c.debt=round(c.debt-amount);transaction(s,c,-amount,'대출 원금 상환','repayment');return c;
}
function startAi(s,c){
  if(productionSlots(s,c.id).length>=3)return;
  const writers=people(s).filter(p=>p.role==='writer'&&available(s,p)&&!busyFilm(s,p.id));if(!writers.length)return;
  const pool=writers.filter(p=>p.genres.includes(c.genre));let script=createPitch(s,pick(s,pool.length?pool:writers).id,c.genre);const sequels=s.films.filter(f=>f.company===c.id&&f.status==='closed'&&!s.films.some(o=>o.sequelOf===f.id));if(sequels.length&&random(s)<.22)script=createSequelPitch(s,pick(s,sequels).id,c.id);
  let scale=c.cash>125&&random(s)>.48?'large':c.cash>55?'medium':'small';
  const second=GENRES.map(g=>g.id).filter(g=>g!==script.genre).sort((a,b)=>genreBonus([script.genre,b])-genreBonus([script.genre,a]));
  const genres=random(s)>.5?[script.genre,second[Math.floor(random(s)*3)]]:[script.genre];
  let d=recommend(s,{script,title:script.title,genres,scale,company:c.id,leads:[],supports:[]});
  if(c.cash<estimate(d,s).total+8){d.scale='small';if(c.cash<estimate(d,s).total+5)return;}
  const f=greenlight(s,d,c.id);return f;
}
function aiOperations(s,allowPlanning=true){
  for(const c of s.companies.slice(1)){
    if(c.cash<10&&c.debt<100){const n=Math.min(30,100-c.debt);c.debt+=n;transaction(s,c,n,'운영 대출','loan');}
    if(c.cash>100&&c.debt>0){const n=Math.min(20,c.debt);c.debt-=n;transaction(s,c,-n,'대출 상환','repayment');}
    const ready=s.films.filter(f=>f.company===c.id&&f.status==='ready'&&(f.readyWeek??f.readyMonth*4)<weekOf(s));
    if(ready.length&&!releaseWait(s,c.id)){
      ready.sort((a,b)=>competitors(s,a,s.month,true).length-competitors(s,b,s.month,true).length||a.readyMonth-b.readyMonth);
      const f=ready[0];if(competitors(s,f,s.month,true).length<4||s.month-f.readyMonth>=3){releaseFilm(s,f.id);log(s,`${c.name} 신작 개봉`,`「${f.title}」 · ${f.genres.map(g=>GENRE[g].name).join(' / ')}`,'industry',f.id);}
    }
    const count=active(s).filter(f=>f.company===c.id).length;
    if(allowPlanning&&(count===0||random(s)<.27)&&s.films.filter(f=>f.company===c.id&&f.status==='ready').length<2)startAi(s,c);
  }
}
function settleBoxOffice(s){
  const films=s.films.filter(f=>f.status==='showing');let totalAudience=0,totalGross=0;
  for(const f of films){
    const opening=f.runs.length===0;
    if(opening){f.score=reviewScore(s,f,false);f.scoreLocked=true;}
    const stars=mean(f.leads.map(id=>(f.castSnapshot?.[id]??person(s,id)).star));const predecessor=f.sequelOf?s.films.find(o=>o.id===f.sequelOf):null;const franchise=predecessor?clamp(1+(predecessor.audience/10000000)*.2+(predecessor.quality-65)*.003-(f.episode-2)*.025,.85,1.3):1;
    const rivals=films.filter(o=>o.id!==f.id&&o.genres.some(g=>f.genres.includes(g))&&s.month-o.releaseMonth<3).length;
    const competition=clamp(1-rivals*.085,.48,1);
    const eventBoost=marketBoost(s,f),trend=(f.genres.some(g=>s.trends.includes(g))?1.12:1)*(1+eventBoost/100);
    const base=opening?C.openingDemand(f,{competition,trend,stars,reach:SCALE[f.scale].reach,franchise:franchise*(f.seriesBoost??1)})*RT.capacityFactor(f)*K.demandFactor(f)*2.35:f.lastAudience*Math.pow(C.weeklyRetention(f),4)*(1+eventBoost/100);
    const audience=Math.max(0,Math.round(base*(1+(f.publicity??0)/100)));const settlement=K.theatricalSettlement(f,audience,C.formatEffect(f).ticketFactor),{gross,royalty}=settlement,receipts=B.splitReceipt(s,f,settlement.pool);K.recordTheatrical(f,settlement);f.royalties=round((f.royalties??0)+royalty);
    f.runs.push({settlement:structuredClone(settlement),month:s.month,audience,gross,receipts,eventBoost,competition:Math.round((1-competition)*100)});f.audience+=audience;f.gross=round(f.gross+gross);f.receipts=round(f.receipts+receipts);f.lastAudience=audience;if(opening)f.openingAudience=audience;
    const c=s.companies.find(c=>c.id===f.company);c.totalAudience+=audience;c.totalGross=round(c.totalGross+gross);c.totalReceipts=round(c.totalReceipts+receipts);transaction(s,c,receipts,`「${f.title}」 배급 정산`,'boxoffice',f.id);
    C.ensureViewerReviews(f);announceBoxOfficeMilestones(s,f);totalAudience+=audience;totalGross=round(totalGross+gross);
    // End only after a full opening month, when demand falls below 12% of opening or 10,000 admissions.
    if(f.runs.length>=2&&(audience<f.openingAudience*.12||audience<10000)){
      f.status='closed';f.closeMonth=s.month;
      if(f.company==='c0')log(s,'상영이 마무리되었습니다',`「${f.title}」 총 ${viewers(f.audience)} 명 · 총매출 ${money(f.gross)} · 제작사 정산 ${money(f.receipts)}`,'close',f.id);
    }
  }
  invalidateCareer(s);s.marketHistory.push({month:s.month,audience:totalAudience,gross:totalGross});
}
function awards(s){
  const year=2026+Math.floor(s.month/12);if(s.awards.some(a=>a.year===year))return;
  const films=s.films.filter(f=>f.releaseMonth!=null&&2026+Math.floor(f.releaseMonth/12)===year);
  if(!films.length){s.awards.push({year,winners:[],nominees:[],eligible:0});return;}
  const best=score=>[...films].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0];
  const all=films.flatMap(f=>f.leads.map(id=>({f,p:f.castSnapshot?.[id]??person(s,id)})));
  const acting=gender=>[...all.filter(x=>x.p.gender===gender)].sort((a,b)=>(b.p.skill*.6+b.f.quality*.4)-(a.p.skill*.6+a.f.quality*.4))[0];
  const bestFilm=best(f=>f.quality*.7+(f.score??f.quality)*.3),director=best(f=>(f.castSnapshot?.[f.director]??person(s,f.director)).skill*.6+f.quality*.4),writing=best(f=>f.script.quality*.65+f.quality*.35);
  const annualGross=f=>f.runs.filter(r=>2026+Math.floor(r.month/12)===year).reduce((n,r)=>n+r.gross,0);
  const winners=[{category:'작품상',film:bestFilm.id},{category:'감독상',film:director.id,person:director.director},{category:'각본상',film:writing.id,person:writing.script.writer},{category:'흥행상',film:best(annualGross).id}];
  for(const [g,label] of [['M','남우주연상'],['F','여우주연상']]){const a=acting(g);if(a)winners.push({category:label,film:a.f.id,person:a.p.id});}
  for(const w of winners){const f=s.films.find(f=>f.id===w.film),c=s.companies.find(c=>c.id===f.company);f.awards.push({year,category:w.category});c.trophies++;c.reputation=clamp(c.reputation+3,0,100);if(c.id==='c0')log(s,`${year}년 ${w.category} 수상`,`「${f.title}」${w.person?' · '+person(s,w.person).name:''}`,'award',f.id);}
  s.awards.push({year,winners,nominees:[...films].sort((a,b)=>b.quality-a.quality).slice(0,5).map(f=>f.id),eligible:films.length});
  log(s,`${year} 필름 어워즈`,`올해 ${films.length}편이 출품되었습니다. 작품상은 「${bestFilm.title}」입니다.`,'awards');
}
/** Legacy regression helper. Live gameplay exclusively calls advanceWeek. */
/** Legacy monthly replay helper. The live game uses advanceWeek exclusively. */
export function advanceMonth(s){
  if(pendingEdits(s).length)throw Error('감독과의 편집 협의를 먼저 결정해 주세요.');
  if(pendingEvents(s).length)throw Error('제작 중 도착한 사건 카드를 먼저 결정해 주세요.');
  settleBoxOffice(s);
  for(const c of s.companies){const interest=round(c.debt*.005);if(interest)transaction(s,c,-interest,'은행 대출 이자','interest');settleOperatingCosts(s,c);}
  if(s.month%12===11){T.closeTaxYear(s);awards(s);}
  s.month++;s.week=s.month*4;
  if(s.month%12===0){const changes=cycleYear(s,random);announceLifeEvents(s,changes);for(const x of changes)log(s,x.type==='death'?x.name+' · '+x.reason:x.name+'의 은퇴 소식',x.type==='death'?`${x.nextName} 님이 새로운 고유 초상화로 6세부터 새 경력을 시작합니다.`:x.pending?'현재 작품을 마친 뒤 은퇴합니다.':'작품 기록은 프로필에 보존됩니다.','career');}
  replaceUnavailableCrew(s);
  if(s.month%3===0){const event=startMarketEvent(s);if(event)log(s,event.title,`${GENRE[event.genre].name} 장르 관객 +${event.boost}% · ${date(event.start)} ~ ${date(event.end-1)}. ${event.reason}`,'trend');s.trends=[pick(s,GENRES).id];let next;do{next=pick(s,GENRES).id;}while(s.trends.includes(next));s.trends.push(next);log(s,'관객의 관심이 바뀌었습니다',`${s.trends.map(g=>GENRE[g].name).join(' · ')} 장르가 이번 분기 주목받고 있습니다.`,'trend');}
  for(const f of active(s)){
    if(f.staffVacancy?.length||B.screeningHold(f))continue;
    if(f.status==='reshoot'){f.reshootElapsed++;recordWrap(s,f);if(f.reshootElapsed>=12){f.quality=clamp(f.quality+8,20,99);prepareReviews(s,f);}continue;}
    f.elapsed++;
    if(f.decisions.length<4&&f.elapsed>=Math.ceil(f.months*(f.decisions.length+1)/5)){
      f.pending=f.events[f.decisions.length];
      if(f.company!=='c0'){const c=s.companies.find(c=>c.id===f.company);const choices=EVENTS[f.pending][2].map((v,i)=>({v,i})).filter(x=>eventCost(f,x.v)<=c.cash||x.v[1]===0);choices.sort((a,b)=>(b.v[2]-(c.cash<30?b.v[1]*150:b.v[1]*30))-(a.v[2]-(c.cash<30?a.v[1]*150:a.v[1]*30)));try{resolveEvent(s,f.id,choices[0].i);}catch(error){if(!/자금|대체/.test(error.message))throw error;resolveEvent(s,f.id,2);}}
      else log(s,'현장에서 결정 요청이 왔습니다',`「${f.title}」 · ${EVENTS[f.pending][0]}`,'event',f.id);
    }
    if(recordWrap(s,f)&&f.company==='c0')log(s,'크랭크업',`「${f.title}」 촬영을 마치고 후반 작업을 진행합니다.`,'production',f.id);
    if(f.elapsed>=f.months&&f.pending==null&&f.decisions.length===4)prepareReviews(s,f);
  }
  scanEditingWindows(s);finishRetirements(s);
  socialNews(s);
  aiOperations(s);
  for(const f of s.films){f.elapsedWeeks=Math.round(f.elapsed*4);f.reshootElapsedWeeks=Math.round(f.reshootElapsed*4);}
  if(player(s).cash<0)log(s,'운영 자금이 부족합니다','은행에서 자금을 빌릴 수 있습니다. 제작 중인 영화와 상영작은 계속 진행됩니다.','finance');
  settleStreaming(s);recordFinance(s,'월 결산');
  return s;
}
export function createGame(name,seed=Date.now()>>>0,logo=0,difficulty='normal'){
  if(!K.DIFFICULTY[difficulty])throw Error('난이도를 5단계 중 선택해 주세요.');
  if(typeof name!=='string'||!name.trim()||name.trim().length>24)throw Error('회사 이름을 1~24자로 적어 주세요.');
  const s={version:VERSION,seed:seed>>>0,month:0,filmCounter:0,pitchCounter:0,messageCounter:0,ledgerCounter:0,companies:STUDIOS.map((c,i)=>({...c,id:`c${i}`,name:i===0?name.trim():c.name,logo:i===0?logo:i%8,cash:150,debt:0,lastRelease:-2,totalGross:0,totalReceipts:0,totalAudience:0,trophies:0,reputation:30})),films:[],pitches:[],lastPitchRefresh:-2,messages:[],ledger:[],marketHistory:[],awards:[],trends:['drama','comedy']};
  s.difficulty=difficulty;K.initEconomy(s);s.companies[0].cash=K.difficulty(s).capital;
  initializeRoster(s);initRelations(s);startMarketEvent(s);initAbilities(s);B.initGrowth(s);
  s.ledger=[{id:++s.ledgerCounter,month:0,week:0,amount:K.difficulty(s).capital,description:'회사 설립 자본금',kind:'capital'}];
  initClock(s);C.initCinema(s);T.initTax(s,{fresh:true});initFinanceHistory(s);refreshPitches(s,{initial:true});
  for(const c of s.companies.slice(1))startAi(s,c);
  log(s,'첫 번째 영화를 기다립니다','작가의 시놉시스를 읽고, 당신의 영화로 만들 이야기를 골라 주세요.','welcome');return s;
}
export function validateSave(s){
  if(s?.difficulty!=null&&!K.DIFFICULTY[s.difficulty])return false;
  if(!s||![1,2,3,4,5,6,VERSION].includes(s.version)||!Number.isInteger(s.month)||s.month<0||!Array.isArray(s.companies)||s.companies.length!==10||!Array.isArray(s.films)||!Array.isArray(s.pitches)||!Array.isArray(s.messages)||!Array.isArray(s.ledger)||!Array.isArray(s.awards)||!Array.isArray(s.marketHistory)||!Array.isArray(s.trends))return false;
  if(s.version>=6&&s.week!=null&&(!Number.isInteger(s.week)||s.week<0||Math.floor(s.week/4)!==s.month))return false;
  if(s.version>=5&&(!Array.isArray(s.roster)||s.roster.length!==1600||new Set(s.roster.map(p=>p.id)).size!==1600||!s.alumni||!Array.isArray(s.lifeEvents)))return false;
  if(s.companies.some((c,i)=>c.id!==`c${i}`||typeof c.name!=='string'||!Number.isFinite(c.cash)||!Number.isFinite(c.debt)))return false;
  return s.films.every(f=>K.validateFilmEconomy(f)&&typeof f.title==='string'&&Array.isArray(f.leads)&&Array.isArray(f.supports)&&crewIds(f).every(id=>person(s,id))&&Array.isArray(f.genres)&&f.genres.every(g=>GENRE[g])&&SCALE[f.scale]&&Array.isArray(f.decisions)&&Array.isArray(f.runs)&&Array.isArray(f.reviews)&&Array.isArray(f.awards)&&Number.isFinite(f.spent)&&Number.isFinite(f.quality));
}

/** One measured week of admissions, not four copies of a monthly settlement. */
function settleWeeklyBoxOffice(s) {
  const showing = s.films.filter(f => f.status === 'showing');
  let totalAudience = 0, totalGross = 0;
  for (const f of showing) {
    const opening = f.runs.length === 0;
    if (opening) { f.score = reviewScore(s, f, false); f.scoreLocked = true; }
    const stars = mean(f.leads.map(id => (f.castSnapshot?.[id] ?? person(s, id)).star));
    const previous = f.sequelOf ? s.films.find(o => o.id === f.sequelOf) : null;
    const franchise = previous ? clamp(1 + previous.audience / 10000000 * .2 + (previous.quality - 65) * .003 - (f.episode - 2) * .025, .85, 1.3) : 1;
    const rivals = showing.filter(o => o.id !== f.id && o.genres.some(g => f.genres.includes(g)) && weekOf(s) - (o.releaseWeek ?? o.releaseMonth * 4) < 12).length;
    const competition = clamp(1 - rivals * .085, .48, 1), eventBoost = marketBoost(s, f);
    const trend = (f.genres.some(g => s.trends.includes(g)) ? 1.12 : 1) * (1 + eventBoost / 100);
    // Separate the public response from criticism and avoid repeated blockbuster inflation.
    const base = opening
      ? C.openingDemand(f,{competition,trend,stars,reach:SCALE[f.scale].reach,franchise:franchise*(f.seriesBoost??1)})*RT.capacityFactor(f)*K.demandFactor(f)
      : (f.lastWeekAudience ?? f.lastAudience / 4) * C.weeklyRetention(f) * (.96 + random(s) * .08) * (.97 + competition * .03);
    const audience = Math.max(0, Math.round(base * (opening ? 1 + (f.publicity ?? 0) / 100 : 1 + (f.publicity ?? 0) / 800)));
    const settlement=K.theatricalSettlement(f,audience,C.formatEffect(f).ticketFactor),{gross,royalty}=settlement,receipts=B.splitReceipt(s,f,settlement.pool);K.recordTheatrical(f,settlement);
    const run = { settlement:structuredClone(settlement), runtime:RT.runtimeOf(f),dailyShows:RT.dailyShows(f),week: weekOf(s), month: s.month, audience, gross, receipts, eventBoost, competition: Math.round((1 - competition) * 100) };
    f.runs.push(run); f.audience += audience; f.gross = round(f.gross + gross); f.receipts = round(f.receipts + receipts);
    f.royalties = round((f.royalties ?? 0) + royalty); f.lastAudience = audience; f.lastWeekAudience = audience;
    if (opening) { f.openingAudience = audience; f.openingWeekAudience = audience; }
    C.ensureViewerReviews(f);announceBoxOfficeMilestones(s,f);
    const c = s.companies.find(c => c.id === f.company);
    c.totalAudience += audience; c.totalGross = round(c.totalGross + gross); c.totalReceipts = round(c.totalReceipts + receipts);
    transaction(s, c, receipts, `「${f.title}」 주간 배급 정산`, 'boxoffice', f.id);
    totalAudience += audience; totalGross = round(totalGross + gross);
    const runNo = weekOf(s) - (f.releaseWeek ?? f.releaseMonth * 4) + 1;
    // The first two game-months (8 weeks) always have a report, even for a slow opener.
    if (runNo >= 8 && (audience < (f.openingWeekAudience ?? f.openingAudience) * .12 || audience < 2500)) {
      f.status = 'closed'; f.closeMonth = s.month; f.closeWeek = weekOf(s);
      if (f.company === 'c0') log(s, '상영을 마쳤습니다', `「${f.title}」 누적 ${viewers(f.audience)}명 · 제작사 정산 ${money(f.receipts)}`, 'close', f.id);
    }
    if (f.company === 'c0' && runNo >= 1 && runNo <= 8) {
      const profit = B.filmProfit(f);
      notify(s, { key: `${f.id}:boxoffice:${runNo}`, type: 'boxoffice', filmId: f.id, action: 'film',
        title: `${f.title} · 개봉 ${runNo}주차`,
        text: `이번 주 ${viewers(audience)}명 · 매출 ${money(gross)}. 누적 ${viewers(f.audience)}명 · 제작사 정산 ${money(f.receipts)} · ${profit >= 0 ? '순이익' : '손익분기까지'} ${money(Math.abs(profit))}`,
        runNo, audience, gross, receipts, totalAudience: f.audience, profit });
    }
  }
  // Add the rank after every film has been settled so it never depends on loop order.
  const ranking = showing.slice().sort((a, b) => (b.runs.at(-1)?.gross ?? 0) - (a.runs.at(-1)?.gross ?? 0));
  for (const n of s.notifications ?? []) if (n.type === 'boxoffice' && n.week === weekOf(s)) n.rank = ranking.findIndex(f => f.id === n.filmId) + 1;
  invalidateCareer(s); s.marketHistory.push({ week: weekOf(s), month: s.month, audience: totalAudience, gross: totalGross });
}
export function advanceWeek(s) {
  if (pendingEdits(s).length) throw Error('감독과의 편집 협의를 먼저 결정해 주세요.');
  if (pendingEvents(s).length) throw Error('제작 중 도착한 사건 카드를 먼저 결정해 주세요.');
  initClock(s);initAbilities(s);
  settleWeeklyBoxOffice(s);
  const monthEnd = (weekOf(s) + 1) % 4 === 0;
  if (monthEnd) {
    for (const c of s.companies) {
      const interest = round(c.debt * .005);
      if (interest) transaction(s, c, -interest, '은행 대출 월 이자', 'interest');
      settleOperatingCosts(s,c);
    }
    if (s.month % 12 === 11) {T.closeTaxYear(s);awards(s);}
  }
  s.week = weekOf(s) + 1; s.month = Math.floor(s.week / 4);
  if (s.week % 48 === 0) {
    const changes = cycleYear(s, random);announceLifeEvents(s,changes);
    for (const x of changes) log(s, x.type === 'death' ? x.name + ' · ' + x.reason : x.name + '의 은퇴 소식',
      x.type === 'death' ? `${x.nextName} 님이 고유 초상화로 새로운 경력을 시작합니다.` : x.pending ? '현재 작품을 마친 뒤 은퇴합니다.' : '작품 기록은 프로필에 보존됩니다.', 'career');
  }
  replaceUnavailableCrew(s);
  if (s.week % 12 === 0) {
    const event = startMarketEvent(s);
    if (event) log(s, event.title, `${GENRE[event.genre].name} 장르 관객 +${event.boost}% · ${date(event.start)} ~ ${date(event.end - 1)}`, 'trend');
    s.trends = [pick(s, GENRES).id]; let next;
    do { next = pick(s, GENRES).id; } while (s.trends.includes(next)); s.trends.push(next);
  }
  for (const f of active(s)) {
    if (f.staffVacancy?.length||B.screeningHold(f)) continue;
    if (f.status === 'reshoot') {
      f.reshootElapsedWeeks = (f.reshootElapsedWeeks ?? Math.round(f.reshootElapsed * 4)) + 1;
      f.reshootElapsed = f.reshootElapsedWeeks / 4;
      recordWrap(s, f);
      if (f.reshootElapsedWeeks >= 48) { f.quality = clamp(f.quality + 8, 20, 99); prepareReviews(s, f); }
    } else {
      f.elapsedWeeks = (f.elapsedWeeks ?? Math.round(f.elapsed * 4)) + 1; f.elapsed = f.elapsedWeeks / 4;
      if (f.decisions.length < 4 && f.elapsedWeeks >= Math.ceil(f.months * 4 * (f.decisions.length + 1) / 5)) {
        f.pending = f.events[f.decisions.length];
        if (f.company !== 'c0') {
          const c = s.companies.find(c => c.id === f.company);
          const choices = EVENTS[f.pending][2].map((v, i) => ({ v, i })).filter(x => eventCost(f, x.v) <= c.cash || x.v[1] === 0);
          choices.sort((a, b) => (b.v[2] - b.v[1] * 60) - (a.v[2] - a.v[1] * 60));
          try { resolveEvent(s, f.id, choices[0].i); } catch (error) { if (!/자금|대체/.test(error.message)) throw error; resolveEvent(s, f.id, 2); }
        } else log(s, '현장에서 결정 요청이 왔습니다', `「${f.title}」 · ${EVENTS[f.pending][0]}`, 'event', f.id);
      }
      if (recordWrap(s, f) && f.company === 'c0') log(s, '크랭크업', `「${f.title}」 촬영을 마치고 후반 작업을 시작했습니다.`, 'production', f.id);
      if (f.elapsedWeeks >= f.months * 4 && f.pending == null && f.decisions.length === 4) prepareReviews(s, f);
    }
    if (f.company === 'c0' && f.status === 'ready') notify(s, {
      key: `${f.id}:complete:${f.productionCycles.length}`, type: 'complete', filmId: f.id, action: 'completion',
      title: `제작 완료 · ${f.title}`, text: '후반 작업이 끝났습니다. 포스터를 고르고 개봉 또는 창고 보관을 결정해 주세요.'
    });
  }
  scanEditingWindows(s);finishRetirements(s);
  if (random(s) < .25) socialNews(s);
  aiOperations(s, s.week % 4 === 0);
  resolvePromotions(s);
  scanPromotionAvailability(s);settleStreaming(s);B.tickGrowth(s);advanceAbilities(s);weeklyExperience(s);recordFinance(s,'주간 잔액');
  if (player(s).cash < 0) log(s, '운영 자금 확인', '운영 자금이 부족합니다. 재무·은행 메뉴에서 확인해 주세요.', 'finance');
  return s;
}

/** Shared preflight for the picker, negotiation and final confirmation. */
export function crewScheduleConflicts(s,d) {
  return crewIds(d).filter(Boolean).map(id=>({id,film:busyFilm(s,id)})).filter(x=>x.film);
}
export function assertCrewAvailable(s,d) {
  const conflict=crewScheduleConflicts(s,d)[0];
  if(conflict)throw Error(`${person(s,conflict.id)?.name??'제작진'} 님은 「${conflict.film.title}」 촬영·제작 중이므로 섭외할 수 없습니다.`);
  for(const id of crewIds(d).filter(Boolean))if(!eligible(s,person(s,id),d.genres))throw Error('활동 상태 또는 배역 조건이 바뀐 인물이 있습니다. 다시 확인해 주세요.');
}
export function sellToOTT(s,id,platformId) {
  const f=s.films.find(f=>f.id===id);
  if(!f||f.company!=='c0'||!['ready','shelved'].includes(f.status)||f.releaseMonth!=null||f.runs.length||f.ott)throw Error('극장에 개봉하지 않은 완성작만 OTT에 제공할 수 있습니다.');
  if(f.foreignDeals?.length)throw Error('해외 판권을 판매한 작품은 글로벌 OTT 독점으로 중복 판매할 수 없습니다.');
  B.assertDistribution(s,f);
  if(f.activePromotion)throw Error('진행 중인 홍보가 끝난 뒤 OTT 계약을 결정해 주세요.');
  const offer=C.ottOffers(f).find(x=>x.platform===platformId),platform=C.OTT_PLATFORMS.find(x=>x.id===platformId);
  if(!offer||!platform)throw Error('OTT사 한 곳을 선택해 주세요.');
  const net=B.splitReceipt(s,f,offer.net);
  const c=player(s);f.distribution='ott';f.status='streaming';f.completionAcknowledged=true;
  f.poster??=GENRES.findIndex(g=>g.id===f.genres[0])%12;
  f.score=reviewScore(s,f);f.scoreLocked=true;C.ensurePlot(f);
  f.ott={...offer,producerNet:net,startWeek:weekOf(s),startMonth:s.month,exclusive:true,availableReviews:false};
  f.receipts=round(f.receipts+net);f.royalties=round((f.royalties??0)+offer.royalty);
  c.totalReceipts=round(c.totalReceipts+net);c.totalOttReceipts=round((c.totalOttReceipts??0)+net);
  transaction(s,c,net,`「${f.title}」 ${platform.name} OTT 독점 계약`,'ott',f.id);
  f.businessHistory.push({week:weekOf(s),month:s.month,text:`${platform.name} 독점 공개. 계약금 ${money(offer.amount)}, 원작료 ${money(offer.royalty)}, 실수령 ${money(net)}. 극장 재개봉·중복 판매 불가.`});
  notify(s,{key:`${f.id}:ott-contract`,type:'ott',filmId:f.id,action:'film',title:`${platform.name} 공개 · ${f.title}`,text:`계약금 ${money(offer.amount)}, 실수령 ${money(net)}. 시청자 평은 1주 뒤 OTT 상영관에 도착합니다.`});
  invalidateCareer(s);return offer;
}
function settleStreaming(s) {
 for(const f of s.films)if(f.status==='streaming'&&f.ott&&!f.ott.availableReviews&&weekOf(s)>f.ott.startWeek){
  f.ott.availableReviews=true;C.ensureViewerReviews(f);
  notify(s,{key:`${f.id}:ott-review`,type:'ott',filmId:f.id,action:'film',title:`시청자 평 도착 · ${f.title}`,text:`${C.OTT_PLATFORMS.find(p=>p.id===f.ott.platform)?.name} · 평론 ${reviewScore(s,f)}점 / 시청자 ${C.viewerScore(f)}점. 극장 관객·매출에는 합산하지 않습니다.`});
 }
}
export function announceLifeEvents(s,changes) {
 for(const x of changes)notify(s,{key:`life:${x.type}:${x.id}:${s.month}`,type:'career',personId:x.id,action:'person',
  title:x.type==='death'?`${x.name} 님의 별세 소식`:`${x.name} 님의 은퇴${x.pending?' 예정':''}`,
  text:x.type==='death'?'영화인의 작품과 경력은 인물정보에 보존됩니다. 제작 중인 작품은 대체 제작진을 확인합니다.':x.pending?'진행 중인 작품을 마친 뒤 활동을 마무리합니다.':'활동을 마무리했습니다. 남긴 작품은 인물정보에서 볼 수 있습니다.'});
}
export function announceBoxOfficeMilestones(s,f) {
 f.historicMilestones??=[];
 for(const threshold of [5000000,10000000,15000000])if(f.audience>=threshold&&!f.historicMilestones.includes(threshold)){
  f.historicMilestones.push(threshold);
  notify(s,{key:`${f.id}:historic:${threshold}`,type:'record',filmId:f.id,action:'film',title:`흥행 이정표 · ${f.title}`,
   text:`누적 ${viewers(f.audience)}명! ${viewers(threshold)} 관객을 넘어선 ${threshold>=10000000?'역대급 흥행':'대흥행'}입니다. 영화 상세에서 주간 추이를 확인하세요.`});
 }
}


function settleOperatingCosts(s,c) {
 if(c.id!=='c0'){transaction(s,c,-.25,'월 운영비','overhead');return;}
 const costs=T.reserveMonthlyTax(s);if(!costs)return;
 transaction(s,c,-costs.overhead,`월 운영비 · 세금 ${costs.tax<0?'적립 반환':'적립'} 포함 (4주 결산)`,'overhead',undefined,{operatingBase:costs.base,taxDelta:costs.tax,taxNational:costs.position.national,taxLocal:costs.position.local});
 if(costs.tax!==0)log(s,'월 운영비·세금 결산',`운영비 ${money(costs.base)} (시설 포함) · 세금 적립 ${money(costs.tax)}. 연간 누적 소득 기준으로 계산하며 대출·자본금은 제외합니다.`,'finance');
}
export const pendingEdits=s=>s.films.filter(f=>f.company==='c0'&&f.pendingEdit);
function scanEditingWindows(s) {
 for(const f of myFilms(s))if(RT.editingAvailable(f))notify(s,{key:`${f.id}:edit-window:${f.productionCycles.length}`,type:'editing',filmId:f.id,action:'runtime-edit',title:`후반 편집실이 열렸습니다 · ${f.title}`,text:`현재 ${RT.runtimeOf(f)}분. 90·120·150·180분 중 편집안을 비교할 수 있습니다. 별도 편집 없이 기존 길이로 완성해도 됩니다.`});
}
export function proposeRuntimeEdit(s,id,minutes) {
 const f=s.films.find(f=>f.id===id);if(!f||f.company!=='c0')throw Error('우리 제작사의 영화만 편집할 수 있습니다.');
 if(f.investment?.maxRuntime&&minutes>f.investment.maxRuntime)throw Error('투자 약정상 러닝타임 상한을 넘길 수 없습니다.');
 if(f.screening&&f.screening.status!=='done')throw Error('시사회와 후속 편집 결정을 먼저 마쳐 주세요.');
 const quote=RT.editQuote(s,f,minutes,person(s,f.director),affinity(s,f.director,f.company));
 f.pendingEdit={...quote,week:weekOf(s)};
 notify(s,{key:`${f.id}:edit-proposal:${f.productionCycles.length}:${minutes}`,type:'editing',filmId:f.id,action:'runtime-edit',title:quote.conflict?'감독과 편집 방향을 협의해 주세요':'감독의 편집 동의가 도착했습니다',text:quote.message});
 return quote;
}
export function resolveRuntimeEdit(s,id,mode) {
 const f=s.films.find(f=>f.id===id),quote=f?.pendingEdit;
 if(!f||f.company!=='c0'||!quote)throw Error('결정할 편집 협의가 없습니다.');
 if(!['production','reshoot'].includes(f.status)||f.productionCycles.length!==quote.cycle||f.productionCycles.at(-1).completed!=null)throw Error('편집 가능한 제작 단계가 아닙니다.');
 const outcome=RT.editOutcome(quote,mode),c=player(s);
 if(outcome.cost>0&&outcome.cost>c.cash)throw Error('편집비가 부족합니다. 원안을 유지하거나 자금을 확보해 주세요.');
 if(outcome.applied&&(f.director!==quote.director||!person(s,f.director)||['retired','dead'].includes(person(s,f.director).status)))throw Error('감독의 활동 상태가 달라졌습니다. 원안을 유지하고 다시 협의해 주세요.');
 const beforeQuality=f.quality;
 if(outcome.applied){
  f.runtime=quote.to;f.runtimeQuality=RT.runtimeQuality(f);f.quality=clamp(f.quality+outcome.quality,20,99);f.spent=round(f.spent+outcome.cost);
  adjust(s,f.director,f.company,outcome.affinity,outcome.label);
  f.reviews=[];f.viewerReviews=[];delete f.audienceReception;f.audienceScore=null;
  transaction(s,c,-outcome.cost,`「${f.title}」 ${outcome.label} · ${quote.from}→${quote.to}분`,'editing',f.id);
 }
 const entry={...quote,...outcome,quality:f.quality-beforeQuality,week:weekOf(s),month:s.month};
 f.editHistory.push(entry);f.pendingEdit=null;
 f.businessHistory.push({week:weekOf(s),month:s.month,text:`${entry.label}: ${entry.from}→${entry.applied?entry.to:entry.from}분 · ${money(entry.cost)} · 품질 ${entry.quality>=0?'+':''}${entry.quality} · 감독 친밀도 ${entry.affinity>=0?'+':''}${entry.affinity}`});
 log(s,'러닝타임 편집 결과',f.businessHistory.at(-1).text,'production',f.id);
 notify(s,{key:`${f.id}:edit-result:${f.editHistory.length}`,type:'editing',filmId:f.id,action:'film',title:`${f.title} · ${entry.label}`,text:`${RT.runtimeOf(f)}분 · 1개 스크린 하루 ${RT.dailyShows(f)}회 모형. 편집비 ${money(entry.cost)}, 품질 ${entry.quality>=0?'+':''}${entry.quality}.`});
 return entry;
}
