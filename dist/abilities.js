/** Bounded weekly career development. Reads current activity; never rewrites film snapshots. */
import {weekOf} from './clock.js';
import {EXTRA_GENRES} from './content-v14.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=x=>Math.round(x*100)/100;
const hash=x=>{let n=2166136261;for(const c of String(x)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
const ids=f=>[f.script?.writer,f.director,...(f.leads??[]),...(f.supports??[]),...(f.cameos??[])].filter(Boolean);
const stats=p=>({skill:p.skill,star:p.star,coop:p.coop,fee:p.fee});
export function initAbilities(s) {
 const week=weekOf(s);
 for(const p of s.roster??[]) {
  if(!p.specialtiesVersion){
   if(hash(p.id+':specialty')%100<42){const id=EXTRA_GENRES[hash(p.id+':genre')%EXTRA_GENRES.length].id;if(!p.genres.includes(id))p.genres=[...p.genres,id];}
   p.specialtiesVersion=1;
  }
  if(p.abilityState?.owner===p.id)continue;
  const base=stats(p);
  p.abilityState={owner:p.id,week,startWeek:week,base,precise:{skill:p.skill,star:p.star,coop:p.coop},history:[{week,...base,reason:'능력치 기록 시작'}]};
 }
 s.abilityModel=1;s.abilitiesProcessedWeek??=week;return s;
}
export function advanceAbilities(s) {
 initAbilities(s);const week=weekOf(s);if(s.abilitiesProcessedWeek===week)return 0;const work=new Map(),exposure=new Map();
 for(const f of s.films??[]){
  const crew=ids(f);
  if(['production','reshoot'].includes(f.status))for(const id of crew)work.set(id,f);
  if(['showing','streaming'].includes(f.status))for(const id of crew)exposure.set(id,(exposure.get(id)??0)+Math.min(1.2,(f.lastWeekAudience??0)/300000)+(f.status==='streaming'?.25:0));
 }
 let changed=0;
 for(const p of s.roster??[]){
  const old=p.abilityState;
  if(old.week>=week)continue;
  if(p.status!=='active'){p.abilityState={...old,week};continue;}
  const f=work.get(p.id),seen=exposure.get(p.id)??0,base=old.base;
  const before=stats(p),next={...old.precise};
  // Long offline gaps aren't simulated: migrateSave establishes a current baseline.
  for(let w=old.week+1;w<=week;w++){
   const noise=k=>((hash(`${p.id}:${w}:${k}:ability`)%2001)/1000-1);
   next.skill=clamp(next.skill+(f?.09:.018)+(p.age<25?.035:0)+noise('skill')*.19+(Math.min(92,base.skill+7)-next.skill)*.0025,15,96);
   next.star=clamp(next.star+(seen?seen*.18:f?.012:-.026)+noise('star')*.27+(base.star*.78-next.star)*.0018,1,97);
   next.coop=clamp(next.coop+(f?.045:0)+noise('coop')*.17+(78-next.coop)*.0014,20,98);
  }
  p.skill=Math.round(next.skill);p.star=Math.round(next.star);p.coop=Math.round(next.coop);
  if(week%4===0)p.fee=round(Math.max(.1,base.fee*clamp(.5+.28*p.skill/Math.max(1,base.skill)+.22*p.star/Math.max(1,base.star),.65,1.75)));
  const reason=f?'현장 경험 · 협업 · 컨디션':seen?'공개작 노출 · 관객 반응':'개인 연습 · 휴식 · 대중 관심 변화';
  let history=old.history;
  if(['skill','star','coop','fee'].some(k=>before[k]!==p[k])){
   history=[...history,{week,...stats(p),reason}].slice(-32);changed++;
  }
  // Immutable nested records protect shallow cast snapshots from future mutation.
  p.abilityState={...old,week,precise:next,history};
 }
 s.abilityRevision=(s.abilityRevision??0)+1;s.abilitiesProcessedWeek=week;return changed;
}
export function abilityChanges(p){const a=p?.abilityState;if(!a)return null;return Object.fromEntries(['skill','star','coop','fee'].map(k=>[k,round(p[k]-a.base[k])]));}
