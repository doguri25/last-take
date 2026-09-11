import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import * as X from '../dist/expansion.js';
import * as R from '../dist/relationships.js';
import {EVENTS} from '../dist/data.js';
const s=E.createGame('새 기능 검사',854,6);assert.equal(E.player(s).logo,6);
const p=X.licensePitch(s,'ip0');const d=E.recommend(s,{script:p,title:p.title,genres:[p.genre],scale:'small',leads:[],supports:[]});
const noLicense=structuredClone(d);delete noLicense.script.license;assert.equal(E.round(E.estimate(d,s).total-E.estimate(noLicense,s).total),4);
const f=E.greenlight(s,d),cash=E.player(s).cash;
const expectedCost=R.mediaTerms(s,f,R.AGENCIES.find(a=>a.channel==='youtube'),1.4).cost;const m=X.promote(s,f.id,'youtube',2);assert.equal(E.player(s).cash,E.round(cash-expectedCost));assert.equal(f.awareness,5+m.effect);const unchanged=JSON.stringify(s);assert.throws(()=>X.promote(s,f.id,'youtube',2));assert.equal(JSON.stringify(s),unchanged);
assert.throws(()=>X.selectPoster(s,f.id,2));f.elapsed=Math.ceil(f.months*.75);X.selectPoster(s,f.id,11);assert.equal(f.poster,11);
const candidates=X.cameoCandidates(s,f);assert.ok(candidates.length);for(const x of candidates)assert.equal(E.busyFilm(s,x.p.id),undefined);
const before=E.player(s).cash;const guest=candidates[0].p;const accepted=X.inviteCameo(s,f.id,guest.id);assert.equal(E.player(s).cash,before);if(accepted){assert.equal(E.busyFilm(s,guest.id).id,f.id);assert.ok(E.credits(f).includes(guest.id));}assert.throws(()=>X.inviteCameo(s,f.id,guest.id));
const target=f.leads.find(id=>E.person(s,id).age>=18)??f.director;
const feeEvent=EVENTS.findIndex(x=>x[3]?.type==='fee');f.pending=feeEvent;const paid=f.contracts[target].paid,previousCash=E.player(s).cash;E.resolveEvent(s,f.id,0);assert.equal(E.player(s).cash,E.round(previousCash-E.round(paid*.3)));assert.equal(f.contracts[target].paid,E.round(paid+E.round(paid*.3)));
const scandal=EVENTS.findIndex(x=>x[3]?.type==='scandal');f.pending=scandal;const contractPaid=f.contracts[target].paid;E.resolveEvent(s,f.id,1);assert.ok(f.pastCrew.includes(target));assert.equal(f.contracts[target].refund,contractPaid);assert.equal(f.contracts[target].penalty,E.round(contractPaid*.3));assert.ok(f.contracts[target].settled);assert.equal(E.busyFilm(s,target),undefined);assert.equal(new Set(E.crewIds(f)).size,8);
const replacementIds=E.crewIds(f);for(const other of E.active(s).filter(x=>x.id!==f.id))for(const id of E.crewIds(other))assert.ok(!replacementIds.includes(id));
const cashBeforeMigration=E.player(s).cash,old=structuredClone(s);old.version=2;delete old.films[0].contracts;delete old.films[0].promotions;E.migrateSave(old);assert.equal(old.version,5);assert.equal(E.player(old).cash,cashBeforeMigration);assert.ok(old.films[0].contracts);assert.ok(E.validateSave(JSON.parse(JSON.stringify(old))));
for(const [age,stage] of [[8,0],[28,1],[52,2],[76,3]])assert.equal(X.portrait({...guest,age}).stage,stage);
assert.equal(X.portrait({...guest,id:'reincarnation',age:6}).row,X.portrait(guest).row);
// All three romance-news reactions are reachable and modify interest exactly as recorded.
const reactions=new Set();for(let seed=1;seed<1000&&reactions.size<3;seed++){s.seed=seed;const count=f.businessHistory.length;X.socialNews(s);for(const record of f.businessHistory.slice(count)){if(/결혼|열애설/.test(record.text))reactions.add(record.text.includes('긍정')?'positive':record.text.includes('부정')?'negative':'neutral');}}assert.equal(reactions.size,3);
// Release accounting: royalty is taken from the studio half, never ticket gross.
f.pending=null;f.status='ready';f.reviews=[{name:'검사',base:75}];f.quality=75;f.publicity=0;E.releaseFilm(s,f.id);for(const other of E.myFilms(s))other.pending=null;E.advanceMonth(s);assert.equal(f.runs.length,1);const run=f.runs[0];assert.equal(run.receipts,E.round(run.gross*.5-E.round(run.gross*.5*.09)));assert.equal(f.royalties,E.round(run.gross*.5*.09));assert.equal(f.receipts,run.receipts);
assert.equal(E.round(s.ledger.reduce((sum,l)=>sum+l.amount,0)),E.player(s).cash);
console.log('PASS: licenses, royalties, marketing, extra fees, departure settlements, booking exclusivity, free cameos, portraits, three romance reactions, migration, ledger');
