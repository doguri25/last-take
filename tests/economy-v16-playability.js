/** Bounded economy smoke simulation. Not proof of long-term balance for all strategies. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import * as K from '../dist/economy.js';
import {EVENTS} from '../dist/data.js';
const rows=[];
for(const level of K.DIFFICULTIES){
 const s=E.createGame('첫 작품 플레이 검사',2026,0,level.id);
 const script=s.pitches.find(p=>E.available(s,E.person(s,p.writer))&&!E.busyFilm(s,p.writer));
 const d=E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',runtime:120,leads:[],supports:[]});
 const q=E.estimate(d,s);assert.ok(q.total<level.capital,'First small film must be affordable');
 const f=E.greenlight(s,d);
 const resolve=()=>{for(const x of E.pendingEvents(s)){const i=EVENTS[x.pending][2].findIndex(o=>!o[1]);assert.ok(i>=0);E.resolveEvent(s,x.id,i);}};
 while(f.status!=='ready'&&s.week<40){resolve();E.advanceWeek(s);resolve();}
 assert.equal(f.status,'ready');E.releaseFilm(s,f.id);
 for(let n=0;n<8;n++){resolve();E.advanceWeek(s);resolve();}
 assert.ok(E.validateSave(JSON.parse(JSON.stringify(s))));
 assert.ok(Number.isFinite(E.player(s).cash));
 rows.push({difficulty:level.id,capital:level.capital,initialBudget:q.total,finalCost:f.spent,quality:f.quality,critic:f.score,audience:f.audience,gross:f.gross,producerReceipts:f.receipts,cashAfterEightReleaseWeeks:E.player(s).cash,week:s.week});
 console.log('PASS',level.name,'first film production and 8 release weeks');
}
assert.ok(rows[0].audience>rows.at(-1).audience);
const output=process.argv[2]??'tests/reports/v160-playability.json';fs.writeFileSync(output,JSON.stringify({scope:'One seed, one recommended small film per difficulty, free event choices. Not a guarantee of profit.',rows},null,2));
