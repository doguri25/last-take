import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as E from '../dist/engine.js';
import * as N from '../dist/casting.js';
import * as R from '../dist/relationships.js';
function fixture(seed=270){
 const s=E.createGame('교체 검사',seed),script=s.pitches.find(p=>!E.busyFilm(s,p.writer));
 const d=E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',runtime:120,formats:[],leads:[],supports:[],requireNegotiation:true,castingAgreements:{}});
 for(const r of N.negotiationReport(s,d))d.castingAgreements[r.person]={fingerprint:r.fingerprint,accepted:true,total:r.total,extra:r.extra};
 return {s,d};
}
const pool=(s,d,role)=>E.people(s).filter(p=>p.role===role&&E.eligible(s,p,d.genres)&&!E.busyFilm(s,p.id)&&!E.crewIds(d).includes(p.id));
const snap=x=>JSON.stringify(x);
test('all seven casting slots can be replaced without mutating the original draft or game',()=>{
 const {s,d}=fixture(),before=snap(s),original=snap(d);
 for(const oldId of N.castIds(d)){
  const slot=N.replacementSlot(d,oldId),p=pool(s,d,slot.role)[0],n=N.castingReplacement(s,d,oldId,p.id);
  assert.equal(snap(d),original);assert.equal(snap(s),before);
  assert.equal(N.castIds(n).length,7);assert.equal(new Set(N.castIds(n)).size,7);
  assert.ok(!N.castIds(n).includes(oldId));assert.ok(N.castIds(n).includes(p.id));
  assert.deepEqual(N.castIds(n).filter(x=>x!==p.id),N.castIds(d).filter(x=>x!==oldId));
  assert.deepEqual(n.castingAgreements,{});assert.equal(n.requireNegotiation,true);
  const reports=N.negotiationReport(s,n);assert.equal(reports.length,7);
  assert.deepEqual(N.negotiationReport(s,n),reports);
  for(const r of reports.filter(r=>r.person!==p.id))assert.notEqual(r.fingerprint,N.castingOffer(s,d,r.person).fingerprint);
 }
});
test('wrong role, duplicate, missing original, and unavailable replacements are rejected atomically',()=>{
 const {s,d}=fixture(),original=snap(d),before=snap(s);
 assert.throws(()=>N.castingReplacement(s,d,d.director,d.leads[0]),/동일/);
 assert.throws(()=>N.castingReplacement(s,d,d.leads[0],d.leads[1]),/중복/);
 assert.throws(()=>N.castingReplacement(s,d,'absent',pool(s,d,'director')[0].id),/변경/);
 const retired=E.people(s).find(p=>p.role==='director'&&!E.eligible(s,p,d.genres));
 if(retired)assert.throws(()=>N.castingReplacement(s,d,d.director,retired.id),/상태/);
 assert.equal(snap(d),original);assert.equal(snap(s),before);
});
test('a candidate filming another project is blocked by the replacement preview itself',()=>{
 const {s,d}=fixture(),candidate=pool(s,d,'director')[0];
 const active={id:'busy-test',title:'다른 촬영',status:'production',script:d.script,director:candidate.id,leads:[],supports:[]};
 s.films.push(active);const before=snap(s);
 assert.throws(()=>N.castingReplacement(s,d,d.director,candidate.id),/촬영/);
 assert.equal(snap(s),before);
});
test('changing one director recomputes fees and relationship reasons of remaining team members',()=>{
 const {s,d}=fixture(),candidate=pool(s,d,'director')[0],n=N.castingReplacement(s,d,d.director,candidate.id);
 const ids=E.crewIds(n);
 for(const id of ids){R.adjust(s,id,'c0',100,'검사');for(const peer of ids)if(peer!==id)R.adjust(s,id,peer,100,'검사');}
 const good=N.negotiationReport(s,n),factor=R.relationshipFactor(s,E.person(s,n.leads[0]),ids);
 const partner=n.leads[0];R.adjust(s,candidate.id,partner,-100,'검사');
 const bad=N.negotiationReport(s,n),offer=bad.find(r=>r.person===partner);
 assert.ok(offer.reasons.some(x=>x.includes(E.person(s,candidate.id).name)));
 assert.ok(R.relationshipFactor(s,E.person(s,partner),ids)>factor);
 assert.ok(offer.fee>=good.find(r=>r.person===partner).fee); // 0.01억 rounding may leave a small base fee unchanged.
 assert.notDeepEqual(bad,good);
});
test('replacing after accepting signatures requires confirmation of the new team counteroffers',()=>{
 const {s,d}=fixture();let next;
 for(const p of pool(s,d,'director')){
  const n=N.castingReplacement(s,d,d.director,p.id),rs=N.negotiationReport(s,n);
  if(rs.some(r=>r.status==='counter')&&!rs.some(r=>r.status==='refused')){next=n;break;}
 }
 assert.ok(next);const before=snap(s);
 assert.throws(()=>N.validateNegotiations(s,next),/추가 개런티/);
 N.acceptOffers(s,next);N.validateNegotiations(s,next);assert.equal(snap(s),before);
});
test('refusal cannot be accepted and no money is spent by reviewing new replies',()=>{
 const {s,d}=fixture();let refused;
 for(const p of pool(s,d,'lead')){
  const n=N.castingReplacement(s,d,d.leads[0],p.id);
  if(N.negotiationReport(s,n).some(r=>r.status==='refused')){refused=n;break;}
 }
 assert.ok(refused);const before=snap(s),draftBefore=snap(refused);
 assert.throws(()=>N.acceptOffers(s,refused),/거절/);assert.equal(snap(s),before);assert.equal(snap(refused),draftBefore);
});
test('replacement contract charges only the recalculated estimate once at greenlight',()=>{
 const {s,d}=fixture();let n;
 for(const p of pool(s,d,'support')){
  const next=N.castingReplacement(s,d,d.supports[3],p.id);
  if(!N.negotiationReport(s,next).some(r=>r.status==='refused')){n=next;break;}
 }
 assert.ok(n);const before=E.player(s).cash,count=s.ledger.length;N.acceptOffers(s,n);
 const total=E.estimate(n,s).total,reports=N.negotiationReport(s,n),f=E.greenlight(s,n);
 assert.equal(E.round(before-E.player(s).cash),total);assert.equal(s.ledger.length,count+1);
 assert.deepEqual(f.negotiations,reports); // Production starts a new relationship revision; preserve signing-time quotes.
 assert.ok(!E.crewIds(f).includes(d.supports[3]));assert.equal(f.supports[3],n.supports[3]);
});
test('subgenre changes keep native selectors alive rather than render and focus them again',()=>{
 const code=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const section=code.slice(code.indexOf("if(target.dataset.field==='subgenre')"),code.indexOf("if(target.dataset.field==='compat-query')"));
 assert.doesNotMatch(section,/renderDialog\(|render\(/);assert.match(section,/target.blur\(\)/);
 assert.match(section,/data-subgenre-effect/);assert.match(code,/tagName!=='SELECT'/);
});
