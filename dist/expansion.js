import {EXTRA_IPS} from './content-v14.js';
import {licenseOffers} from './license-offers.js';
import {sourceInfo} from './source-rights.js';
import {recordFinance} from './finance-history.js';
import {weekOf, notify} from './clock.js';
import {AGENCIES,affinity,adjust,mediaTerms} from './relationships.js';
import * as E from './engine.js';
import {hash,invalidateCareer} from './career.js';
export const LOGOS=['◈','◉','✦','▰','◎','◇','✳','▥'];
export const TRAITS=['아이돌 출신','연기파','화면 장악력','즉흥 연기','액션 전문','목소리 연기','섬세한 표현','홍보 소통형'];
export const trait=p=>TRAITS[hash(p.id+'trait')%TRAITS.length];
export const portrait=p=>({stage:p.age<18?0:p.age<40?1:p.age<65?2:3,row:hash(p.imageKey??p.slot??p.id)%4,gender:p.gender==='F'?'F':'M'});
export const IPS=[['animation','애니','별을 배달하는 고양이','animation',4,.09],['animation','애니','구름 위 우체국','family',3,.07],['comic','만화','지하철 탐정단','mystery',5,.1],['comic','만화','월요일의 용사','comedy',4,.08],['novel','소설','마지막 서점의 불빛','drama',2,.05],['novel','소설','비가 멈추는 정거장','romance',3,.06],['game','게임','궤도 밖의 도시','sf',8,.12],['game','게임','잊힌 왕국의 지도','fantasy',7,.11]].map((a,i)=>sourceInfo({id:'ip'+i,medium:a[1],title:a[2],genre:a[3],fee:a[4],share:a[5]}));
IPS.push(...EXTRA_IPS);
export const currentLicenses=s=>licenseOffers(s,IPS);
export const CAMPAIGNS=[{id:'magazine',name:'잡지',cost:.7,base:5},{id:'press',name:'기자 인터뷰',cost:1,base:7},{id:'youtube',name:'유튜브',cost:1.4,base:10},{id:'tv',name:'방송',cost:2.4,base:13},{id:'goods',name:'굿즈 생산',cost:2,base:8}];
export const TONES=['작품과 제작 과정 중심','출연진의 솔직한 대화','팬 참여와 세계관 중심'];
export function initFilm(s,f){f.promotions??=[];f.cameos??=[];f.businessHistory??=[];f.publicity??=0;f.royalties??=0;f.poster??=null;f.contracts??=Object.fromEntries(E.crewIds(f).map(id=>[id,{paid:id===f.script.writer?E.round(f.script.fee*E.contractQuote(s,E.person(s,id),E.crewIds(f),f.company).chemistryFactor*E.contractQuote(s,E.person(s,id),E.crewIds(f),f.company).relationshipFactor):E.round(E.contractQuote(s,E.person(s,id),E.crewIds(f),f.company).fee*({small:.75,medium:1,large:1.35}[f.scale])),settled:false}]));}
function debit(s,f,cost,label){const c=s.companies.find(c=>c.id===f.company);if(cost>c.cash&&cost>0)throw Error('자금이 부족합니다. 은행에서 자금을 확보해 주세요.');c.cash=E.round(c.cash-cost);f.spent=E.round(f.spent+cost);if(c.id==='c0')s.ledger.unshift({id:++s.ledgerCounter,month:s.month,week:weekOf(s),amount:-cost,description:`「${f.title}」 ${label}`,kind:'event',filmId:f.id});if(c.id==='c0')recordFinance(s,label);}
function note(s,f,text){f.businessHistory.push({month:s.month,week:weekOf(s),text});if(f.company==='c0')s.messages.unshift({id:++s.messageCounter,month:s.month,week:weekOf(s),title:'제작·홍보 소식',text,kind:'news',filmId:f.id});s.messages=s.messages.slice(0,100);}
export function licensePitch(s,id){const ip=currentLicenses(s).find(x=>x.id===id);if(!ip)throw Error('현재 제안 중인 두 원작에서 선택해 주세요. 제안은 4주마다 교체됩니다.');const p=E.createPitch(s,undefined,ip.genre);p.title=ip.title;p.original=ip.title;p.synopsis=ip.synopsis;p.license={...ip};s.pitches.unshift(p);return p;}
export function promote(s,id,channel,tone,agencyId){const f=s.films.find(x=>x.id===id),method=CAMPAIGNS.find(x=>x.id===channel);if(!f||f.company!=='c0'||!['production','ready','reshoot','shelved'].includes(f.status)||!method||![0,1,2].includes(tone))throw Error('개봉 전 작품과 홍보 방식을 선택해 주세요.');initFilm(s,f);if(f.promotions.some(x=>x.channel===channel))throw Error('이미 진행한 홍보입니다.');const agency=AGENCIES.find(x=>x.id===agencyId&&x.channel===channel)??(!agencyId?AGENCIES.find(x=>x.channel===channel):null);if(!agency)throw Error('해당 매체의 기관을 선택해 주세요.');const terms=mediaTerms(s,f,agency,method.cost);const actors=f.leads.map(id=>E.person(s,id));const affinity=tone===0?(f.quality-60)/8:tone===1?(actors.reduce((n,p)=>n+p.coop,0)/2-60)/6:((f.script.license?5:0)+(f.genres.some(g=>['sf','fantasy','animation'].includes(g))?4:-2));const roll=hash(f.id+channel+s.seed)%11-5+(actors.some(p=>trait(p)==='아이돌 출신')&&['youtube','tv','goods'].includes(channel)?3:0)+(actors.some(p=>trait(p)==='홍보 소통형')?2:0);const effect=Math.round(method.base+affinity+roll+terms.bonus+(f.publicity<0?-7:0));debit(s,f,terms.cost,agency.name+' 홍보');f.awareness=E.clamp(f.awareness+effect,0,80);const r={channel,tone,agency:agency.id,cost:terms.cost,effect,month:s.month};f.promotions.push(r);adjust(s,agency.id,f.company,effect>=0?4:-3,'홍보 협업');for(const id of f.leads)adjust(s,agency.id,id,effect>=0?3:-2,'홍보 출연');note(s,f,`${agency.name} (${method.name}) · ${TONES[tone]}: 인지도 ${effect>=0?'+':''}${effect}. ${effect<0?'반응이 기대에 미치지 못했습니다.':'관객과의 접점이 생겼습니다.'} ${channel==='goods'?'굿즈는 홍보용 제작이며 판매 수익은 없습니다.':''}`);return r;}
export const posterAvailable=f=>['ready','shelved','showing','closed','streaming'].includes(f.status)||f.elapsed>=Math.ceil(f.months*.75);
export function selectPoster(s,id,index){const f=s.films.find(x=>x.id===id);if(!f||f.company!=='c0'||!posterAvailable(f)||['showing','closed','streaming'].includes(f.status)||!Number.isInteger(index)||index<0||index>11)throw Error('제작 후반부터 개봉 전까지 포스터를 선택할 수 있습니다.');f.poster=index;}
export function cameoCandidates(s,f){return E.people(s).filter(p=>['lead','support'].includes(p.role)&&E.eligible(s,p,f.genres)&&!E.busyFilm(s,p.id)&&!E.crewIds(f).includes(p.id)).map(p=>({p,friend:[f.director,...f.leads,...f.supports].map(id=>({id,score:affinity(s,id,p.id)})).sort((a,b)=>b.score-a.score)[0]})).filter(x=>x.friend.score>=78).sort((a,b)=>b.friend.score-a.friend.score).slice(0,6);}
export function inviteCameo(s,id,pid){const f=s.films.find(x=>x.id===id);if(!f||f.company!=='c0'||f.status!=='production')throw Error('촬영 중에만 카메오를 초청할 수 있습니다.');initFilm(s,f);if(f.cameoAttempted)throw Error('작품당 카메오 초청은 한 번입니다.');const x=cameoCandidates(s,f).find(x=>x.p.id===pid);if(!x)throw Error('호감 관계와 촬영 일정을 확인해 주세요.');f.cameoAttempted=true;adjust(s,x.friend.id,pid,2,'카메오 초청');const accepted=hash(f.id+pid+s.seed)%100<x.friend.score; if(accepted){f.cameos.push(pid);f.castSnapshot[pid]={...x.p};f.quality=E.clamp(f.quality+2,20,99);f.awareness+=3;invalidateCareer(s);}note(s,f,`${E.person(s,x.friend.id).name}의 초청에 ${x.p.name} 님이 ${accepted?'무료 카메오 출연을 수락했습니다. 품질 +2 · 인지도 +3.':'일정상 부담으로 정중히 사양했습니다. 비용은 없습니다.'}`);return accepted;}
export function replacement(s,f,id){const p=E.person(s,id);return E.people(s).filter(x=>x.role===p.role&&x.gender===p.gender&&E.eligible(s,x,f.genres)&&!E.busyFilm(s,x.id)&&!E.crewIds(f).includes(x.id)).sort((a,b)=>E.genreFit(b,f.genres)-E.genreFit(a,f.genres)||b.skill-a.skill)[0];}
export function swapCrew(s,f,id,fault){initFilm(s,f);const old=E.person(s,id),next=replacement(s,f,id);if(!next)throw Error('일정이 비는 대체 인물이 없습니다. 다른 선택지를 골라 주세요.');const contract=f.contracts[id];if(contract?.settled)throw Error('이미 정산한 계약입니다.');const refund=E.round((contract?.paid??0)*(fault?1:.25)),penalty=E.round((contract?.paid??0)*(fault?.3:-.25)),fee=E.round(E.contractQuote(s,next,E.crewIds(f),f.company).fee*({small:.75,medium:1,large:1.35}[f.scale]));debit(s,f,fee-refund-penalty,'하차 정산 및 대체 계약');adjust(s,id,f.company,fault?-15:-8,'하차 계약 정산');if(contract)Object.assign(contract,{settled:true,refund,penalty});f.contracts[next.id]={paid:fee,settled:false};f.pastCrew=[...new Set([...f.pastCrew,id])];if(f.director===id)f.director=next.id;f.leads=f.leads.map(x=>x===id?next.id:x);f.supports=f.supports.map(x=>x===id?next.id:x);f.castSnapshot[next.id]={...next};f.quality=E.clamp(f.quality-3,20,99);invalidateCareer(s);note(s,f,`${old.name} 하차 → ${next.name}. 출연료 반환 ${E.money(refund)}, ${penalty>=0?'위약금 수령':'제작사 보상금'} ${E.money(Math.abs(penalty))}, 새 계약 ${E.money(fee)}. 품질 -3.`);}
export function specialEvent(s,f,event,index){const type=event[3]?.type;if(!type)return;initFilm(s,f);const actor=f.leads.find(id=>E.person(s,id).age>=18)??f.director;const target=type==='director'?f.director:actor;
 if(['scandal','director','departure','fee'].includes(type)){if(index===1)swapCrew(s,f,target,type==='scandal'||type==='departure');else if(type==='scandal'){f.publicity-=index===0?18:28;note(s,f,`${event[0]}: 출연 유지에 따른 관객 반응 ${index===0?'-18':'-28'}%.`);}if(type==='fee'&&index===0){const extra=E.round((f.contracts[target]?.paid??0)*.3);debit(s,f,extra,'추가 개런티');f.contracts[target].paid=E.round(f.contracts[target].paid+extra);note(s,f,`추가 개런티 ${E.money(extra)} 지급.`);}}
 if(type==='rewrite')note(s,f,index===0?'작가와 시나리오를 전면 수정했습니다.':index===1?'배우·감독과 핵심 장면만 수정했습니다.':'원안을 유지했습니다.');
}
export function socialNews(s){const films=s.films.filter(f=>['production','ready','showing','reshoot','shelved'].includes(f.status));if(!films.length||hash(s.seed+'news'+s.month)%100>=42)return;const f=films[hash(s.seed+'film')%films.length];initFilm(s,f);const adults=E.crewIds(f).filter(id=>E.person(s,id).age>=18);if(!adults.length)return;const pid=adults[hash(s.seed+'person')%adults.length],p=E.person(s,pid);const events=[['알려지지 않은 선행',8],['꾸준한 봉사 소식',6],['결혼 발표',null],['열애설',null]];const [title,value]=events[hash(s.seed+'kind')%4];const effect=value??[-6,0,6][hash(s.seed+'reaction')%3];for(const work of films.filter(x=>E.credits(x).includes(pid))){initFilm(s,work);work.publicity=E.clamp(work.publicity+effect,-50,35);note(s,work,`${p.name} · ${title}: ${effect>0?'긍정':effect<0?'부정':'중립'} 반응, 관객 관심 ${effect>=0?'+':''}${effect}%.`);}}

export const promotionAvailable = f => ['ready','shelved'].includes(f.status) || (['production','reshoot'].includes(f.status) && (f.status === 'reshoot' ? f.reshootElapsed >= 9 : f.elapsed >= f.months * .75));
export function scanPromotionAvailability(s) {
  for (const f of E.myFilms(s)) if (promotionAvailable(f) && !f.promotionNoticeSent) {
    f.promotionNoticeSent = true;
    notify(s, { key: `${f.id}:promotion-available`, title: '이제 홍보를 시작할 수 있어요', text: `「${f.title}」 홍보가 열렸습니다. 홍보사 한 곳을 골라 캠페인을 시작해 보세요.`, filmId: f.id, type: 'promotion', action: 'business' });
  }
}
export function beginPromotion(s, id, agencyId, tone = 0) {
  const f = s.films.find(x => x.id === id), agency = AGENCIES.find(a => a.id === agencyId);
  if (!f || f.company !== 'c0' || !promotionAvailable(f)) throw Error('제작 75%부터 개봉 전까지 홍보할 수 있습니다.');
  if (!agency || ![0,1,2].includes(tone)) throw Error('홍보사 한 곳과 홍보 주제를 선택해 주세요.');
  initFilm(s, f);
  if (f.activePromotion) throw Error('한 번에 홍보사 한 곳과 진행할 수 있습니다. 다음 주 결과를 기다려 주세요.');
  if (f.promotions.some(x => x.channel === agency.channel)) throw Error('이 매체의 홍보는 이미 완료했습니다.');
  const method = CAMPAIGNS.find(x => x.id === agency.channel), terms = mediaTerms(s, f, agency, method.cost);
  const actors = f.leads.map(pid => E.person(s, pid));
  const topic = tone === 0 ? (f.quality - 60) / 8 : tone === 1 ? (actors.reduce((n,p)=>n+p.coop,0)/actors.length-60)/6 : ((f.script.license ? 5 : 0) + (f.genres.some(g=>['sf','fantasy','animation'].includes(g)) ? 4 : -2));
  const roll = hash(f.id + agency.id + weekOf(s) + s.seed) % 11 - 5 + (actors.some(p=>trait(p)==='아이돌 출신') && ['youtube','tv','goods'].includes(agency.channel) ? 3 : 0) + (actors.some(p=>trait(p)==='홍보 소통형') ? 2 : 0);
  const effect = Math.round(method.base + topic + roll + terms.bonus + (f.publicity < 0 ? -7 : 0));
  debit(s, f, terms.cost, agency.name + ' 홍보 계약');
  f.activePromotion = { agency: agency.id, channel: agency.channel, tone, cost: terms.cost, effect, week: weekOf(s), month: s.month, dueWeek: weekOf(s) + 1 };
  note(s, f, `${agency.name}와 홍보 시작 · ${E.money(terms.cost)} · 다음 주 결과 도착`);
  notify(s, { key: `${f.id}:promotion-start:${agency.channel}`, type: 'promotion', filmId: f.id, action: 'business', title: `${agency.name} · 홍보 시작`, text: `「${f.title}」 ${TONES[tone]}. ${E.money(terms.cost)} 집행 · 1주 뒤 결과를 알려 드립니다.` });
  return f.activePromotion;
}
export function resolvePromotions(s) {
  for (const f of s.films) {
    const plan = f.activePromotion;
    if (!plan || plan.dueWeek > weekOf(s)) continue;
    const agency = AGENCIES.find(a => a.id === plan.agency), before = f.awareness;
    f.awareness = E.clamp(f.awareness + plan.effect, 0, 80);
    const result = { ...plan, effect: f.awareness - before, rawEffect: plan.effect, week: weekOf(s), month: s.month };
    f.promotions.push(result); f.activePromotion = null;
    adjust(s, agency.id, f.company, result.effect >= 0 ? 4 : -3, '홍보 협업');
    for (const pid of f.leads) adjust(s, agency.id, pid, result.effect >= 0 ? 3 : -2, '홍보 출연');
    note(s, f, `${agency.name} 홍보 완료 · 인지도 ${result.effect >= 0 ? '+' : ''}${result.effect} (현재 ${f.awareness}/80)`);
    notify(s, { key: `${f.id}:promotion-result:${plan.channel}`, type: result.effect >= 0 ? 'success' : 'warning', filmId: f.id, action: 'film', title: `${agency.name} · 홍보 결과`, text: `「${f.title}」 인지도 ${result.effect >= 0 ? '+' : ''}${result.effect} → ${f.awareness}/80. 집행 비용 ${E.money(plan.cost)}.${plan.channel === 'goods' ? ' 굿즈는 홍보용이며 판매 수익은 없습니다.' : ''}` });
  }
}
