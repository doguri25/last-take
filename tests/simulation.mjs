import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import {PEOPLE,EVENTS,GENRES} from '../dist/data.js';
const count=(role,gender)=>PEOPLE.filter(p=>p.role===role&&(!gender||p.gender===gender)).length;
assert.equal(PEOPLE.length,1600);assert.equal(new Set(PEOPLE.map(p=>p.name)).size,1600);
assert.deepEqual([count('director'),count('writer'),count('lead','M'),count('lead','F'),count('support','M'),count('support','F')],[200,200,200,200,400,400]);
assert.equal(EVENTS.length,56);
assert.ok(E.genreBonus(['family','drama'])>E.genreBonus(['family','thriller']));
function draft(s,scale='small'){
  let p=s.pitches.find(p=>E.available(s,E.person(s,p.writer))&&!E.busyFilm(s,p.writer));
  if(!p){const w=E.people(s).find(p=>p.role==='writer'&&E.available(s,p)&&!E.busyFilm(s,p.id));p=E.requestPitch(s,w.id);}
  return E.recommend(s,{script:p,title:p.title,genres:[p.genre],scale,leads:[],supports:[]});
}
function resolve(s){for(const f of E.pendingEvents(s)){
  const opts=EVENTS[f.pending][2].map((o,i)=>({o,i})).filter(x=>!x.o[1]||E.eventCost(f,x.o)<=E.player(s).cash).sort((a,b)=>b.o[2]-a.o[2]);
  try{E.resolveEvent(s,f.id,opts[0].i);}catch(error){if(!/자금|대체/.test(error.message))throw error;E.resolveEvent(s,f.id,2);}
}}
function step(s){resolve(s);E.advanceMonth(s);resolve(s);}
function invariant(s){
  assert.equal(s.companies.length,10);assert.ok(E.validateSave(JSON.parse(JSON.stringify(s))));
  const busy=new Set();for(const f of E.active(s)){for(const id of E.crewIds(f)){assert.ok(!busy.has(id),`double booking ${id}`);busy.add(id);}}
  for(const c of s.companies){
    assert.ok(Number.isFinite(c.cash)&&Number.isFinite(c.debt)&&c.debt>=0);
    assert.ok(E.active(s).filter(f=>f.company===c.id).length<=3);
    const fs=s.films.filter(f=>f.company===c.id),released=fs.filter(f=>f.releaseMonth!=null).sort((a,b)=>a.releaseMonth-b.releaseMonth);
    for(let i=1;i<released.length;i++)assert.ok(released[i].releaseMonth-released[i-1].releaseMonth>=2);
    assert.equal(E.round(fs.reduce((n,f)=>n+f.gross,0)),c.totalGross);
    assert.equal(E.round(fs.reduce((n,f)=>n+f.receipts,0)),c.totalReceipts);
    assert.equal(fs.reduce((n,f)=>n+f.audience,0),c.totalAudience);
  }
  for(const f of s.films){
    assert.ok(f.decisions.length<=4);assert.equal(new Set(f.events).size,4);assert.equal(new Set(E.crewIds(f)).size,8);
    assert.ok(f.genres.length<=3&&f.genres.length>=1&&f.months<=12);assert.ok(Number.isFinite(f.spent)&&f.spent>=0&&f.quality<=99);
    if(['ready','showing','closed','reshoot'].includes(f.status))assert.equal(f.decisions.length,4);
    assert.equal(f.audience,f.runs.reduce((n,r)=>n+r.audience,0));
    assert.equal(f.gross,E.round(f.runs.reduce((n,r)=>n+r.gross,0)));
    if(f.status==='closed'){assert.ok(f.runs.length>=2);assert.ok(f.lastAudience<f.openingAudience*.12||f.lastAudience<10000);}
  }
}
// Three simultaneous productions, no fourth; invalid drafts must not spend funds.
const slots=E.createGame('제작 슬롯 검사',91);
for(let i=0;i<3;i++)E.greenlight(slots,draft(slots));
const before=JSON.stringify(slots);assert.throws(()=>E.greenlight(slots,draft(slots)),/3편/);assert.equal(JSON.stringify(slots),before);
invariant(slots);
// Pending decisions stop time, and each production receives exactly four events.
E.advanceMonth(slots);E.advanceMonth(slots);
assert.equal(E.pendingEvents(slots).length,3);const stopped=JSON.stringify(slots);assert.throws(()=>E.advanceMonth(slots),/먼저/);assert.equal(JSON.stringify(slots),stopped);
resolve(slots);while(slots.month<6)step(slots);
assert.ok(E.myFilms(slots).every(f=>f.status==='ready'&&f.decisions.length===4));
const first=E.myFilms(slots)[0],second=E.myFilms(slots)[1];E.releaseFilm(slots,first.id);
assert.throws(()=>E.releaseFilm(slots,second.id),/개봉/);step(slots);assert.throws(()=>E.releaseFilm(slots,second.id),/개봉/);step(slots);E.releaseFilm(slots,second.id);
// Cash and loans: exact interest, negative cash recovery, caps, and repayment.
const bank=E.createGame('재무 검사',5);const cash=E.player(bank).cash;E.borrow(bank,50);assert.equal(E.player(bank).cash,cash+50);assert.equal(E.player(bank).debt,50);
E.advanceMonth(bank);assert.equal(E.player(bank).cash,cash+50-.25-.25);E.repay(bank,10);assert.equal(E.player(bank).debt,40);
const preLoan=JSON.stringify(bank);assert.throws(()=>E.borrow(bank,NaN));assert.throws(()=>E.borrow(bank,200));assert.throws(()=>E.repay(bank,1000));assert.equal(JSON.stringify(bank),preLoan);
E.player(bank).cash=-5;E.borrow(bank,10);assert.equal(E.player(bank).cash,5);
// Additional production waits exactly 12 months and can occur only once.
const extension=E.createGame('추가 제작 검사',77);for(const c of extension.companies.slice(1)){c.cash=0;c.debt=150;}
const ef=E.greenlight(extension,draft(extension));while(ef.status!=='ready')step(extension);
step(extension);step(extension);const extensionMonth=extension.month,q=ef.quality,paid=ef.spent;
E.extendFilm(extension,ef.id);assert.equal(E.expectedRelease(ef),extensionMonth+12);assert.equal(ef.spent,E.round(paid+E.round(ef.budget*.4)));
for(let i=0;i<11;i++)step(extension);assert.equal(ef.status,'reshoot');step(extension);assert.equal(ef.status,'ready');assert.equal(ef.quality,Math.min(99,q+8));assert.equal(ef.decisions.length,4);assert.throws(()=>E.extendFilm(extension,ef.id));
// A same-month competing film reduces the score symmetrically and the audience.
const ordinary=structuredClone(slots);let base=E.myFilms(ordinary).find(f=>f.status==='ready');assert.ok(base);E.player(ordinary).lastRelease=ordinary.month-2;E.player(ordinary).lastReleaseWeek=ordinary.week-8;E.releaseFilm(ordinary,base.id);
const rivalGame=structuredClone(ordinary),pf=rivalGame.films.find(f=>f.id===base.id);
const rival=structuredClone(pf);Object.assign(rival,{id:'fixture-rival',company:'c1',title:'경쟁 작품',status:'ready',releaseMonth:null,scoreLocked:false});rivalGame.companies[1].lastRelease=rivalGame.month-2;rivalGame.companies[1].lastReleaseWeek=rivalGame.week-8;rivalGame.films.push(rival);E.releaseFilm(rivalGame,rival.id);
assert.equal(pf.score,base.score);step(ordinary);step(rivalGame);assert.ok(pf.audience<base.audience);
// Continuous multi-year play validates the entire financial and production model.
const reports=[];
for(const seed of [318,2026,9901]){
  const s=E.createGame('장기 시뮬레이션',seed);
  for(let month=0;month<48;month++){
    resolve(s);
    const ready=E.myFilms(s).find(f=>f.status==='ready');if(ready&&!E.releaseWait(s))E.releaseFilm(s,ready.id);
    if(s.month%2===0&&E.active(s).filter(f=>f.company==='c0').length<3&&E.myFilms(s).filter(f=>f.status==='ready').length<2){
      const d=draft(s,month%6===0?'medium':'small');if(E.player(s).cash>E.estimate(d,s).total+10)E.greenlight(s,d);
    }
    E.advanceMonth(s);resolve(s);invariant(s);
    if(s.ledger.length<500)assert.equal(E.round(s.ledger.reduce((n,l)=>n+l.amount,0)),E.player(s).cash);
  }
  assert.equal(s.awards.length,4);assert.ok(s.films.some(f=>f.status==='closed'));assert.ok(s.awards.every(a=>a.eligible>0));
  assert.ok(s.companies.every(c=>s.films.some(f=>f.company===c.id&&f.releaseMonth!=null)));
  reports.push({seed,months:s.month,films:s.films.length,playerFilms:E.myFilms(s).length,awards:s.awards.length,cash:E.player(s).cash});
}
console.log(JSON.stringify({result:'PASS',checks:['exact 1600-person roster','three production slots','exclusive bookings','four events and blocking','two-month release cadence','12-month one-time extension','competition effects','audience-led closure','gross versus net receipts','loans and interest','annual awards','save restoration','48-month simulations'],simulations:reports},null,2));
