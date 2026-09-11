import {relationshipFactor} from './relationships.js';
import {PEOPLE,PERSON,GENRES} from './data.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=n=>Math.round(n*100)/100;
export function hash(text){let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
export const ageGroup=p=>p.age<18?'어린이':p.age<40?'성인':p.age<65?'중년':'노년';
export const personalities=['계획형','즉흥형','탐구형','소통형','완벽형','유연형'];
export function initializeRoster(s,legacy=false){
  if(s.roster)return s;
  s.alumni={};s.lifeEvents=[];
  s.roster=PEOPLE.map((p,i)=>{
    const n=hash(p.id+'age'),actor=['lead','support'].includes(p.role),band=n%100;
    const age=legacy?p.age+Math.floor(s.month/12):actor?(band<12?6+n%12:band<62?18+n%22:band<90?40+n%25:65+n%18):28+n%49;
    return{...p,age,skill:!legacy&&age<18?28+n%38:p.skill,star:!legacy&&age<18?5+n%35:p.star,genres:[...p.genres],status:'active',generation:1,slot:p.id,imageKey:p.id,imageText:p.name.slice(1),personality:personalities[hash(p.id)%6],birthYear:2026+Math.floor(s.month/12)-age};
  });
  return s;
}
const indices=new WeakMap();
export function person(s,id){if(!s?.roster)return PERSON[id];let record=indices.get(s);if(!record||record.rev!==(s.rosterRevision??0)){record={rev:s.rosterRevision??0,map:Object.fromEntries(s.roster.map(p=>[p.id,p]))};indices.set(s,record);}return record.map[id]??s.alumni?.[id];}
export const people=s=>s?.roster??PEOPLE;
export const credits=f=>[...new Set([f.script.writer,f.director,...f.leads,...f.supports,...(f.pastCrew??[]),...(f.cameos??[])])];
const histories=new WeakMap();
export function invalidateCareer(s){s.careerEpoch=(s.careerEpoch??0)+1;}
const emptyCareer=()=>({films:[],success:0,failure:0,hits:0,audience:0,best:0,released:0});
function historyIndex(s){
  const key=`${s.month}/${s.films.length}/${s.careerEpoch??0}`;let cache=histories.get(s);if(cache?.key===key)return cache;
  cache={key,persons:new Map(),pairs:new Map()};
  for(const f of s.films){const ids=credits(f);for(const id of ids){const h=cache.persons.get(id)??emptyCareer();h.films.push(f);if(f.status==='closed'){if(f.receipts>=f.spent)h.success++;else h.failure++;}if(f.audience>=10000000)h.hits++;h.audience+=f.audience;h.best=Math.max(h.best,f.audience);if(f.releaseMonth!=null)h.released++;cache.persons.set(id,h);}
    if(f.status==='closed')for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const k=[ids[i],ids[j]].sort().join('|');cache.pairs.set(k,(cache.pairs.get(k)??0)+(f.receipts>=f.spent?3:-2));}
  }
  histories.set(s,cache);return cache;
}
export const career=(s,id)=>s?historyIndex(s).persons.get(id)??emptyCareer():emptyCareer();
export function available(s,p){return !!p&&p.status!=='dead'&&p.status!=='retired'&&!p.retirementPending&&(!['director','writer'].includes(p.role)||p.age>=18);}
export function eligible(s,p,genres){return available(s,p)&&!(p.role==='lead'&&p.age<18&&genres.includes('romance'));}
export function pairCompatibility(s,a,b){
  if(a===b)return 100;const pa=person(s,a),pb=person(s,b);if(!pa||!pb)return 50;
  const key=[a,b].sort().join('|');let value=25+hash(key)%61;
  if(pa.personality===pb.personality)value+=6;
  value+=s?(historyIndex(s).pairs.get(key)??0):0;
  return clamp(value,10,98);
}
export function teamCompatibility(s,ids){const unique=[...new Set(ids.filter(Boolean))];let sum=0,n=0;for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){sum+=pairCompatibility(s,unique[i],unique[j]);n++;}return n?Math.round(sum/n):50;}
export function contractQuote(s,p,team=[],company='c0'){
  const h=career(s,p.id),track=clamp(1+h.success*.025-h.failure*.018+h.hits*.15,.76,1.7);
  const partners=team.filter(id=>id&&id!==p.id),chem=partners.length?partners.reduce((n,id)=>n+pairCompatibility(s,p.id,id),0)/partners.length:50;
  const chemistry=clamp(1+(50-chem)*.002,.91,1.08);
  const relationship=relationshipFactor(s,p,team,company);
  return{fee:round(p.fee*track*chemistry*relationship),relationshipFactor:relationship,historyFactor:round(track),chemistryFactor:round(chemistry),compatibility:Math.round(chem)};
}
export function historyEffect(s,ids){if(!ids.length)return 0;return round(clamp(ids.reduce((n,id)=>{const h=career(s,id);return n+h.success*.35-h.failure*.22+h.hits*1.4;},0)/ids.length,-3,4));}
function reincarnate(s,p,rnd){
  const surnames='김 이 박 최 정 강 윤 조 한 서 장 임 오 송 전 유 홍 남 신 문'.split(' '),first='도 하 지 서 예 수 민 연 유 시 태 가 은 재 소 채 다 정 승 현'.split(' '),last='원 윤 민 현 우 진 빈 온 솔 율 선 준 연 호 정 경 수 은 린 재'.split(' ');
  const used=new Set([...s.roster,...Object.values(s.alumni)].map(x=>x.name));let name,attempts=0;
  do{name=surnames[Math.floor(rnd(s)*surnames.length)]+first[Math.floor(rnd(s)*first.length)]+last[Math.floor(rnd(s)*last.length)];if(++attempts>20)name+=" "+(Object.keys(s.alumni).length+1);}while(used.has(name));
  const gs=[...GENRES].sort((a,b)=>hash(name+a.id)-hash(name+b.id)).slice(0,2).map(g=>g.id);
  return{...p,id:p.slot+':g'+(p.generation+1),name,age:6,birthYear:2026+Math.floor(s.month/12)-6,generation:p.generation+1,status:'active',retirementPending:false,retiredMonth:null,deathMonth:null,deathReason:null,skill:25+Math.floor(rnd(s)*35),star:3+Math.floor(rnd(s)*25),coop:40+Math.floor(rnd(s)*56),fee:round(.12+rnd(s)*({writer:.4,director:.6,lead:.8,support:.3}[p.role])),genres:gs,personality:personalities[Math.floor(rnd(s)*6)],trait:'새로운 가능성을 지닌',previousLife:p.id};
}
export function cycleYear(s,rnd){
  const changes=[];for(let i=0;i<s.roster.length;i++){
    const p=s.roster[i];p.age++;
    if(p.age<=24&&p.status==='active')p.skill=clamp(p.skill+1+Math.floor(rnd(s)*3),20,96);
    const oldChance=p.age>=98?1:p.age>=85?.12+(p.age-85)*.04:p.age>=70?.008+(p.age-70)*.003:0;
    const diedOld=rnd(s)<oldChance,diedSuddenly=!diedOld&&p.age>=18&&rnd(s)<.0015;
    if(diedOld||diedSuddenly){
      p.status='dead';p.deathMonth=s.month;p.deathReason=diedOld?'고령으로 별세':'갑작스러운 별세';p.retirementPending=false;
      s.alumni[p.id]={...p,genres:[...p.genres]};const next=reincarnate(s,p,rnd);s.roster[i]=next;
      changes.push({type:'death',id:p.id,name:p.name,reason:p.deathReason,next:next.id,nextName:next.name,month:s.month});
    }else if(p.status==='active'&&!p.retirementPending&&p.age>=65&&rnd(s)<Math.min(.65,.025+(p.age-65)*.015)){
      const working=s.films.some(f=>['production','reshoot'].includes(f.status)&&[f.script.writer,f.director,...f.leads,...f.supports,...(f.cameos??[])].includes(p.id));
      if(working)p.retirementPending=true;else{p.status='retired';p.retiredMonth=s.month;}
      changes.push({type:'retirement',id:p.id,name:p.name,pending:working,month:s.month});
    }
  }
  s.rosterRevision=(s.rosterRevision??0)+1;s.lifeEvents=[...changes,...s.lifeEvents].slice(0,300);return changes;
}
export function finishRetirements(s){for(const p of s.roster)if(p.retirementPending&&!s.films.some(f=>['production','reshoot'].includes(f.status)&&[f.script.writer,f.director,...f.leads,...f.supports,...(f.cameos??[])].includes(p.id))){p.status='retired';p.retiredMonth=s.month;p.retirementPending=false;}}
