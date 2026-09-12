// Deliberately seeded states for UI regression; not production game logic overrides.
import * as E from '../dist/engine.js';import * as B from '../dist/studio-growth.js';import * as C from '../dist/cinema.js';import fs from 'node:fs';
const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const fresh=()=>E.createGame('도구리 필름',20260912);
const draft=s=>{const script=s.pitches.find(p=>!E.busyFilm(s,p.writer));return E.recommend(s,{script,title:script.title,genres:[script.genre],runtime:120,scale:'small',leads:[],supports:[]});};
const save=(name,s)=>{s.notifications.forEach(n=>n.popup=false);fs.writeFileSync(`${out}/v15-${name}.json`,JSON.stringify(s));};
const base=fresh(),d=draft(base);B.archiveDraft(base,d,1,{automatic:true});B.saveTeam(base,d,'첫 장면 팀');B.toggleFavorite(base,d.director);save('base',base);
const ready=structuredClone(base),f=E.greenlight(ready,{...d,investorId:'seed'});Object.assign(f,{status:'ready',elapsedWeeks:f.months*4,elapsed:f.months,readyMonth:0,productionCompletedWeek:0,productionCompletedMonth:0,completionAcknowledged:true,poster:4});C.makeCriticReviews(f);C.ensurePlot(f);save('ready',ready);
const feedback=structuredClone(ready);B.startScreening(feedback,f.id);feedback.week=1;B.tickGrowth(feedback);save('feedback',feedback);
const overseas=structuredClone(ready);B.signForeign(overseas,f.id,'east','fixed');B.signForeign(overseas,f.id,'europe','share');overseas.week=1;B.tickGrowth(overseas);overseas.week=2;B.tickGrowth(overseas);save('overseas',overseas);
const festival=structuredClone(ready);festival.week=4;festival.month=1;save('festival',festival);
const released=structuredClone(ready);E.releaseFilm(released,f.id);E.advanceWeek(released);save('released',released);
fs.writeFileSync(out+'/v15-meta.json',JSON.stringify({film:f.id,title:f.title,director:f.director,team:base.studioGrowth.teams[0].id,draftScript:d.script.id}));
console.log('v1.5 UI fixtures created');
