/** v1.5 studio expansion. All amounts are fictional game units (100M KRW).
 * No browser objects or functions are ever stored in the saved game.
 * Read-only quotes are deterministic; accepting a contract is the only debit path.
 */
import {modernFilm,splitProjectReceipt,dealFactor} from './economy.js';
import {GENRE, SCALE} from './data.js';
import {person, people, eligible, available, hash} from './career.js';
import {weekOf, notify} from './clock.js';
import {runtimeOf, idealRuntime} from './runtime.js';
import {makeCriticReviews, criticScore} from './cinema.js';
import {adjust} from './relationships.js';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const copy=x=>JSON.parse(JSON.stringify(x));
const owner=s=>s.companies[0];
const rand=(s,key)=>hash(`${s.seed}:${key}`)/4294967296;
const WORKING=['production','reshoot'];
const currentCrew=f=>[f.script.writer,f.director,...f.leads,...f.supports,...(f.cameos??[])];
const reservesCrew=f=>WORKING.includes(f.status)||(f.screening?.status==='editing'&&f.screening.decision?.id==='reshoot');
const busy=(s,id)=>s.films.some(f=>reservesCrew(f)&&currentCrew(f).includes(id));
const privateFilm=(s,id)=>{const f=s.films.find(f=>f.id===id);if(!f||f.company!=='c0')throw Error('우리 제작사의 작품을 선택해 주세요.');return f;};
function cash(s,amount,description,kind='expense',filmId){amount=round(amount);owner(s).cash=round(owner(s).cash+amount);s.ledger.unshift({id:++s.ledgerCounter,week:weekOf(s),month:s.month,amount,description,kind,filmId});}
function afford(s,amount){if(amount>0&&owner(s).cash<amount)throw Error(`필요한 자금 ${amount.toFixed(2)}억 원이 부족합니다.`);}
function note(s,f,title,text,suffix){notify(s,{key:`growth:${f?.id??'company'}:${suffix}`,type:'studio',filmId:f?.id,action:f?'film':undefined,title,text});if(f){f.businessHistory??=[];f.businessHistory.push({week:weekOf(s),month:s.month,text:`${title} · ${text}`});}}
export function initGrowth(s){
 if(!s)return null;
 const g=s.studioGrowth??={version:1,favorites:[],teams:[],drafts:[],facilities:{},counter:0,lastWeek:weekOf(s)};
 g.favorites??=[];g.teams??=[];g.drafts??=[];g.facilities??={};g.counter??=0;
 owner(s).totalForeignReceipts??=0;
 return g;
}
export function toggleFavorite(s,id){if(!person(s,id))throw Error('인물을 찾을 수 없습니다.');const g=initGrowth(s),i=g.favorites.indexOf(id);if(i<0)g.favorites.push(id);else g.favorites.splice(i,1);return i<0;}
export function saveTeam(s,d,name){
 if(!d?.director||d.leads?.filter(Boolean).length!==2||d.supports?.filter(Boolean).length!==4)throw Error('감독 1명·주연 2명·조연 4명을 먼저 골라 주세요.');
 const g=initGrowth(s);if(g.teams.length>=12)throw Error('제작팀은 12개까지 저장합니다. 사용하지 않는 팀을 먼저 삭제해 주세요.');
 const team={id:`team${++g.counter}`,name:String(name||d.title+' 팀').trim().slice(0,32),director:d.director,leads:[...d.leads],supports:[...d.supports],week:weekOf(s)};
 g.teams.push(team);return team;
}
export function loadTeam(s,d,id){
 const t=initGrowth(s).teams.find(t=>t.id===id);if(!t||!d?.script)throw Error('저장한 팀과 기획할 시나리오를 선택해 주세요.');
 const next=copy(d),used=new Set([d.script.writer]),missing=[];
 const choose=(id,role)=>{const p=person(s,id);if(!p||p.role!==role||!eligible(s,p,d.genres)||busy(s,id)||used.has(id)){missing.push(p?.name??'이전 인물');return null;}used.add(id);return id;};
 next.director=choose(t.director,'director');next.leads=t.leads.map(id=>choose(id,'lead'));next.supports=t.supports.map(id=>choose(id,'support'));next.castingAgreements={};next.requireNegotiation=true;
 return {draft:next,missing};
}
export function archiveDraft(s,d,step=0,{automatic=false}={}){
 if(!d?.script?.id)return null;
 const g=initGrowth(s);
 if(!automatic&&g.drafts.filter(x=>x.id!=='auto-draft').length>=8)throw Error('기획 보관함은 직접 저장 8개까지 가능합니다. 이전 기획을 삭제해 주세요.');
 const id=automatic?'auto-draft':`draft${++g.counter}`;
 const item={id,title:String(d.title||d.script.title).slice(0,40),week:weekOf(s),step:clamp(Number(step)||0,0,2),draft:copy(d)};
 const at=g.drafts.findIndex(x=>x.id===id);if(at>=0)g.drafts[at]=item;else g.drafts.unshift(item);return item;
}
export function restoreDraft(s,id){
 const x=initGrowth(s).drafts.find(x=>x.id===id);if(!x)throw Error('보관한 기획을 찾지 못했습니다.');
 const d=copy(x.draft);if(s.films.some(f=>f.company==='c0'&&f.script.id===d.script.id))throw Error('이미 제작을 시작한 기획입니다. 새 시나리오를 선택해 주세요.');
 const p=person(s,d.script.writer);if(!p||!available(s,p))throw Error('원래 작가가 활동할 수 없어 이 기획을 복원할 수 없습니다.');
 if(!s.pitches.some(p=>p.id===d.script.id))s.pitches.unshift(copy(d.script));
 d.requireNegotiation=true;d.castingAgreements={}; // elapsed time can change every offer
 return {draft:d,step:0};
}
export function removeSaved(s,kind,id){if(!['teams','drafts'].includes(kind))throw Error('보관 종류를 확인해 주세요.');const g=initGrowth(s);g[kind]=g[kind].filter(x=>x.id!==id);}

export const FACILITIES=[
 {id:'editing',name:'편집실',description:'편집·색보정 환경을 갖춥니다. 새 작품 준비비 3% 절감 · 기간 1주 단축 · 품질 +1.',purchase:6,setup:.4,rent:.12,maintenance:.03,discount:.03,weeks:1,quality:1,genres:[]},
 {id:'sound',name:'사운드 스튜디오',description:'녹음·믹싱 외주를 줄입니다. 준비비 2% 절감 · 음악·액션·공포 장르 품질 +2 (그 외 +0.5).',purchase:9,setup:.6,rent:.18,maintenance:.05,discount:.02,weeks:0,quality:.5,genres:['music','musical','action','horror']},
 {id:'stage',name:'촬영 스튜디오',description:'자체 세트로 일정을 안정화합니다. 준비비 6% 절감 · 기간 3주 단축 · 품질 +0.5.',purchase:24,setup:1.2,rent:.38,maintenance:.12,discount:.06,weeks:3,quality:.5,genres:[]}
];
export function facilityMonthlyCost(s){return round(FACILITIES.reduce((a,f)=>{const mode=s?.studioGrowth?.facilities?.[f.id]?.mode;return a+(mode==='own'?f.maintenance:mode==='lease'?f.rent:0);},0));}
export function facilityQuote(s,id,mode){
 const spec=FACILITIES.find(x=>x.id===id),current=initGrowth(s).facilities[id];if(!spec||!['lease','own','remove'].includes(mode))throw Error('시설과 계약 방식을 확인해 주세요.');
 if(mode==='remove'&&!current)throw Error('운영 중인 시설이 아닙니다.');if(mode===current?.mode)throw Error('이미 같은 방식으로 운영 중입니다.');
 if(current?.mode==='own'&&mode!=='remove')throw Error('보유 시설은 먼저 처분해야 합니다.');
 return {id,mode,name:spec.name,cost:mode==='own'?spec.purchase:mode==='lease'?spec.setup:current.mode==='own'?-round(spec.purchase*.4):0,monthly:mode==='own'?spec.maintenance:mode==='lease'?spec.rent:0};
}
export function changeFacility(s,id,mode){const q=facilityQuote(s,id,mode);afford(s,q.cost);cash(s,-q.cost,`${q.name} · ${mode==='own'?'구입':mode==='lease'?'임대 개시':'운영 종료'}`,'facility');const g=initGrowth(s);if(mode==='remove')delete g.facilities[id];else g.facilities[id]={mode,week:weekOf(s)};return q;}
export function facilityEffect(s,d){
 if(d.company&&d.company!=='c0')return {discount:0,weeks:0,quality:0,names:[]};
 const active=FACILITIES.filter(f=>s?.studioGrowth?.facilities?.[f.id]);
 return {discount:clamp(active.reduce((a,f)=>a+f.discount,0),0,.12),weeks:Math.min(4,active.reduce((a,f)=>a+f.weeks,0)),quality:Math.min(4,active.reduce((a,f)=>a+(f.genres.some(g=>d.genres.includes(g))?2:f.quality),0)),names:active.map(f=>f.name)};
}
export const INVESTORS=[
 {id:'seed',name:'첫빛 파트너스',funding:.25,share:.15,rule:'개봉·OTT 공개 기한: 예정 완료 후 12주. 추가 캐스팅 조건 없음.',grace:12},
 {id:'star',name:'앵커 픽처스',funding:.40,share:.24,rule:'주연 1명 이상 인지도 55점 · 개봉·OTT 공개 기한: 예정 완료 후 8주.',grace:8,minStar:55},
 {id:'tempo',name:'템포 콘텐츠',funding:.55,share:.33,rule:'러닝타임 120분 이하 · 개봉·OTT 공개 기한: 예정 완료 후 6주.',grace:6,maxRuntime:120}
];
export function investorOffers(s,d,e){
 return INVESTORS.map(i=>{const issues=[];if(i.minStar&&!d.leads.some(id=>(person(s,id)?.star??0)>=i.minStar))issues.push('인지도 55점 이상 주연 필요');if(i.maxRuntime&&runtimeOf(d)>i.maxRuntime)issues.push('120분 이하 러닝타임 필요');
 return {...i,amount:round(e.total*i.funding),deadline:weekOf(s)+e.months*4+i.grace,issues,eligible:issues.length===0};});
}
export function adjustEstimate(s,d,e){
 if(!s||d.company&&d.company!=='c0')return {...e,cashNeeded:e.total,facilitySavings:0};
 const fx=facilityEffect(s,d),saving=round(Math.max(0,e.set-(d.script?.license?.fee??0))*fx.discount);
 const out={...e,set:round(e.set-saving),total:round(e.total-saving),facilitySavings:saving,facilitySnapshot:fx,months:Math.max(3,e.months-fx.weeks/4),quality:e.quality==null?null:Math.round(clamp(e.quality+fx.quality,20,97))};
 out.reserve=round(out.total*.16);out.finance=d.investorId?investorOffers(s,d,out).find(i=>i.id===d.investorId):null;
 out.cashNeeded=round(out.total-(out.finance?.eligible?out.finance.amount:0));return out;
}
export function validateFunding(s,d,e){if(d.investorId&&(!e.finance||!e.finance.eligible))throw Error('투자 계약 조건이 바뀌었습니다. 투자 제안을 다시 확인해 주세요.');}
export function attachProduction(s,d,f,e){
 initGrowth(s);f.facilitySnapshot=copy(e.facilitySnapshot??{names:[]});
 if(e.finance){const i=e.finance;f.investment={investor:i.id,name:i.name,amount:i.amount,share:i.share,originalShare:i.share,model:modernFilm(f)?'cost-recovery-v1':'legacy',funding:i.funding,principalRecovered:0,profitPaid:0,deadline:i.deadline,maxRuntime:i.maxRuntime??null,minStar:i.minStar??null,paid:0,late:false,startWeek:weekOf(s)};cash(s,i.amount,`「${f.title}」 ${i.name} 공동제작 투자금`,'investment',f.id);}
 if(d.script.seriesPlan){f.seriesPlan=copy(d.script.seriesPlan);f.seriesRoot=f.seriesPlan.root;f.episode=f.seriesPlan.sequence;f.seriesBoost=seriesForecast(s,d).factor;}
 initGrowth(s).drafts=initGrowth(s).drafts.filter(x=>x.draft?.script?.id!==d.script.id);
}
export function splitReceipt(s,f,amount){return splitProjectReceipt(s,f,amount);}

export const filmProfit=f=>round((f.receipts??0)+(f.investment?.amount??0)-(f.spent??0));
export function assertDistribution(s,f){
 if(f.screening&&['running','decision','editing'].includes(f.screening.status))throw Error('테스트 시사회와 후속 결정을 완료한 뒤 배급할 수 있습니다.');
 if((f.festivalEntries??[]).some(x=>x.status==='submitted'&&x.premiere))throw Error('영화제 선공개 약정이 있습니다. 결과를 기다리거나 출품을 취소해 주세요.');
 if(f.investment?.maxRuntime&&runtimeOf(f)>f.investment.maxRuntime)throw Error('투자 계약의 러닝타임 조건을 충족해야 합니다. 후반 편집에서 조정해 주세요.');
}

export function screeningAvailable(f){return !!f&&f.company==='c0'&&!f.screening&&f.releaseMonth==null&&!f.ott&&!f.pendingEdit&&(!f.festivalEntries?.some(x=>x.status==='submitted'))&&(f.status==='ready'||f.status==='shelved'||f.status==='production'&&(f.elapsedWeeks??f.elapsed*4)>=Math.ceil(f.months*4*.7));}
export const screeningFee=f=>({small:.35,medium:.65,large:1.0}[f.scale]);
export function startScreening(s,id){
 const f=privateFilm(s,id);if(!screeningAvailable(f))throw Error('후반작업 70% 이후·미개봉 작품에 시사회를 한 번 열 수 있습니다. 편집·영화제 협의도 먼저 마쳐 주세요.');
 const cost=screeningFee(f);afford(s,cost);cash(s,-cost,`「${f.title}」 테스트 시사회`,'screening',id);f.spent=round(f.spent+cost);
 const long=runtimeOf(f)>idealRuntime(f),n=hash(f.id+':screening:'+s.seed);
 const concern=long?'pace':n%2?'clarity':'character';
 f.screening={status:'running',startWeek:weekOf(s),dueWeek:weekOf(s)+1,cost,concern,groups:[
  {name:'장르 애호 관객',score:Math.round(clamp(f.quality-13+(n%19),20,91)),text:concern==='character'?'주변 인물의 선택에 조금 더 설득력이 필요합니다.':'장르의 약속을 지키는 장면이 강점입니다. 과한 설명은 줄여도 좋겠습니다.'},
  {name:'일반 관람층',score:Math.round(clamp(f.quality-20+(n%23),18,89)),text:long?'중반부가 길게 느껴집니다. 핵심 장면은 유지하고 반복을 줄여 보세요.':'초반 인물 소개가 선명해지면 결말까지 더 편하게 따라갈 것 같습니다.'},
  {name:'이야기 중심 관객',score:Math.round(clamp(f.quality-9+(n%13),25,93)),text:concern==='clarity'?'마지막 선택의 이유를 이어 주는 장면이 부족합니다.':'배우의 호흡이 좋습니다. 결말의 여운을 지나치게 설명하지 않기를 바랍니다.'}
 ]};
 return f.screening;
}
export function screeningOptions(s,f){
 if(f.screening?.status!=='decision')return [];
 const fee=round(Math.max(.4,f.budget*.012)),repair=round(Math.max(.8,f.budget*.035));
 const rows=[{id:'keep',name:'원안 유지',cost:0,weeks:0,quality:0,affinity:1,description:'시사회는 참고 자료입니다. 감독의 원안을 유지합니다.'},
 {id:'recut',name:'재편집',cost:fee,weeks:1,quality:f.screening.concern==='pace'?3:1,affinity:-1,description:'중복 장면을 정돈합니다. 러닝타임 등급은 유지하며 감독 친밀도 -1.'},
 {id:'reshoot',name:'보완 촬영',cost:repair,weeks:2,quality:f.screening.concern==='pace'?-1:3,affinity:1,description:'감독·출연진 일정이 필요합니다. 설명·감정 연결을 보완하며 친밀도 +1.'}];
 return rows.map(x=>({...x,unavailable:x.id==='reshoot'&&currentCrew(f).some(id=>!available(s,person(s,id))||s.films.some(o=>o.id!==f.id&&reservesCrew(o)&&currentCrew(o).includes(id)))}));
}
export function decideScreening(s,id,choice){
 const f=privateFilm(s,id),q=screeningOptions(s,f).find(x=>x.id===choice);if(!q)throw Error('시사회 결과를 확인한 뒤 결정해 주세요.');if(q.id==='reshoot'&&!WORKING.includes(f.status)&&s.films.filter(o=>o.company==='c0'&&(WORKING.includes(o.status)||o.screening?.status==='editing')).length>=3)throw Error('보완 촬영을 위한 제작 슬롯이 필요합니다.');if(q.unavailable)throw Error('보완 촬영 제작진의 일정이 겹칩니다. 다른 대안을 선택해 주세요.');afford(s,q.cost);
 if(q.cost){cash(s,-q.cost,`「${f.title}」 시사회 후 ${q.name}`,'screening',id);f.spent=round(f.spent+q.cost);}
 f.screening.decision={...q,week:weekOf(s)};
 if(q.weeks){if(WORKING.includes(f.status))f.screeningDelayWeeks=(f.screeningDelayWeeks??0)+q.weeks;f.screening.status='editing';f.screening.dueWeek=weekOf(s)+q.weeks;}
 else f.screening.status='done';
 adjust(s,f.director,f.company,q.affinity,'시사회 후 '+q.name);return q;
}
export const screeningCrewBusy=(s,id,except)=>s.films.find(f=>f.id!==except&&f.screening?.status==='editing'&&f.screening.decision?.id==='reshoot'&&currentCrew(f).includes(id));
export function screeningHold(f){return f.screening?.status==='editing';}

export const TERRITORIES=[
 {id:'east',name:'동아시아 배급권',company:'하버 배급',genres:['drama','romance','animation','action'],base:1.12,localization:.45},
 {id:'europe',name:'유럽 배급권',company:'루멘 필름즈',genres:['drama','mystery','documentary','history'],base:.96,localization:.6},
 {id:'north',name:'북미 배급권',company:'노스윈드 스크린',genres:['sf','action','horror','fantasy'],base:1.22,localization:.8},
 {id:'latin',name:'중남미 배급권',company:'솔라 시네마',genres:['family','comedy','music','musical'],base:.82,localization:.42},
 {id:'ocean',name:'오세아니아 배급권',company:'코스트 리일',genres:['adventure','sports','family','documentary'],base:.65,localization:.3}
];
export function foreignOffers(s,f){return TERRITORIES.map(t=>{
 const fit=f.genres.some(g=>t.genres.includes(g))?1.18:.88,review=.52+(criticScore(f)??f.quality)/110;
 const size={small:4,medium:11,large:23}[f.scale],award=1+Math.min(.18,(f.festivalEntries??[]).filter(e=>['selected','winner'].includes(e.status)).length*.06);
 const upfront=round(size*t.base*fit*review*award*dealFactor(f)),localization=round(t.localization*runtimeOf(f)/120*({small:.8,medium:1,large:1.3}[f.scale]));
 return {...t,upfront,localization,projected:round(upfront*1.45),sold:!!f.foreignDeals?.some(d=>d.territory===t.id)};
});}
export function signForeign(s,id,territory,mode){
 const f=privateFilm(s,id);if(!['ready','shelved','showing','closed'].includes(f.status)||f.ott)throw Error('글로벌 OTT 독점작이 아닌 완성작만 해외 배급할 수 있습니다.');assertDistribution(s,f);
 const q=foreignOffers(s,f).find(x=>x.id===territory);if(!q||q.sold||!['fixed','share'].includes(mode))throw Error('계약 가능한 지역과 방식을 선택해 주세요.');afford(s,q.localization);
 const deal={territory,company:q.company,mode,week:weekOf(s),localization:q.localization,upfront:q.upfront,projected:q.projected,runs:[],receipts:0,status:mode==='fixed'?'complete':'active',totalWeeks:8};
 f.foreignDeals??=[];f.foreignDeals.push(deal);cash(s,-q.localization,`「${f.title}」 ${q.name} 자막·더빙`,'localization',id);f.spent=round(f.spent+q.localization);
 if(mode==='fixed')foreignReceipt(s,f,deal,q.upfront);
 note(s,f,'해외 배급 계약',`${q.name} · ${mode==='fixed'?'일시금 '+q.upfront+'억':'8주 수익 배분 (예상액은 보장되지 않습니다)'} · 현지화 ${q.localization}억. 국내 관객에는 합산하지 않습니다.`,territory+':contract');return deal;
}
function foreignReceipt(s,f,deal,gross){
 const royalty=round(gross*(f.script.license?.share??0)),beforeInvestor=round(gross-royalty),net=splitReceipt(s,f,beforeInvestor);
 f.royalties=round((f.royalties??0)+royalty);f.receipts=round(f.receipts+net);owner(s).totalReceipts=round(owner(s).totalReceipts+net);owner(s).totalForeignReceipts=round(owner(s).totalForeignReceipts+net);deal.receipts=round(deal.receipts+net);
 deal.runs.push({week:weekOf(s),gross,royalty,investorShare:round(beforeInvestor-net),receipts:net});cash(s,net,`「${f.title}」 ${deal.company} 해외 정산`,'foreign',f.id);
}

export const SERIES_TYPES=[['sequel','속편','그 이후의 이야기'],['prequel','프리퀄','모든 선택의 시작'],['spinoff','스핀오프','또 다른 주인공'],['reboot','리부트','새로운 해석']];
export function seriesGroups(s){
 const released=s.films.filter(f=>f.company==='c0'),groups=new Map();
 for(const f of released){const root=f.seriesPlan?.root??f.seriesRoot??f.id;if(!groups.has(root))groups.set(root,[]);groups.get(root).push(f);}
 return [...groups].map(([root,films])=>({root,title:s.films.find(f=>f.id===root)?.title??films[0].title,films,fans:Math.round(films.reduce((n,f)=>n+(f.audience??0)*.08+(f.ott?.availableReviews?Math.max(0,f.audienceScore??f.quality)*500:0),0)),recent:films.filter(f=>weekOf(s)-(f.startWeek??f.start*4)<48).length}));
}
export function createSeriesPitch(s,id,type){
 const f=privateFilm(s,id),spec=SERIES_TYPES.find(x=>x[0]===type);if(!spec||f.releaseMonth==null&&!f.ott)throw Error('극장 또는 OTT에 공개한 작품에서 새 시리즈를 기획할 수 있습니다.');
 if(s.pitches.some(p=>p.seriesPlan?.parent===id&&p.seriesPlan.type===type))throw Error('이미 같은 시리즈 제안이 도착해 있습니다. 시나리오 제안을 확인해 주세요.');
 const writer=[person(s,f.script.writer),...people(s).filter(p=>p.role==='writer'&&p.genres.includes(f.genres[0]))].find(p=>p&&available(s,p)&&!busy(s,p.id));if(!writer)throw Error('각색을 맡을 수 있는 작가가 없습니다.');
 const root=f.seriesPlan?.root??f.seriesRoot??f.id,sequence=s.films.filter(o=>(o.seriesPlan?.root??o.seriesRoot??o.id)===root).length+1;
 const plot={sequel:'이전 사건을 겪은 인물들은 달라진 일상으로 돌아오지만, 과거에 미뤄 둔 약속이 새로운 갈등을 만든다. 서로 다른 선택을 존중하는 법을 배우며 다음 장을 연다.',prequel:'본편의 인물들이 아직 서로를 알지 못하던 시절, 작은 약속 하나가 이들의 미래를 연결한다. 현재의 갈등이 시작된 계기를 따라가며 익숙한 관계를 새롭게 바라본다.',spinoff:'본편에서 조용히 조력하던 인물이 자신의 목표를 찾아 길을 나선다. 같은 세계의 다른 장소에서 새 동료와 마주하고, 남을 돕는 역할을 넘어 스스로 결정을 내린다.',reboot:'핵심 주제는 남기되 인물의 배경과 만남을 새롭게 구성한다. 다른 시대를 살아가는 주인공들이 같은 질문 앞에서 전혀 다른 답을 선택하며 독립적인 결말을 만든다.'}[type];
 const title=(f.script.original??f.title).slice(0,16)+' · '+spec[2];const p={...copy(f.script),id:`s${++s.pitchCounter}`,writer:writer.id,title,original:title,synopsis:plot,quality:Math.round(clamp(writer.skill*.75+14,35,92)),fee:round(writer.fee*1.5),month:s.month,seriesPlan:{root,parent:id,type,sequence}};
 delete p.sequelOf;delete p.episode;delete p.seriesRoot;s.pitches.unshift(p);s.pitches=s.pitches.slice(0,12);return p;
}
export function seriesForecast(s,d){
 const plan=d.script?.seriesPlan;if(!plan)return {factor:1,fans:0,fatigue:0,continuity:0};
 const group=seriesGroups(s).find(g=>g.root===plan.root),parent=s.films.find(f=>f.id===plan.parent);if(!group||!parent)return {factor:1,fans:0,fatigue:0,continuity:0};
 const fatigue=Math.min(.15,Math.max(0,group.recent-1)*.05),sameDirector=d.director===parent.director,returning=(d.leads??[]).filter(id=>parent.leads.includes(id)).length;
 const continuity=plan.type==='reboot'?-.025:((sameDirector?.025:-.015)+(returning===2?.035:returning===0?-.03:0));
 const fans=Math.min(.14,group.fans/2500000*.14);return {factor:round(clamp(1+fans-fatigue+continuity,.8,1.2)),fans:group.fans,fatigue,continuity};
}

export const FESTIVALS=[
 {id:'spring',name:'새봄 작가영화제',week:12,fee:.25,premiere:true,genres:['drama','history','documentary'],description:'작가적 시선을 중시합니다. 영화제 결과까지 극장·OTT·해외 선공개 제한.'},
 {id:'midnight',name:'달빛 장르영화제',week:24,fee:.18,premiere:false,genres:['horror','mystery','sf','thriller','fantasy'],description:'장르의 개성과 관객 몰입을 심사합니다. 선공개 제한 없음.'},
 {id:'first',name:'첫장면 신인영화제',week:36,fee:.12,premiere:true,debut:true,genres:[],description:'감독의 다른 공개작 2편 이하. 결과까지 극장·OTT·해외 선공개 제한.'},
 {id:'horizon',name:'수평선 국제영화제',week:44,fee:.35,premiere:false,genres:['adventure','drama','animation'],description:'문화권을 넘어 전달되는 이야기와 완성도를 심사합니다.'}
];
export function festivalOpportunities(s,f){return FESTIVALS.map(t=>{
 const now=weekOf(s),year=Math.floor(now/48),due=year*48+t.week,actual=due<=now?due+48:due,key=`${t.id}:${Math.floor(actual/48)}`,issues=[];
 if(now<actual-8)issues.push('접수 시작: '+(actual-8)+'주차');
 if(!f||!['ready','shelved','showing','closed','streaming'].includes(f.status))issues.push('완성된 작품 필요');
 if(f?.screening&&f.screening.status!=='done')issues.push('시사회·편집 완료 필요');
 if(f?.festivalEntries?.some(e=>e.key===key))issues.push('이 회차 출품 기록 있음');
 if(t.premiere&&(f?.releaseMonth!=null||f?.ott||f?.foreignDeals?.length||f?.festivalPremiere))issues.push('미공개작만 접수');
 if(t.premiere&&f?.festivalEntries?.some(e=>e.status==='submitted'&&e.premiere))issues.push('다른 선공개 약정 진행 중');
 if(t.debut&&s.films.filter(o=>o.id!==f?.id&&o.director===f?.director&&(o.releaseMonth!=null||o.ott)).length>2)issues.push('감독 신인 자격 없음');
 return {...t,key,dueWeek:actual,openWeek:actual-8,issues,eligible:issues.length===0};
});}
export function submitFestival(s,id,festivalId){
 const f=privateFilm(s,id),q=festivalOpportunities(s,f).find(x=>x.id===festivalId);if(!q?.eligible)throw Error(q?.issues.join(' · ')||'출품할 영화제를 선택해 주세요.');afford(s,q.fee);
 cash(s,-q.fee,`「${f.title}」 ${q.name} 출품`,'festival',id);f.spent=round(f.spent+q.fee);f.festivalEntries??=[];const entry={key:q.key,id:q.id,name:q.name,dueWeek:q.dueWeek,premiere:q.premiere,fee:q.fee,status:'submitted',week:weekOf(s)};f.festivalEntries.push(entry);return entry;
}
export function withdrawFestival(s,id,key){const f=privateFilm(s,id),x=f.festivalEntries?.find(x=>x.key===key&&x.status==='submitted');if(!x)throw Error('취소할 출품이 없습니다.');x.status='withdrawn';x.resultWeek=weekOf(s);return x;}
export function tickGrowth(s){
 const g=initGrowth(s),week=weekOf(s);if(g.lastWeek===week)return;g.lastWeek=week;
 for(const f of s.films.filter(f=>f.company==='c0')){
  const test=f.screening;
  if(test?.status==='running'&&test.dueWeek<=week){test.status='decision';note(s,f,'테스트 시사회 의견 도착','관객층별 반응을 보고 원안 유지·재편집·보완 촬영을 결정해 주세요.','screening-feedback');}
  if(test?.status==='editing'&&test.dueWeek<=week){const before=f.quality;f.quality=clamp(f.quality+test.decision.quality,20,97);test.appliedQuality=f.quality-before;test.status='done';test.finishedWeek=week;if(['ready','shelved'].includes(f.status))makeCriticReviews(f);note(s,f,'시사회 후 보완 완료',`${test.decision.name} · 품질 ${test.appliedQuality>=0?'+':''}${test.appliedQuality}. 공개 전 최종 상태를 확인하세요.`,'screening-complete');}
  if(f.investment&&!f.investment.late&&f.releaseMonth==null&&!f.ott&&week>f.investment.deadline){f.investment.late=true;f.investment.share=round(Math.min(.75,f.investment.share+.05));note(s,f,'공동제작 공개 기한 경과','사전에 약정한 대로 투자사의 수익 배분이 5%p 증가했습니다. 추가 현금 차감은 없습니다.','investment-late');}
  for(const deal of f.foreignDeals??[])if(deal.status==='active'&&week>deal.week&&deal.runs.length<8){
   const n=deal.runs.length,variation=.65+rand(s,`${f.id}:${deal.territory}:foreign-result`)*.75;
   const amount=round(deal.projected*variation*[.23,.20,.16,.13,.10,.08,.06,.04][n]);foreignReceipt(s,f,deal,amount);
   if(deal.runs.length===8)deal.status='complete';note(s,f,deal.status==='complete'?'해외 배급 정산 완료':'해외 배급 주간 정산',`${deal.company} ${n+1}/8주 · 이번 실수령 ${deal.runs.at(-1).receipts}억 · 누적 ${deal.receipts}억. 국내 성과와 별도 집계.`,deal.territory+':'+n);
  }
  for(const entry of f.festivalEntries??[])if(entry.status==='submitted'&&entry.dueWeek<=week){
   const spec=FESTIVALS.find(x=>x.id===entry.id),fit=spec.genres.some(g=>f.genres.includes(g))?7:0,score=(criticScore(f)??f.quality)*.62+f.quality*.38+fit+(rand(s,`${f.id}:${entry.key}`)-.5)*25;
   entry.status=score>=87?'winner':score>=70?'selected':'not-selected';entry.resultWeek=week;entry.score=Math.round(score);
   if(entry.premiere&&entry.status!=='not-selected')f.festivalPremiere=true;
   if(entry.status!=='not-selected'){owner(s).reputation=clamp(owner(s).reputation+(entry.status==='winner'?4:1),0,100);if(entry.status==='winner'){owner(s).trophies++;f.awards.push({year:2026+Math.floor(week/48),category:entry.name+' 작품상'});}}
   note(s,f,`${entry.name} · ${{winner:'작품상',selected:'공식 선정','not-selected':'미선정'}[entry.status]}`,entry.status==='winner'?'트로피와 제작사 명성이 상승했습니다. 해외 제안에서 영화제 이력이 반영됩니다.':entry.status==='selected'?'공식 선정으로 명성이 상승했습니다. 선공개 약정이 해제되었습니다.':'이번 심사에서는 선정되지 않았습니다. 선공개 약정이 해제되었습니다.',entry.key+':result');
  }
 }
}
