import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import * as X from '../dist/expansion.js';
import * as R from '../dist/relationships.js';
import * as N from '../dist/casting.js';
import * as P from '../dist/portraits.js';
import {EVENTS,GENRES} from '../dist/data.js';
const make=seed=>E.createGame('주간 검증',seed);
const draft=(s,extra={})=>{const script=s.pitches.find(p=>E.available(s,E.person(s,p.writer))&&!E.busyFilm(s,p.writer));return E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[],...extra});};
function resolve(s){for(const f of E.pendingEvents(s)){const i=EVENTS[f.pending][2].findIndex(o=>o[1]===0);E.resolveEvent(s,f.id,i);}}
function step(s){resolve(s);E.advanceWeek(s);resolve(s);}
function filmFixture(seed=270){const s=make(seed);const f=E.greenlight(s,draft(s));return{s,f};}
function readyFixture(seed=270){const {s,f}=filmFixture(seed);while(f.status!=='ready'){step(s);assert.ok(s.week<80);}return{s,f};}
const snap=s=>JSON.stringify(s);

test('calendar advances one week; costs and interest settle only every fourth week',()=>{
 const s=make(301);E.borrow(s,20);const cash=E.player(s).cash;
 for(let i=1;i<4;i++){step(s);assert.equal(s.week,i);assert.equal(s.month,0);assert.equal(E.player(s).cash,cash);}
 step(s);assert.equal(s.week,4);assert.equal(s.month,1);assert.equal(E.player(s).cash,E.round(cash-.25-.1));
 assert.equal(s.ledger.filter(l=>l.kind==='overhead').length,1);assert.equal(s.ledger.filter(l=>l.kind==='interest').length,1);
 assert.equal(E.weekDate(47),'2026년 12월 4주');assert.equal(E.weekDate(48),'2027년 1월 1주');
});

test('paid script refresh works repeatedly without time advancing and is atomic without funds',()=>{
 const s=make(20),cash=E.player(s).cash,old=s.pitches.map(p=>p.id);
 E.refreshPitches(s);assert.equal(E.player(s).cash,cash-.5);assert.equal(s.week,0);assert.equal(s.pitches.length,6);
 assert.equal(new Set(s.pitches.map(p=>p.writer)).size,6);assert.ok(s.pitches.every(p=>!old.includes(p.id)));
 E.refreshPitches(s);assert.equal(E.player(s).cash,cash-1);assert.equal(s.week,0);
 E.player(s).cash=.49;const before=snap(s);assert.throws(()=>E.refreshPitches(s),/부족/);assert.equal(snap(s),before);
});

test('the original genre is optional; at least one valid genre is still mandatory',()=>{
 const s=make(83);let d=draft(s);d.genres=[GENRES.find(g=>g.id!==d.script.genre&&g.id!=='romance').id];d.subgenres=R.normalizeSubgenres(d);d=E.recommend(s,d);
 const f=E.greenlight(s,d);assert.ok(!f.genres.includes(f.script.genre));
 const s2=make(84),d2=draft(s2);d2.genres=[];d2.subgenres={};const before=snap(s2);assert.throws(()=>E.greenlight(s2,d2),/장르/);assert.equal(snap(s2),before);assert.equal(E.estimate(d2,s2).quality,null);
});

test('casting replies are repeatable, have refusals/counters, and never debit before signing',()=>{
 const s=make(109),d=draft(s,{requireNegotiation:true,castingAgreements:{}}),before=E.player(s).cash;
 // Put the script at a demanding quality level to exercise the response branches.
 d.script={...d.script,quality:50};
 const pool=E.people(s).filter(p=>p.role==='director'&&E.eligible(s,p,d.genres)&&!E.busyFilm(s,p.id));
 const cases={};for(const p of pool){const c={...d,director:p.id};const offer=N.castingOffer(s,c,p.id);assert.deepEqual(offer,N.castingOffer(s,c,p.id));cases[offer.status]??={d:c,offer};}
 assert.ok(cases.refused);assert.ok(cases.counter);assert.ok(cases.accepted);assert.equal(E.player(s).cash,before);
 assert.throws(()=>N.acceptOffers(s,cases.refused.d),/거절/);
 // Build a complete non-refusing team by searching deterministic seeds, not bypassing the guard.
 let found;for(let seed=1;seed<100;seed++){const g=make(seed),t=draft(g,{requireNegotiation:true,castingAgreements:{}}),reports=N.negotiationReport(g,t);if(!reports.some(r=>r.status==='refused')&&reports.some(r=>r.status==='counter')){found={g,t,reports};break;}}
 assert.ok(found);const{g,t,reports}=found,original=E.player(g).cash;assert.throws(()=>E.greenlight(g,t),/조건/);
 const total=E.estimate(t,g).total,extra=E.round(reports.reduce((n,r)=>n+r.extra,0));assert.ok(extra>0);N.acceptOffers(g,t);assert.equal(E.player(g).cash,original);
 const f=E.greenlight(g,t);assert.equal(E.player(g).cash,E.round(original-total));assert.equal(f.negotiations.reduce((n,r)=>n+(r.status==='refused'),0),0);
 for(const r of reports)assert.equal(f.contracts[r.person].paid,r.total);
});

test('changed participants invalidate accepted casting conditions',()=>{
 const s=make(5),d=draft(s,{requireNegotiation:true,castingAgreements:{}});
 const before=N.castingOffer(s,d,d.leads[0]);d.scale='large';const after=N.castingOffer(s,d,d.leads[0]);assert.notEqual(after.fingerprint,before.fingerprint);assert.ok(after.fee>before.fee);
 R.adjust(s,d.leads[0],d.director,-100,'섭외 관계 검사');const troubled=N.castingOffer(s,d,d.leads[0]);assert.ok(troubled.reasons.some(x=>x.includes('감독')&&x.includes('좋지')));
});

test('24 production weeks contain four blocking decisions and one completion notification',()=>{
 const{s,f}=filmFixture();assert.equal(f.months,6);const thresholds=[];
 while(f.status!=='ready'){
  E.advanceWeek(s);
  if(f.pending!=null){thresholds.push(f.elapsedWeeks);const before=snap(s);assert.throws(()=>E.advanceWeek(s),/먼저/);assert.equal(snap(s),before);resolve(s);}
  assert.ok(s.week<=24);
 }
 assert.deepEqual(thresholds,[5,10,15,20]);assert.equal(s.week,24);assert.equal(f.readyWeek,24);assert.equal(f.elapsedWeeks,24);assert.equal(f.decisions.length,4);
 assert.equal(f.productionCycles[0].startWeek,0);assert.equal(f.productionCycles[0].completedWeek,24);assert.equal(f.completionAcknowledged,false);
 assert.equal(s.notifications.filter(n=>n.type==='complete'&&n.filmId===f.id).length,1);
 step(s);assert.equal(s.notifications.filter(n=>n.type==='complete'&&n.filmId===f.id).length,1);
});

test('promotion unlocks at 75%, uses one agency and completes after one week with one debit',()=>{
 const{s,f}=filmFixture(270);const agency=R.AGENCIES[0];
 assert.equal(X.promotionAvailable(f),false);let before=snap(s);assert.throws(()=>X.beginPromotion(s,f.id,agency.id),/75/);assert.equal(snap(s),before);
 for(let i=0;i<17;i++)step(s);assert.equal(X.promotionAvailable(f),false);step(s);assert.equal(s.week,18);assert.ok(X.promotionAvailable(f));
 assert.equal(s.notifications.filter(n=>n.key===f.id+':promotion-available').length,1);X.scanPromotionAvailability(s);assert.equal(s.notifications.filter(n=>n.key===f.id+':promotion-available').length,1);
 before=snap(s);assert.throws(()=>X.beginPromotion(s,f.id,null),/한 곳/);assert.equal(snap(s),before);
 const cash=E.player(s).cash,spent=f.spent,awareness=f.awareness;const plan=X.beginPromotion(s,f.id,agency.id,0);
 assert.equal(E.player(s).cash,E.round(cash-plan.cost));assert.equal(f.spent,E.round(spent+plan.cost));assert.equal(f.awareness,awareness);assert.equal(plan.dueWeek,19);
 before=snap(s);assert.throws(()=>X.beginPromotion(s,f.id,R.AGENCIES[1].id),/한 곳/);assert.equal(snap(s),before);
 step(s);assert.equal(f.activePromotion,null);assert.equal(f.promotions.length,1);assert.equal(f.promotions[0].agency,agency.id);assert.equal(E.player(s).cash,E.round(cash-plan.cost));
 assert.equal(s.notifications.filter(n=>n.key===f.id+':promotion-result:'+agency.channel).length,1);
 before=snap(s);assert.throws(()=>X.beginPromotion(s,f.id,R.AGENCIES[1].id),/완료/);assert.equal(snap(s),before);
});

test('poster selection persists and release is blocked until active promotion is completed',()=>{
 const{s,f}=readyFixture(99);X.selectPoster(s,f.id,10);assert.equal(f.poster,10);X.beginPromotion(s,f.id,R.AGENCIES[0].id);
 const before=snap(s);assert.throws(()=>E.releaseFilm(s,f.id),/홍보/);assert.equal(snap(s),before);step(s);E.releaseFilm(s,f.id);assert.equal(f.status,'showing');assert.equal(f.releaseWeek,25);assert.equal(f.poster,10);
 assert.throws(()=>X.selectPoster(s,f.id,3));const restored=E.migrateSave(JSON.parse(snap(s)));assert.equal(restored.films.find(x=>x.id===f.id).poster,10);
});

test('eight weeks of opening reports include weekly receipts, posters and ranking with no ninth alert',()=>{
 const{s,f}=readyFixture(270);X.selectPoster(s,f.id,3);E.releaseFilm(s,f.id);const start=s.week;
 for(let i=1;i<=9;i++){step(s);const notes=s.notifications.filter(n=>n.type==='boxoffice'&&n.filmId===f.id);assert.equal(notes.length,Math.min(i,8));assert.ok(notes.every(n=>n.rank>=1&&n.runNo>=1&&n.runNo<=8));if(i<8)assert.equal(f.status,'showing');}
 assert.equal(f.releaseWeek,start);assert.equal(new Set(s.notifications.filter(n=>n.type==='boxoffice').map(n=>n.key)).size,8);
 assert.equal(f.receipts,E.round(f.runs.reduce((n,r)=>n+r.receipts,0)));assert.equal(f.gross,E.round(f.runs.reduce((n,r)=>n+r.gross,0)));
 assert.equal(f.audience,f.runs.reduce((n,r)=>n+r.audience,0));assert.equal(E.player(s).totalReceipts,f.receipts);assert.equal(s.marketHistory.at(-1).week,s.week-1);
});

test('release cadence is exactly eight weeks, not two rounded-up calendar months',()=>{
 const{s,f}=readyFixture(280);E.releaseFilm(s,f.id);assert.equal(E.releaseWaitWeeks(s),8);
 for(let i=1;i<=8;i++){step(s);assert.equal(E.releaseWaitWeeks(s),8-i);}
});

test('additional production lasts 48 weeks and preserves the first completed cycle',()=>{
 let fixture;for(let seed=320;seed<350;seed++){const candidate=readyFixture(seed);if(!E.crewIds(candidate.f).some(id=>E.busyFilm(candidate.s,id,candidate.f.id))){fixture=candidate;break;}}assert.ok(fixture,'Need an available team for the duration fixture');const {s,f}=fixture;const old=JSON.stringify(f.productionCycles[0]),w=s.week;E.extendFilm(s,f.id);
 for(let i=1;i<48;i++){step(s);assert.equal(f.status,'reshoot');}step(s);assert.equal(f.status,'ready');assert.equal(f.readyWeek,w+48);assert.equal(JSON.stringify(f.productionCycles[0]),old);assert.equal(f.productionCycles.length,2);
 assert.equal(f.productionCycles[1].completedWeek,w+48);assert.throws(()=>E.extendFilm(s,f.id),/한 번/);
});

test('v1.0.3 month saves migrate to week schema without changing cash, IDs or prior dates',()=>{
 const{s,f}=readyFixture();const old=structuredClone(s);old.version=5;delete old.week;for(const c of old.companies)delete c.lastReleaseWeek;
 for(const film of old.films)for(const key of ['startWeek','elapsedWeeks','readyWeek','releaseWeek','reshootElapsedWeeks'])delete film[key];
 const cash=E.player(old).cash,ids=old.films.map(x=>x.id),oldMonths=old.films.map(x=>[x.start,x.readyMonth,x.releaseMonth]);
 assert.ok(E.validateSave(old));E.migrateSave(old);assert.equal(old.week,old.month*4);assert.equal(old.version,7);assert.equal(E.player(old).cash,cash);assert.deepEqual(old.films.map(x=>x.id),ids);assert.deepEqual(old.films.map(x=>[x.start,x.readyMonth,x.releaseMonth]),oldMonths);assert.ok(E.validateSave(old));step(old);
 const corrupt=structuredClone(old);corrupt.week+=4;assert.equal(E.validateSave(corrupt),false);
});

test('all 1600 identities have distinct reproducible portrait recipes and generations change faces',()=>{
 const s=make(77),ps=E.people(s);assert.equal(ps.length,1600);assert.equal(new Set(ps.map(p=>JSON.stringify(P.portraitRecipe(p)))).size,1600);assert.equal(new Set(ps.map(P.portraitKey)).size,1600);
 const p=ps[0];assert.deepEqual(P.portraitRecipe(p),P.portraitRecipe({...p}));assert.notDeepEqual(P.portraitRecipe(p),P.portraitRecipe({...p,id:p.id+':g2'}));
});

test('192-week simulations preserve ledger, save validity and company financials',()=>{
 for(const seed of [18,47]){
  const s=make(seed);for(let week=0;week<192;week++){
   resolve(s);const ready=E.myFilms(s).find(f=>f.status==='ready');if(ready&&!E.releaseWaitWeeks(s))E.releaseFilm(s,ready.id);
   if(s.week%8===0&&E.active(s).filter(f=>f.company==='c0').length<2){
    if(!s.pitches.some(p=>E.available(s,E.person(s,p.writer))&&!E.busyFilm(s,p.writer))&&E.player(s).cash>1)E.refreshPitches(s);
    if(s.pitches.some(p=>E.available(s,E.person(s,p.writer))&&!E.busyFilm(s,p.writer))){const d=draft(s);if(E.player(s).cash>E.estimate(d,s).total+12)E.greenlight(s,d);}
   }
   step(s);assert.equal(s.week,week+1);assert.ok(E.validateSave(JSON.parse(snap(s))));assert.ok(s.companies.every(c=>Number.isFinite(c.cash)&&Number.isFinite(c.debt)));
   if(s.ledger.length<500)assert.equal(E.round(s.ledger.reduce((n,l)=>n+l.amount,0)),E.player(s).cash);
  }
  assert.equal(s.awards.length,4);assert.ok(s.films.some(f=>f.status==='closed'));
 }
});
