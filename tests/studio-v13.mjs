import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import * as X from '../dist/expansion.js';
import * as RT from '../dist/runtime.js';
import * as T from '../dist/taxes.js';
import * as R from '../dist/relationships.js';
import * as C from '../dist/cinema.js';
import * as H from '../dist/finance-history.js';
import {retiredPeople,studioItems} from '../dist/studio-v13.js';
import {EVENTS} from '../dist/data.js';
const base=E.createGame('편집과 결산 검사',270),fresh=()=>structuredClone(base),snap=JSON.stringify;
const draft=(s,extra={})=>{const script=s.pitches.find(p=>E.available(s,E.person(s,p.writer))&&!E.busyFilm(s,p.writer));return E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[],runtime:120,...extra});};
function step(s){for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));E.advanceWeek(s);for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));}
const production=(()=>{const s=fresh(),f=E.greenlight(s,draft(s));for(let i=0;i<21;i++)step(s);return {s,id:f.id};})();
function editing(){const s=structuredClone(production.s);return {s,f:s.films.find(f=>f.id===production.id)};}
// Fixture-only ledger observations, using the same synchronization entry point.
function ledger(s,amount,kind='boxoffice'){E.player(s).cash=E.round(E.player(s).cash+amount);s.ledger.unshift({id:++s.ledgerCounter,month:s.month,week:s.week,amount,kind,description:'테스트 사업 거래'});H.recordFinance(s);}

test('original eight licensed works retain dossiers; rotating offers gate new planning',()=>{
 assert.equal(X.IPS.length,40);assert.equal(new Set(X.IPS.slice(0,8).map(ip=>ip.author)).size,8);
 for(const ip of X.IPS.slice(0,8)){assert.ok(ip.synopsis.length>70&&ip.world.length>30&&ip.risk.length>30);assert.ok(ip.characters.length>=3);assert.ok(RT.RUNTIMES.includes(ip.runtime));const s=fresh();for(let w=0;w<80;w+=4){s.week=w;s.month=w/4;if(X.currentLicenses(s).some(x=>x.id===ip.id))break;}const cash=E.player(s).cash,p=X.licensePitch(s,ip.id);assert.equal(p.synopsis,ip.synopsis);assert.equal(p.license.author,ip.author);assert.equal(E.player(s).cash,cash);const f=E.greenlight(s,E.recommend(s,{script:p,title:p.title,genres:[p.genre],scale:'small',leads:[],supports:[]}));f.status='ready';assert.equal(C.ensurePlot(f),ip.plot);}
});
test('runtime choices map to transparent capacity and influence production budget, not contracts',()=>{
 assert.deepEqual(RT.RUNTIMES.map(RT.dailyShows),[6,5,4,3]);assert.deepEqual(RT.RUNTIMES.map(n=>RT.capacityFactor({runtime:n})),[1.2,1,.8,.6]);
 const s=fresh(),d=draft(s),est=RT.RUNTIMES.map(runtime=>E.estimate({...d,runtime},s));assert.ok(est.every(e=>Number.isFinite(e.total)));assert.ok(est.every(e=>e.cast===est[0].cast&&e.writer===est[0].writer));assert.ok(est[0].total<est[1].total&&est[1].total<est[2].total&&est[2].total<est[3].total);
 for(const n of [0,91,240,'120',NaN]){const before=snap(s);assert.throws(()=>E.greenlight(s,{...d,runtime:n}),/러닝타임/);assert.equal(snap(s),before);}
});
test('matching narrative length helps quality; short films are not always superior',()=>{
 const f={genres:['sf'],runtime:90},g={genres:['comedy'],runtime:90};assert.equal(RT.idealRuntime(f),150);assert.ok(RT.runtimeQuality(f,150)>RT.runtimeQuality(f,90));assert.ok(RT.runtimeQuality(g,90)>RT.runtimeQuality(g,180));assert.equal(RT.idealRuntime({script:{license:X.IPS[6]}}),150);
});
test('only post-production accepts an edit proposal and proposing spends nothing',()=>{
 const s=fresh(),f=E.greenlight(s,draft(s));const before=snap(s);assert.equal(RT.editingAvailable(f),false);assert.throws(()=>E.proposeRuntimeEdit(s,f.id,90),/후반/);assert.equal(snap(s),before);
 const a=editing(),cash=E.player(a.s).cash,quality=a.f.quality;assert.ok(RT.editingAvailable(a.f));E.proposeRuntimeEdit(a.s,a.f.id,90);assert.equal(E.player(a.s).cash,cash);assert.equal(a.f.quality,quality);assert.equal(a.f.runtime,120);assert.equal(a.f.pendingEdit.to,90);assert.throws(()=>E.advanceWeek(a.s),/편집/);assert.throws(()=>E.proposeRuntimeEdit(a.s,a.f.id,150),/후반/);
});
test('cancel is atomic and free even when the company has negative cash',()=>{
 const {s,f}=editing();E.proposeRuntimeEdit(s,f.id,90);E.player(s).cash=-3;const q=f.quality,aff=R.affinity(s,f.director,'c0'),r=E.resolveRuntimeEdit(s,f.id,'cancel');assert.equal(r.applied,false);assert.equal(E.player(s).cash,-3);assert.equal(f.runtime,120);assert.equal(f.quality,q);assert.equal(R.affinity(s,f.director,'c0'),aff);assert.equal(f.pendingEdit,null);assert.ok(RT.editingAvailable(f));
});
test('director conflict is repeatable; collaboration and forced cuts carry distinct tradeoffs',()=>{
 const {s,f}=editing();const director=E.person(s,f.director);director.coop=10;director.personality='완벽형';R.adjust(s,director.id,'c0',-100,'검사');
 const q=[90,150,180].map(n=>RT.editQuote(s,f,n,director,R.affinity(s,director.id,'c0'))).find(q=>q.conflict);assert.ok(q);assert.deepEqual(q,RT.editQuote(s,f,q.to,director,R.affinity(s,director.id,'c0')));
 const collab=RT.editOutcome(q,'collaborate'),force=RT.editOutcome(q,'override');assert.ok(collab.cost>force.cost);assert.ok(collab.quality>force.quality);assert.equal(force.affinity,-12);assert.throws(()=>RT.editOutcome(q,'agree'));
});
test('confirmed edit charges once, modifies quality and relation, survives saves, prevents repeat farming',()=>{
 const {s,f}=editing(),cash=E.player(s).cash,spent=f.spent,quality=f.quality;const q=E.proposeRuntimeEdit(s,f.id,90),mode=q.conflict?'collaborate':'agree',out=RT.editOutcome(q,mode),oldRelation=R.affinity(s,f.director,'c0');
 E.resolveRuntimeEdit(s,f.id,mode);assert.equal(f.runtime,90);assert.equal(f.plannedRuntime,120);assert.equal(E.player(s).cash,E.round(cash-out.cost));assert.equal(f.spent,E.round(spent+out.cost));assert.equal(f.quality,E.clamp(quality+out.quality,20,99));assert.equal(R.affinity(s,f.director,'c0'),E.clamp(oldRelation+out.affinity,0,100));assert.equal(f.editHistory.length,1);assert.equal(RT.editingAvailable(f),false);
 const before=snap(s);assert.throws(()=>E.resolveRuntimeEdit(s,f.id,mode));assert.throws(()=>E.proposeRuntimeEdit(s,f.id,150));assert.equal(snap(s),before);
 const saved=E.migrateSave(JSON.parse(snap(s))),sf=saved.films.find(x=>x.id===f.id);assert.equal(sf.runtime,90);assert.deepEqual(sf.editHistory,f.editHistory);assert.equal(RT.editingAvailable(sf),false);
});
test('pending edits persist across reload; insufficient cash cannot apply a half edit',()=>{
 const {s,f}=editing(),quote=E.proposeRuntimeEdit(s,f.id,150);E.player(s).cash=0;const before=snap(s);assert.throws(()=>E.resolveRuntimeEdit(s,f.id,quote.conflict?'collaborate':'agree'),/부족/);assert.equal(snap(s),before);const restored=E.migrateSave(JSON.parse(before));assert.equal(E.pendingEdits(restored).length,1);E.resolveRuntimeEdit(restored,f.id,'cancel');assert.equal(E.pendingEdits(restored).length,0);
});
test('editing completed/released/foreign films is rejected without mutation',()=>{
 for(const status of ['ready','shelved','showing','closed','streaming']){const {s,f}=editing();f.status=status;const before=snap(s);assert.throws(()=>E.proposeRuntimeEdit(s,f.id,90));assert.equal(snap(s),before);}
 const {s,f}=editing();f.company='c1';const before=snap(s);assert.throws(()=>E.proposeRuntimeEdit(s,f.id,90),/우리/);assert.equal(snap(s),before);
});
test('post-production availability notification is unique and links to editing',()=>{
 const {s,f}=editing(),notices=s.notifications.filter(n=>n.key===f.id+':edit-window:1');assert.equal(notices.length,1);assert.equal(notices[0].action,'runtime-edit');step(s);assert.equal(s.notifications.filter(n=>n.key===f.id+':edit-window:1').length,1);
});
test('new screening records carry runtime/capacity and shorter runtime affects actual receipts',()=>{
 const a=editing();for(let i=0;i<3;i++)step(a.s);a.f.completionAcknowledged=true;const b=structuredClone(a.s),bf=b.films.find(x=>x.id===a.f.id);a.f.runtime=90;bf.runtime=180;const q=a.f.quality;assert.equal(q,bf.quality);E.releaseFilm(a.s,a.f.id);E.releaseFilm(b,bf.id);step(a.s);step(b);assert.ok(a.f.runs[0].audience>bf.runs[0].audience*1.99);assert.ok(a.f.runs[0].receipts>bf.runs[0].receipts);assert.equal(a.f.runs[0].runtime,90);assert.equal(bf.runs[0].dailyShows,3);
});
test('2026 marginal national and standard local brackets are exact at boundaries',()=>{
 for(const [income,n,l] of [[-1,0,0],[0,0,0],[2,.2,.02],[3,.4,.04],[200,39.8,3.98],[3000,655.8,65.58],[3100,680.8,68.08]]){const t=T.corporateTax(income);assert.equal(t.national,n);assert.equal(t.local,l);assert.equal(t.total,E.round(n+l));}assert.throws(()=>T.corporateTax(NaN));
});
test('taxable business income excludes capital, loan principal and repayments',()=>{
 const s=fresh();E.borrow(s,20);E.repay(s,10);assert.equal(T.taxPosition(s).profit,0);ledger(s,10);ledger(s,-2,'production');assert.equal(T.taxPosition(s).profit,8);ledger(s,.5,'refund');assert.equal(T.taxPosition(s).profit,8.5);assert.equal(T.taxPosition(s).income,10);
});
test('monthly overhead includes only the change in annual tax, with no weekly or duplicate debit',()=>{
 const s=fresh();ledger(s,10);const cash=E.player(s).cash;for(let i=0;i<3;i++)step(s);assert.equal(E.player(s).cash,cash);step(s);const entry=s.ledger.find(l=>l.kind==='overhead');assert.equal(entry.operatingBase,.25);assert.equal(entry.taxDelta,T.corporateTax(9.75).total);assert.equal(entry.amount,-E.round(.25+entry.taxDelta));assert.equal(E.player(s).cash,E.round(cash+entry.amount));
 const old=s.tax.years[2026].reserve;assert.equal(old,entry.taxDelta);for(let i=0;i<4;i++)step(s);const next=s.ledger.find(l=>l.kind==='overhead');assert.ok(next.taxDelta<0);assert.equal(next.taxDelta,E.round(T.corporateTax(9.5).total-old));assert.equal(s.ledger.filter(l=>l.kind==='overhead').length,2);
});
test('losses cause a reserve refund instead of a negative tax and loans stay neutral',()=>{
 const s=fresh();ledger(s,10);for(let i=0;i<4;i++)step(s);const tax=s.tax.years[2026].reserve;ledger(s,-20,'production');E.borrow(s,20);for(let i=0;i<4;i++)step(s);const overhead=s.ledger.find(l=>l.kind==='overhead');assert.equal(overhead.taxDelta,-tax);assert.equal(T.taxPosition(s).total,0);assert.equal(s.tax.years[2026].reserve,0);
});
test('year closure keeps national/local reserves separate and carries eligible losses for 15 years',()=>{
 const s=fresh();ledger(s,-10,'production');s.month=11;s.week=47;T.closeTaxYear(s);assert.equal(s.tax.losses[0].remaining,10);s.month=12;s.week=48;ledger(s,10);const p=T.taxPosition(s);assert.equal(p.lossUsed,8);assert.equal(p.taxable,2);T.closeTaxYear(s);assert.equal(s.tax.losses[0].remaining,2);const saved=JSON.parse(snap(s));s.month=16*12;s.week=s.month*4;ledger(s,10);assert.equal(T.taxPosition(s).lossUsed,0);assert.equal(saved.tax.years[2027].total,.22);
});
test('monthly reserve function is idempotent, annual thresholds never restart each month',()=>{
 const s=fresh();ledger(s,3);const first=T.reserveMonthlyTax(s),second=T.reserveMonthlyTax(s);assert.equal(second,null);assert.equal(s.tax.history.length,1);s.month=1;s.week=4;ledger(s,3);const next=T.reserveMonthlyTax(s);assert.ok(next.position.taxable>5);assert.equal(next.tax,E.round(next.position.total-first.position.total));
});
test('legacy runtime defaults and new taxes preserve prior cash, revenue and reviews without back charges',()=>{
 const {s,f}=editing();delete s.tax;delete f.runtime;delete f.plannedRuntime;delete f.runtimeQuality;delete f.editHistory;const cash=E.player(s).cash,quality=f.quality,ledgerCopy=snap(s.ledger);const restored=E.migrateSave(JSON.parse(snap(s))),rf=restored.films.find(x=>x.id===f.id);assert.equal(rf.runtime,120);assert.equal(rf.runtimeLegacy,true);assert.equal(rf.quality,quality);assert.equal(E.player(restored).cash,cash);assert.equal(snap(restored.ledger),ledgerCopy);assert.equal(T.taxPosition(restored).profit,0);assert.equal(restored.tax.legacy,true);
});
test('retired index keeps former retirees and excludes active, pending and never-retired deceased people',()=>{
 const s=fresh(),[a,b,c,d]=s.roster;a.status='retired';a.retiredMonth=2;b.retirementPending=true;c.status='dead';d.status='dead';d.retiredMonth=1;s.alumni[d.id]={...d};const ids=retiredPeople(s).map(x=>x.id);assert.ok(ids.includes(a.id)&&ids.includes(d.id));assert.ok(!ids.includes(b.id)&&!ids.includes(c.id));assert.equal(ids.filter(id=>id===d.id).length,1);
});
test('studio metrics filter only own relevant films and retain per-award entries',()=>{
 const {s,f}=editing();assert.ok(studioItems(s,'active').every(x=>x.company==='c0'));f.status='shelved';assert.equal(studioItems(s,'ready').length,0);f.status='ready';assert.equal(studioItems(s,'ready')[0].id,f.id);f.audience=300000;f.awards=[{year:2026,category:'작품상'},{year:2026,category:'감독상'}];assert.equal(studioItems(s,'audience')[0].id,f.id);assert.equal(studioItems(s,'trophies').length,2);
});
test('script news contains durable pitch links and writer identities',()=>{
 const s=fresh();E.refreshPitches(s);assert.deepEqual(s.messages[0].pitchIds,s.pitches.map(p=>p.id));const writer=E.people(s).find(p=>p.role==='writer'&&E.available(s,p)&&!E.busyFilm(s,p.id)&&!s.pitches.some(x=>x.writer===p.id));const p=E.requestPitch(s,writer.id);assert.equal(s.messages[0].pitchId,p.id);assert.equal(s.messages[0].personId,p.writer);
});
