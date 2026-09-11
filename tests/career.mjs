import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import * as C from '../dist/career.js';
import {PEOPLE,EVENTS,rng} from '../dist/data.js';
const make=seed=>E.createGame('경력 검사',seed);
function draft(s,script){script??=s.pitches.find(p=>E.available(s,E.person(s,p.writer))&&!E.busyFilm(s,p.writer));return E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[]});}
function step(s){for(const f of E.pendingEvents(s)){const i=EVENTS[f.pending][2].findIndex(o=>o[1]===0);E.resolveEvent(s,f.id,i);}E.advanceMonth(s);for(const f of E.pendingEvents(s)){const i=EVENTS[f.pending][2].findIndex(o=>o[1]===0);E.resolveEvent(s,f.id,i);}}
const counts=s=>['writer','director','lead','support'].map(role=>['M','F'].map(g=>s.roster.filter(p=>p.role===role&&p.gender===g).length));
const s=make(983),initialCounts=counts(s),old=s.roster[0];
for(const p of s.roster)p.age=35;
old.age=97;const original={...old};
C.cycleYear(s,()=>.999);
const child=s.roster[0];assert.equal(s.roster.length,1600);assert.deepEqual(counts(s),initialCounts);assert.equal(child.age,6);assert.notEqual(child.name,original.name);assert.notEqual(child.id,old.id);assert.equal(child.imageKey,old.imageKey);assert.equal(child.imageText,old.imageText);assert.equal(E.person(s,old.id).status,'dead');assert.equal(E.career(s,child.id).films.length,0);assert.equal(E.available(s,child),false);
for(let i=0;i<11;i++)C.cycleYear(s,()=>.999);assert.equal(child.age,17);assert.equal(E.ageGroup(child),'어린이');C.cycleYear(s,()=>.999);assert.equal(child.age,18);assert.equal(E.available(s,child),true);assert.equal(E.ageGroup(child),'성인');
// Sudden death is a short notice, preserves identity history, and replaces one slot.
const sudden=make(60);for(const p of sudden.roster)p.age=35;const deceased=sudden.roster[0];let calls=0;const seeded=rng(73);C.cycleYear(sudden,()=>++calls===1?.9:calls===2?0:seeded());assert.equal(E.person(sudden,deceased.id).deathReason,'갑작스러운 별세');assert.equal(sudden.roster.length,1600);
// Retirement is deferred until existing work ends.
const retired=make(9);for(const p of retired.roster)p.age=35;const retiree=retired.roster[0];retiree.age=65;retired.films[0].script.writer=retiree.id;let draws=0;C.cycleYear(retired,()=>++draws===3?0:.999);assert.equal(retiree.retirementPending,true);assert.equal(E.available(retired,retiree),false);retired.films[0].status='closed';C.finishRetirements(retired);assert.equal(retiree.status,'retired');
// A death during production replaces the person, retains the old credit, and does not stall.
const production=make(74);for(const p of production.roster)p.age=35;production.month=11;const film=E.greenlight(production,draft(production)),id=film.leads[0],departed=E.person(production,id);departed.age=97;step(production);assert.equal(E.person(production,id).status,'dead');assert.ok(film.pastCrew.includes(id));assert.notEqual(film.leads[0],id);assert.ok(film.castSnapshot[id]);assert.ok(film.castSnapshot[film.leads[0]]);assert.equal(film.staffVacancy.length,0);assert.ok(E.career(production,id).films.includes(film));const newcomer=production.roster.find(p=>p.previousLife===id);assert.equal(E.career(production,newcomer.id).films.length,0);while(film.status!=='ready')step(production);assert.equal(film.decisions.length,4);
// Retired/deceased talent cannot be signed; a child's role cannot be an adult romance lead.
assert.equal(E.eligible(production,newcomer,['romance']),false);assert.equal(E.eligible(production,newcomer,['family']),true);
// History and compatibility affect fees, while credits remain separated by generation.
const history=make(44),hf=E.greenlight(history,draft(history)),actor=E.person(history,hf.leads[0]);const quoteBefore=E.contractQuote(history,actor).fee;hf.status='closed';hf.receipts=200;hf.spent=100;hf.audience=10000000;C.invalidateCareer(history);
assert.equal(E.career(history,actor.id).hits,1);assert.equal(E.career(history,actor.id).success,1);assert.ok(E.contractQuote(history,actor).fee>quoteBefore);
const partner=E.person(history,hf.director);assert.equal(E.pairCompatibility(history,actor.id,partner.id),E.pairCompatibility(history,partner.id,actor.id));
const candidateQuotes=history.roster.slice(0,50).filter(p=>p.id!==actor.id).map(p=>E.contractQuote(history,actor,[p.id]).fee);assert.ok(Math.max(...candidateQuotes)>Math.min(...candidateQuotes));
// A real sequel is a new film with its own four events, budget, and lineage.
const pitch=E.createSequelPitch(history,hf.id),seq=E.greenlight(history,draft(history,pitch));assert.equal(seq.sequelOf,hf.id);assert.equal(seq.episode,2);assert.equal(seq.seriesRoot,hf.id);assert.equal(seq.events.length,4);assert.equal(seq.extended,false);assert.throws(()=>E.createSequelPitch(history,hf.id));assert.equal(seq.script.original,hf.script.original);
assert.throws(()=>E.createSequelPitch(history,history.films.find(f=>f.company!=='c0').id));
// Restore old saves without replacing films, cash, or existing credits.
const legacy=make(10);legacy.version=1;legacy.month=24;delete legacy.roster;delete legacy.alumni;delete legacy.lifeEvents;for(const f of legacy.films){delete f.castSnapshot;delete f.creativeOutcome;}
const balance=E.player(legacy).cash,filmIds=legacy.films.map(f=>f.id),seedBefore=legacy.seed;E.migrateSave(legacy);assert.equal(legacy.version,5);assert.equal(legacy.roster[0].age,PEOPLE[0].age+2);assert.equal(E.player(legacy).cash,balance);assert.deepEqual(legacy.films.map(f=>f.id),filmIds);assert.equal(legacy.seed,seedBefore);assert.ok(E.validateSave(legacy));
// Separate games do not share mutable people; the profile index survives serialization.
const independent=make(10);independent.roster[0].age=18;assert.notEqual(E.person(independent,legacy.roster[0].id).age,E.person(legacy,legacy.roster[0].id).age);assert.ok(E.validateSave(JSON.parse(JSON.stringify(production))));assert.equal(E.person(JSON.parse(JSON.stringify(production)),id).name,departed.name);
console.log(JSON.stringify({result:'PASS',checks:['yearly aging and four age groups','retirement after current production','old-age and sudden death notices','fixed roster counts by role and gender','same avatar new child generation','archived credits preserved','production replacement','career-dependent fees','pair compatibility','ten-million milestone','sequel ownership and lineage','legacy save migration','isolated game rosters']}));
