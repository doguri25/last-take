import * as E from '../dist/engine.js';
import * as N from '../dist/casting.js';
import * as X from '../dist/expansion.js';
import {EVENTS} from '../dist/data.js';
import fs from 'node:fs';
const out=process.argv[2];if(!out)throw Error('Output directory is required');fs.mkdirSync(out,{recursive:true});
function create(seed=270){const s=E.createGame('모먼트 필름',seed);const script=s.pitches.find(p=>!E.busyFilm(s,p.writer));const d=E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[]});const f=E.greenlight(s,d);return{s,f};}
function step(s){for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));E.advanceWeek(s);for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));}
const a=create();for(let i=1;i<=24;i++){step(a.s);if([17,18,23,24].includes(i)){const s=structuredClone(a.s);for(const n of s.notifications)n.popup=false;fs.writeFileSync(`${out}/fixture-week-${i}.json`,JSON.stringify(s));}}
a.f.completionAcknowledged=true;X.selectPoster(a.s,a.f.id,6);E.releaseFilm(a.s,a.f.id);for(const n of a.s.notifications)n.popup=false;fs.writeFileSync(`${out}/fixture-showing.json`,JSON.stringify(a.s));
for(let seed=1;seed<100;seed++){
 const s=E.createGame('모먼트 필름',seed),script=s.pitches.find(p=>!E.busyFilm(s,p.writer));
 const d=E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[],requireNegotiation:true,castingAgreements:{}}),reports=N.negotiationReport(s,d);
 if(!reports.some(r=>r.status==='refused')&&reports.some(r=>r.status==='counter')){fs.writeFileSync(`${out}/fixture-fresh.json`,JSON.stringify(s));fs.writeFileSync(`${out}/fixture-meta.json`,JSON.stringify({seed,pitch:script.id,genre:script.genre,draft:d,reports},null,2));console.log('UI seed',seed,'script',script.id,reports.map(r=>r.status));break;}
}
