import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/experience.css',import.meta.url),'utf8');
const week=app.slice(app.indexOf('async function nextWeek(){'),app.indexOf('// A failed image load'));
test('weekly popup has no progress bar or fill animation',()=>{
 assert.ok(week.length>0);
 assert.ok(!week.includes('week-progress'));
 assert.ok(!css.includes('week-progress'));
});
test('weekly popup retains old and new date, notice and single advance lock',()=>{
 for(const text of ['E.weekDate(from)','E.weekDate(from+1)','제작 · 홍보 · 흥행을 한 주씩 기록합니다.',"if(ui.advancing||!game||ui.home)return;",'ui.advancing=true','ui.advancing=false','E.advanceWeek(next)','persist()']) assert.ok(week.includes(text),text);
});
test('weekly popup timing and completion cleanup are unchanged',()=>{
 assert.ok(week.includes("matches?300:480"));
 assert.ok(week.includes('setTimeout(r,400)'));
 assert.ok(week.includes('overlay.hidden=true'));
 assert.ok(week.includes("removeAttribute('aria-busy')"));
});
