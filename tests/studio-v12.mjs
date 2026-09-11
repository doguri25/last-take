import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../dist/engine.js';
import * as C from '../dist/cinema.js';
import * as H from '../dist/finance-history.js';
import * as N from '../dist/casting.js';
import * as X from '../dist/expansion.js';
import * as Life from '../dist/career.js';
import {EVENTS,STORIES} from '../dist/data.js';
import {STORY_DEVELOPMENTS} from '../dist/plot-seeds.js';
const base=E.createGame('새 기능 검증',270);
const fresh=()=>structuredClone(base),copy=x=>structuredClone(x),snap=JSON.stringify;
function draft(s,extra={}){const script=s.pitches.find(x=>E.available(s,E.person(s,x.writer))&&!E.busyFilm(s,x.writer));return E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[],...extra});}
function resolve(s){for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));}
function step(s){resolve(s);E.advanceWeek(s);resolve(s);}
const completed=(()=>{const s=fresh(),f=E.greenlight(s,draft(s));while(f.status!=='ready')step(s);f.completionAcknowledged=true;return {s,id:f.id};})();
function ready(){const s=copy(completed.s);return {s,f:s.films.find(f=>f.id===completed.id)};}

test('presentation formats add only the technical base costs; valid combinations retain exact budget',()=>{
 const s=fresh(),d=draft(s),plain=E.estimate(d,s);d.formats=['3d','4d','imax','sound'];const enhanced=E.estimate(d,s);
 assert.equal(C.formatEffect(d,100).cost,40);assert.equal(enhanced.writer,plain.writer);assert.equal(enhanced.cast,plain.cast);assert.equal(E.round(enhanced.total-plain.total),enhanced.formats);assert.ok(enhanced.formatQuality<=6&&enhanced.formatQuality>0);assert.ok(enhanced.quality>=plain.quality);
 const f=E.greenlight(s,d);assert.deepEqual(f.formats,d.formats);assert.equal(f.presentationBudget,enhanced.formats);assert.equal(f.spent,enhanced.total);
});
test('genre-matched formats improve quality more and malformed formats fail without mutation',()=>{
 assert.ok(C.formatEffect({genres:['sf'],formats:['3d']}).quality>C.formatEffect({genres:['drama'],formats:['3d']}).quality);
 for(const formats of [['invalid'],['3d','3d']]){const s=fresh(),d=draft(s,{formats}),before=snap(s);assert.throws(()=>E.greenlight(s,d));assert.equal(snap(s),before);}
});
test('same-time cast is rejected in offers, preflight and final contract, including stale approvals',()=>{
 const s=fresh(),d=draft(s),f=E.greenlight(s,d),next=draft(s);next.director=f.director;const before=snap(s);
 const response=N.castingOffer(s,next,f.director);assert.equal(response.status,'refused');assert.ok(response.blocked);assert.throws(()=>E.assertCrewAvailable(s,next));assert.throws(()=>E.greenlight(s,next));assert.equal(snap(s),before);
 next.requireNegotiation=true;next.castingAgreements={[f.director]:response.fingerprint};assert.throws(()=>E.greenlight(s,next));
 next.director=draft(s).director;next.leads[0]=f.leads[0];assert.throws(()=>E.assertCrewAvailable(s,next));
});
test('seven critic viewpoints are deterministic, varied, moderated and independent of audience',()=>{
 const {f}=ready();assert.equal(f.reviews.length,7);assert.equal(new Set(f.reviews.map(r=>r.focus)).size,7);assert.equal(new Set(f.reviews.map(r=>r.text)).size,7);assert.ok(f.reviews.every(r=>r.text.length>70));
 const scores=copy(f.reviews),score=C.criticScore(f);C.makeCriticReviews(f);assert.deepEqual(f.reviews,scores);f.audience=15000000;C.makeCriticReviews(f);assert.equal(C.criticScore(f),score);
 const set=new Set(),ratings=[];for(let i=0;i<240;i++){const x={...f,id:'variety-'+i,title:'작품 '+i,quality:80+(i%15)};C.makeCriticReviews(x);ratings.push(C.criticScore(x));x.reviews.forEach(r=>set.add(r.text));}assert.ok(set.size>800);assert.ok(ratings.reduce((a,b)=>a+b,0)/ratings.length<80);assert.ok(Math.max(...ratings)<95);
});
test('audience reactions appear only after screening, have a separate score and remain stable',()=>{
 const {s,f}=ready();assert.equal(C.viewerScore(f),null);E.releaseFilm(s,f.id);assert.equal(C.viewerScore(f),null);step(s);assert.equal(f.viewerReviews.length,16);assert.equal(C.viewerScore(f),Math.round(f.viewerReviews.reduce((a,r)=>a+r.score,0)/16));assert.notEqual(C.viewerScore(f),E.reviewScore(s,f));const before=snap(f.viewerReviews);step(s);assert.equal(snap(f.viewerReviews),before);
});
test('run graphs, cumulative admissions and trends use exact stored week/month records',()=>{
 const f={runs:[{week:0,month:0,audience:100,gross:5},{week:1,month:0,audience:80,gross:4},{week:2,month:0,audience:120,gross:6}]};assert.deepEqual(H.runSeries(f,'cumulative').map(x=>x.value),[100,180,300]);assert.equal(H.trendAt(f,f.runs[0],'audience').direction,'new');assert.equal(H.trendAt(f,f.runs[1],'audience').percent,-20);assert.equal(H.trendAt(f,f.runs[2],'gross').percent,50);assert.equal(H.runTotalsThrough(f,f.runs[1]).audience,180);assert.equal(H.runTotalsThrough(f,{}).audience,0);
 f.runs.push({month:1,audience:300,gross:15});assert.equal(H.trendAt(f,f.runs[3],'gross').direction,'unknown');
});
test('finance history captures real loans, repayments, spending and weekly balances',()=>{
 const s=fresh(),initial=s.financeHistory.length;E.borrow(s,30);assert.equal(s.financeHistory.at(-1).cash,180);assert.equal(s.financeHistory.at(-1).debt,30);E.repay(s,10);assert.equal(s.financeHistory.at(-1).cash,170);assert.equal(s.financeHistory.at(-1).debt,20);assert.equal(s.financeHistory.at(-1).fixed,.35);E.refreshPitches(s);assert.equal(s.financeHistory.at(-1).cash,169.5);step(s);assert.equal(s.financeHistory.at(-1).week,1);assert.ok(s.financeHistory.length>=initial+4);assert.equal(H.financeSeries(s,'net').at(-1).value,149.5);
 const before=s.financeHistory.length;H.recordFinance(s);assert.equal(s.financeHistory.length,before);
});
test('legacy finance reconstructs only retained actual transactions and never fabricates earlier points',()=>{
 const s=fresh();E.borrow(s,30);E.refreshPitches(s);E.repay(s,10);delete s.financeHistory;delete s.financeHistoryInfo;s.ledger=s.ledger.slice(0,2);s.ledger.forEach(l=>delete l.week);H.initFinanceHistory(s);const recorded=s.financeHistory.filter(x=>x.source==='ledger');assert.equal(recorded.length,2);assert.equal(recorded[0].cash,179.5);assert.equal(recorded[0].debt,30);assert.equal(recorded[1].cash,169.5);assert.equal(recorded[1].debt,20);assert.equal(s.financeHistoryInfo.complete,false);assert.equal(H.financeSeries(s,'gross').length,1);assert.equal(recorded[0].week,null);
});
test('five OTT services give distinct stable genre-sensitive offers without mutating game state',()=>{
 const {s,f}=ready(),before=snap(s),offers=C.ottOffers(f);assert.equal(offers.length,5);assert.equal(new Set(offers.map(x=>x.amount)).size,5);assert.deepEqual(offers,C.ottOffers(f));assert.equal(snap(s),before);assert.equal(new Set(C.OTT_PLATFORMS.map(p=>p.shape)).size,5);const altered={...f,genres:['animation']};assert.notDeepEqual(offers.map(x=>x.amount),C.ottOffers(altered).map(x=>x.amount));
});
test('OTT contract posts cash once, pays original royalty, prevents all double distribution',()=>{
 const {s,f}=ready();f.script.license={share:.12};const offer=C.ottOffers(f)[0],cash=E.player(s).cash,receipts=E.player(s).totalReceipts,market=E.player(s).totalGross;assert.equal(offer.net,E.round(offer.amount-offer.royalty));assert.ok(offer.royalty>0);
 E.sellToOTT(s,f.id,offer.platform);assert.equal(f.status,'streaming');assert.equal(f.distribution,'ott');assert.equal(E.player(s).cash,E.round(cash+offer.net));assert.equal(E.player(s).totalReceipts,E.round(receipts+offer.net));assert.equal(E.player(s).totalOttReceipts,offer.net);assert.equal(E.player(s).totalGross,market);assert.equal(f.audience,0);assert.equal(f.runs.length,0);assert.equal(f.royalties,offer.royalty);assert.equal(s.financeHistory.at(-1).ott,offer.net);
 const before=snap(s);assert.throws(()=>E.sellToOTT(s,f.id,C.OTT_PLATFORMS[1].id));assert.throws(()=>E.releaseFilm(s,f.id));assert.throws(()=>X.selectPoster(s,f.id,8));assert.equal(snap(s),before);assert.ok(E.validateSave(E.migrateSave(copy(s))));
});
test('OTT viewer reviews arrive after one week, never enter the theatrical boxoffice',()=>{
 const {s,f}=ready();E.sellToOTT(s,f.id,C.OTT_PLATFORMS[0].id);assert.equal(C.viewerScore(f),null);step(s);assert.equal(f.viewerReviews.length,16);assert.ok(f.ott.availableReviews);assert.equal(s.notifications.filter(n=>n.key===f.id+':ott-review').length,1);step(s);assert.equal(s.notifications.filter(n=>n.key===f.id+':ott-review').length,1);assert.equal(f.runs.length,0);assert.equal(f.audience,0);
});
test('OTT rejects premature, competing, active-promotion and nonexistent offers atomically',()=>{
 const {s,f}=ready();for(const [id,platform] of [['unknown','nemoflix'],[f.id,'invalid'],[s.films.find(x=>x.company==='c1').id,'nemoflix']]){const before=snap(s);assert.throws(()=>E.sellToOTT(s,id,platform));assert.equal(snap(s),before);}f.activePromotion={dueWeek:s.week+1};const before=snap(s);assert.throws(()=>E.sellToOTT(s,f.id,'nemoflix'),/홍보/);assert.equal(snap(s),before);
});
test('completed plots are persistent expanded narratives rather than only the source pitch',()=>{
 const {f}=ready();assert.ok(f.plot.length>f.script.synopsis.length+150);assert.equal(f.plot.split('\n\n').length,4);const before=f.plot;assert.equal(C.ensurePlot(f),before);assert.equal(C.ensurePlot({...f,status:'production',plot:undefined}),'');const titles=Object.values(STORIES).flat().map(s=>s[0]);assert.equal(titles.length,84);for(const title of titles){assert.equal(STORY_DEVELOPMENTS[title].length,3);assert.ok(STORY_DEVELOPMENTS[title].every(p=>p.length>35));}
});
test('saved released legacy scores/runs/cash survive migration while unshown films gain new reviews',()=>{
 const {s,f}=ready();E.releaseFilm(s,f.id);step(s);const cash=E.player(s).cash,runs=snap(f.runs);s.version=6;delete f.reviewModel;f.reviews=[{name:'기존평론',base:93,text:'기존 평가'}];f.score=92;f.scoreLocked=true;const migrated=E.migrateSave(copy(s)),mf=migrated.films.find(x=>x.id===f.id);assert.equal(migrated.version,7);assert.equal(mf.reviewModel,'legacy');assert.equal(E.reviewScore(migrated,mf),92);assert.equal(snap(mf.runs),runs);assert.equal(E.player(migrated).cash,cash);
 const unshown=ready();delete unshown.f.reviewModel;unshown.f.reviews=[{name:'기존평론',base:93}];E.migrateSave(unshown.s);assert.equal(unshown.f.reviews.length,7);assert.equal(unshown.f.reviewModel,2);
});
test('life and historic boxoffice alerts carry clickable IDs and are de-duplicated',()=>{
 const {s,f}=ready(),p=s.roster[0];E.announceLifeEvents(s,[{id:p.id,name:p.name,type:'death'}]);E.announceLifeEvents(s,[{id:p.id,name:p.name,type:'death'}]);assert.equal(s.notifications.filter(n=>n.personId===p.id&&n.type==='career').length,1);
 f.audience=12000000;E.announceBoxOfficeMilestones(s,f);E.announceBoxOfficeMilestones(s,f);assert.equal(s.notifications.filter(n=>n.type==='record'&&n.filmId===f.id).length,2);assert.deepEqual(f.historicMilestones,[5000000,10000000]);
});
test('retirement at the end of an existing production raises one profile-linked notification',()=>{
 const s=fresh(),p=s.roster.find(p=>!E.busyFilm(s,p.id));p.retirementPending=true;Life.finishRetirements(s);Life.finishRetirements(s);assert.equal(p.status,'retired');const notices=s.notifications.filter(n=>n.key==='life-retired-'+p.id);assert.equal(notices.length,1);assert.equal(notices[0].personId,p.id);assert.ok(notices[0].text);
});
