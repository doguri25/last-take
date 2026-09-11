import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import * as V from '../dist/release.js';
import * as X from '../dist/expansion.js';
import {EVENTS} from '../dist/data.js';
const s=E.createGame('정식 출시 검사',270);
const script=s.pitches.find(p=>!E.busyFilm(s,p.writer));const f=E.greenlight(s,E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[]}));
const resolve=s=>{for(const f of E.pendingEvents(s)){try{E.resolveEvent(s,f.id,2);}catch(e){if(!/자금/.test(e.message))throw e;E.resolveEvent(s,f.id,0);}}};
const step=()=>{resolve(s);E.advanceMonth(s);resolve(s);};
assert.equal(f.productionCycles[0].crankIn,0);assert.equal(f.productionCycles[0].crankUp,null);
while(f.status!=='ready')step();assert.equal(s.month,6);assert.equal(f.productionCycles[0].crankUp,5);assert.equal(f.productionCycles[0].completed,6);assert.equal(f.releaseMonth,null);
const review=JSON.stringify(f.reviews),quality=f.quality,budget=f.spent;const n=E.active(s).length;
E.shelveFilm(s,f.id);assert.equal(f.status,'shelved');assert.equal(E.expectedRelease(f),Infinity);assert.equal(E.active(s).length,n);assert.equal(f.spent,budget);assert.equal(X.posterAvailable(f),true);X.selectPoster(s,f.id,2);
for(let i=0;i<15;i++)step();assert.equal(f.status,'shelved');assert.equal(f.audience,0);assert.equal(f.receipts,0);assert.equal(f.releaseMonth,null);assert.equal(f.productionCompletedMonth,6);assert.equal(JSON.stringify(f.reviews),review);assert.equal(f.quality,quality);
const another=s.films.find(o=>o.id!==f.id);const copy={...another,genres:[...f.genres]};assert.ok(!E.competitors(s,copy,s.month,true).includes(f));
E.unshelveFilm(s,f.id);assert.equal(f.status,'ready');assert.equal(f.readyMonth,6);E.shelveFilm(s,f.id);E.releaseFilm(s,f.id);assert.equal(f.releaseMonth,21);assert.equal(f.productionCompletedMonth,6);assert.equal(f.storageHistory.at(-1).action,'release');assert.throws(()=>E.shelveFilm(s,f.id));step();assert.ok(f.audience>0);
const events={month:4,marketEvents:[{start:2,end:5,genre:'drama',boost:25},{start:3,end:6,genre:'comedy',boost:30}]};assert.equal(V.marketBoost(events,{genres:['drama','comedy']}),30);assert.equal(V.marketBoost(events,{genres:['sf']}),0);assert.equal(V.marketBoost(events,{genres:['drama']},5),0);assert.equal(V.marketBoost(events,{genres:['drama']},2),25);
const no=structuredClone(s),boost=structuredClone(s);no.marketEvents=[];boost.marketEvents=[{start:s.month,end:s.month+2,genre:f.genres[0],boost:30}];resolve(no);resolve(boost);E.advanceMonth(no);E.advanceMonth(boost);const a=no.films.find(x=>x.id===f.id).runs.at(-1),b=boost.films.find(x=>x.id===f.id).runs.at(-1);assert.ok(b.audience>a.audience);assert.equal(b.eventBoost,30);
// Restore old saves without inventing exact historical dates or moving release.
const legacy=structuredClone(s);legacy.version=4;const lf=legacy.films.find(x=>x.id===f.id);delete lf.productionCycles;delete lf.productionCompletedMonth;delete legacy.marketEvents;const cash=E.player(legacy).cash,release=lf.releaseMonth;E.migrateSave(legacy);assert.equal(legacy.version,7);assert.ok(lf.productionCycles[0].inferred);assert.equal(lf.releaseMonth,release);assert.equal(E.player(legacy).cash,cash);assert.ok(E.validateSave(JSON.parse(JSON.stringify(legacy))));
// A second production keeps both the original and additional timeline.
const s2=E.createGame('추가 제작 기록',445);for(const c of s2.companies.slice(1)){c.cash=0;c.debt=150;}const p2=s2.pitches.find(p=>!E.busyFilm(s2,p.writer));const f2=E.greenlight(s2,E.recommend(s2,{script:p2,title:p2.title,genres:[p2.genre],scale:'small',leads:[],supports:[]}));while(f2.status!=='ready'){resolve(s2);E.advanceMonth(s2);resolve(s2);}const firstCycle=JSON.stringify(f2.productionCycles[0]);E.extendFilm(s2,f2.id);assert.equal(f2.productionCycles.length,2);for(let i=0;i<12;i++){resolve(s2);E.advanceMonth(s2);resolve(s2);}assert.equal(f2.status,'ready');assert.equal(JSON.stringify(f2.productionCycles[0]),firstCycle);assert.equal(f2.productionCycles[1].crankIn,6);assert.equal(f2.productionCycles[1].crankUp,16);assert.equal(f2.productionCycles[1].completed,18);
assert.equal(V.APP_VERSION,'1.4.2');assert.equal(V.VERSION_HISTORY[0].version,'1.4.2');assert.equal(V.VERSION_HISTORY.length,14);
console.log('PASS: warehouse persistence, delayed release, no slot/fee, timelines and reshoots, timed genre boosts and expiry, historical migration, version history');
