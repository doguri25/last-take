import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitStartScale} from '../dist/start-screen.js';

assert.equal(fitStartScale(1200,900,1000,700),1,'Large screens do not enlarge the artwork');
assert.equal(fitStartScale(600,900,1200,700),0.5,'Width can be the limiting dimension');
assert.equal(fitStartScale(1200,400,1000,800),0.5,'Height can be the limiting dimension');
assert.equal(fitStartScale(320,480,320,960),0.5,'Narrow portrait screen fits the full page');
for(const invalid of [0,-1,NaN,Infinity,undefined])
  assert.equal(fitStartScale(invalid,640,320,800),1,'Invalid measurements have a finite fallback');
for(let i=1;i<=3000;i++) {
  const w=200+(i*73)%1900,h=180+(i*97)%1200;
  const naturalW=320+(i*31)%1000,naturalH=450+(i*43)%1200;
  const s=fitStartScale(w,h,naturalW,naturalH);
  assert.ok(s>0&&s<=1);
  assert.ok(naturalW*s<=w+1e-9&&naturalH*s<=h+1e-9);
  assert.ok(Math.abs(naturalW*s/(naturalH*s)-naturalW/naturalH)<1e-9);
}
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
assert.match(html,/start-screen\.css\?v=1\.4\.2/);
assert.match(html,/app\.js\?v=1\.4\.2/);
assert.ok(html.indexOf('start-screen.css')>html.indexOf('portrait.css'));
assert.match(app,/startScreen\.sync\(\);syncMobileDock\(\);renderDialog\(\)/);
assert.match(app,/last-take-game-v1/,'The existing save key is unchanged');
console.log('PASS: 3000 proportional-fit cases; viewport module integration; original save key');
