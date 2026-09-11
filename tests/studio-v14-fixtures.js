import fs from 'node:fs';
import * as E from '../dist/engine.js';
import {EVENTS} from '../dist/data.js';
const out=process.argv[2];if(!out)throw Error('Output directory required');fs.mkdirSync(out,{recursive:true});
const fresh=E.createGame('도구리 테스트 영화사',270);
fs.writeFileSync(`${out}/v14-fresh.json`,JSON.stringify(fresh));
const s=structuredClone(fresh),script=s.pitches.find(p=>!E.busyFilm(s,p.writer));
const f=E.greenlight(s,E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[]}));
const resolve=()=>{for(const f of E.pendingEvents(s))E.resolveEvent(s,f.id,EVENTS[f.pending][2].findIndex(o=>o[1]===0));};
for(let i=0;i<12;i++){resolve();E.advanceWeek(s);resolve();}
for(const n of s.notifications)n.popup=false;
const person=s.roster.find(p=>p.id===f.director);
fs.writeFileSync(`${out}/v14-warm.json`,JSON.stringify(s));
fs.writeFileSync(`${out}/v14-meta.json`,JSON.stringify({film:f.id,person:person.id,name:person.name,title:f.title,role:person.role}));
console.log('Prepared real-game week 0 and week 12 fixtures');
