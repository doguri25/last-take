/** Runtime and editing rules: illustrative theatre capacity, not a real schedule forecast. */
export const RUNTIMES = [90,120,150,180];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export const runtimeOf=f=>RUNTIMES.includes(f?.runtime)?f.runtime:120;
export const dailyShows=f=>Math.floor(720/(runtimeOf(typeof f==='number'?{runtime:f}:f)+20));
export const capacityFactor=f=>dailyShows(f)/dailyShows(120);
export const runtimeCostFactor=f=>({90:.94,120:1,150:1.14,180:1.30}[runtimeOf(f)]);
export function idealRuntime(f) {
 if(RUNTIMES.includes(f?.script?.license?.runtime))return f.script.license.runtime;
 const gs=f?.genres??[f?.script?.genre];
 if(gs.some(g=>['history','fantasy','sf'].includes(g)))return 150;
 if(gs.some(g=>['animation','family','comedy'].includes(g))&&!gs.includes('drama'))return 90;
 return 120;
}
export function runtimeQuality(f,minutes=runtimeOf(f)) {return 2-Math.abs(RUNTIMES.indexOf(minutes)-RUNTIMES.indexOf(idealRuntime(f)))*3;}
export function initRuntime(f) {
 if(!RUNTIMES.includes(f.runtime)){f.runtime=120;f.runtimeLegacy=true;}
 f.plannedRuntime??=f.runtime;
 f.runtimeQuality??=runtimeQuality(f); // baseline only; do not modify legacy quality or receipts
 f.editHistory??=[];
}
export function editingAvailable(f) {
 const cycle=f?.productionCycles?.at(-1);
 return !!cycle&&['production','reshoot'].includes(f.status)&&cycle.crankUp!=null&&cycle.completed==null&&!f.pendingEdit&&!f.staffVacancy?.length&&!f.editHistory?.some(e=>e.cycle===f.productionCycles.length&&e.applied);
}
export function editQuote(s,f,minutes,director,affinity=50) {
 if(!RUNTIMES.includes(minutes))throw Error('러닝타임은 90·120·150·180분 중 선택해 주세요.');
 if(!editingAvailable(f)||f.pending!=null)throw Error('촬영 완료 후 후반작업 중에만 편집할 수 있습니다. 현장 결정도 먼저 완료해 주세요.');
 if(minutes===runtimeOf(f))throw Error('현재와 다른 러닝타임을 선택해 주세요.');
 const diff=minutes-runtimeOf(f),steps=Math.abs(diff)/30;
 const preferred=director?.personality==='완벽형'||director?.personality==='탐구형'?Math.min(180,idealRuntime(f)+30):idealRuntime(f);
 const tension=Math.abs(minutes-preferred)/30;
 const risk=clamp(20+tension*16+steps*10+(60-(director?.coop??70))*.55+(50-affinity)*.3,8,94);
 const conflict=hash(`${f.id}:${director?.id}:${f.productionCycles.length}:${minutes}:edit`)%100<risk;
 const cost=round(Math.max(.12,f.budget*.006*steps)*(diff>0?1.3:1));
 const delta=runtimeQuality(f,minutes)-(f.runtimeQuality??runtimeQuality(f));
 return {from:runtimeOf(f),to:minutes,director:director?.id,cycle:f.productionCycles.length,preferred,conflict,risk:Math.round(risk),cost,quality:delta,
  beforeShows:dailyShows(f),afterShows:dailyShows(minutes),capacity:capacityFactor({runtime:minutes}),
  message:conflict?`감독은 ${preferred}분 호흡을 선호하며 ${minutes}분 편집안에 이견을 제기했습니다. 공동 편집으로 조율하거나 제작사 판단을 적용할 수 있습니다.`:`감독이 ${minutes}분 편집 방향에 동의했습니다. 최종 확정 전까지 비용은 지출하지 않습니다.`};
}
export function editOutcome(quote,mode) {
 if(mode==='cancel')return {cost:0,quality:0,affinity:0,applied:false,label:'원안 유지'};
 if(!['agree','collaborate','override'].includes(mode)||(!quote.conflict&&mode!=='agree')||(quote.conflict&&mode==='agree'))throw Error('편집 협의 선택지를 확인해 주세요.');
 return {cost:round(quote.cost*(mode==='collaborate'?1.5:1)),quality:quote.quality+(mode==='collaborate'?1:mode==='override'?-5:0),affinity:mode==='override'?-12:mode==='collaborate'?3:1,applied:true,label:mode==='collaborate'?'감독과 공동 편집':mode==='override'?'제작사 편집안 적용':'합의 편집'};
}
