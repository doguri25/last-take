import * as E from '../dist/engine.js';
import * as X from '../dist/expansion.js';
import {EVENTS} from '../dist/data.js';
import fs from 'node:fs';
const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
function step(s){for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));E.advanceWeek(s);for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));}
function write(name,s){for(const n of s.notifications)n.popup=false;fs.writeFileSync(out+'/'+name+'.json',JSON.stringify(s));}
const s=E.createGame('모먼트 필름',270),script=s.pitches.find(p=>!E.busyFilm(s,p.writer)),d=E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[],formats:['sound']});const f=E.greenlight(s,d);while(f.status!=='ready')step(s);f.completionAcknowledged=true;X.selectPoster(s,f.id,6);write('v12-ready',s);
const ott=structuredClone(s);E.sellToOTT(ott,f.id,'nemoflix');step(ott);write('v12-ott',ott);
E.releaseFilm(s,f.id);for(let i=0;i<3;i++)step(s);for(let i=0;i<12;i++)E.refreshPitches(s);E.borrow(s,30);E.repay(s,10);write('v12-market',s);
fs.writeFileSync(out+'/v12-meta.json',JSON.stringify({filmId:f.id,title:f.title}));
