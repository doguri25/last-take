import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as P from '../dist/portraits.js';
import * as C from '../dist/cinema.js';
import * as E from '../dist/engine.js';
import {PEOPLE} from '../dist/data.js';

test('v142 heading contains a real space even if its line break is hidden',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 assert.match(app,/<h1>당신의 영화사가 <br>시작되는 순간\.<\/h1>/);
 assert.doesNotMatch(app,/영화사가<br>/);
});
test('every adult glasses recipe projects onto source eyes with separated lenses',()=>{
 let checked=0;
 for(const person of PEOPLE)for(const age of [28,52,76]){
  const p={...person,age},r=P.portraitRecipe(p),g=P.glassesGeometry(p);
  if(!r.glasses){assert.equal(g,null);continue;}
  checked++;assert.ok(g.bridge>.018&&g.radiusX>0&&g.radiusY>0);assert.ok(g.distance>g.radiusX*2);
  for(const anchor of P.EYE_LANDMARKS[p.gender][P.portraitStage(p)][r.base]){
   const point=P.projectPortraitPoint(r,anchor),back=P.portraitSourcePoint(r,...point);
   assert.ok(point.every(x=>Number.isFinite(x)&&x>.1&&x<.9));
   assert.ok(Math.hypot(back[0]-anchor[0],back[1]-anchor[1])<.00001);
  }
  assert.deepEqual(P.glassesGeometry(p),g,'renders are deterministic');
 }
 assert.ok(checked>1000);console.log(`Verified ${checked} glasses geometries across 1600 people and 3 adult stages`);
});
test('child-stage portraits have no artificial glasses and cache keys distinguish the new renderer',()=>{
 for(const p of PEOPLE.slice(0,100)){assert.equal(P.glassesGeometry({...p,age:12}),null);assert.match(P.portraitKey(p),/glasses-v3/);}
 assert.equal(new Set(PEOPLE.map(P.portraitKey)).size,1600);
});
test('presentation quotes include setup and workload once, with separate form totals',()=>{
 const d={genres:['drama'],scale:'medium',runtime:120,formats:C.FORMATS.map(f=>f.id)};
 const rows=C.formatCostBreakdown(d),by=Object.fromEntries(rows.map(r=>[r.id,r]));
 assert.equal(C.formatProductionBase(d),22);
 assert.deepEqual(rows.map(r=>r.cost),[6.34,.58,3.84,.64]);
 assert.equal(C.formatEffect(d).cost,11.4);
 assert.equal(C.formatEffect({...d,formats:[]}).cost,0);
 assert.equal(C.formatEffect({...d,formats:['3d','3d']}).cost,by['3d'].cost);
 for(const row of rows)assert.equal(row.cost,E.round(row.setup+row.variable));
});
test('longer runtimes and higher workloads raise new quotes but never scale a fixed preparation fee',()=>{
 for(const format of C.FORMATS){
  let previous=0;
  for(const runtime of [90,120,150,180]){
   const row=C.formatCostBreakdown({genres:['drama'],scale:'medium',runtime,formats:[format.id]})[0];
   assert.ok(row.cost>previous);assert.equal(row.setup,format.setup);previous=row.cost;
  }
 }
 const drama={genres:['drama'],runtime:120,formats:['3d']},sf={...drama,genres:['sf']};
 assert.ok(C.formatEffect(sf,50).cost>C.formatEffect(drama,50).cost);
 assert.equal(C.formatEffect({...drama,script:{fee:999,license:{fee:999}}},50).cost,C.formatEffect(drama,50).cost);
});
test('greenlight charges the displayed amount once and retains its itemized contract',()=>{
 const s=E.createGame('예산 검증',270),script=s.pitches.find(p=>!E.busyFilm(s,p.writer));
 const d=E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',runtime:150,leads:[],supports:[],formats:['3d','imax','sound']});
 const estimate=E.estimate(d,s),cash=E.player(s).cash,ledger=s.ledger.length,f=E.greenlight(s,d);
 assert.equal(E.round(cash-E.player(s).cash),estimate.total);assert.equal(s.ledger.length,ledger+1);
 assert.equal(f.presentationBudget,estimate.formats);assert.deepEqual(f.presentationCostBreakdown,estimate.formatBreakdown);
 assert.equal(f.presentationCostModel,'workload-v142');assert.equal(f.spent,estimate.total);
});
test('loading an older special-format contract does not reprice historical costs or funds',()=>{
 const s=E.createGame('이전 계약 보존',271),script=s.pitches.find(p=>!E.busyFilm(s,p.writer));
 const f=E.greenlight(s,E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',leads:[],supports:[],formats:['imax']}));
 f.presentationBudget=1.23;delete f.presentationCostModel;delete f.presentationCostBreakdown;
 const prior={cash:E.player(s).cash,spent:f.spent,quality:f.quality,budget:f.presentationBudget,ledger:JSON.stringify(s.ledger)};
 const restored=E.migrateSave(JSON.parse(JSON.stringify(s))),film=restored.films.find(x=>x.id===f.id);
 assert.deepEqual({cash:E.player(restored).cash,spent:film.spent,quality:film.quality,budget:film.presentationBudget,ledger:JSON.stringify(restored.ledger)},prior);
});
