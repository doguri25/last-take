import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {PEOPLE} from '../dist/data.js';
import {portrait} from '../dist/expansion.js';
import {dialogKey,createDialogScroll} from '../dist/dialog-state.js';
for(const p of PEOPLE)for(const age of [8,28,52,76]){const x=portrait({...p,age});assert.ok(existsSync(new URL(`../dist/assets/portraits-${x.gender}.png`,import.meta.url)));assert.ok(Number.isInteger(x.row)&&x.row>=0&&x.row<4);assert.equal(x.stage,[8,28,52,76].indexOf(age));}
const ui={modal:{type:'wizard'},draft:{script:{id:'s1'}},step:1,picker:{role:'lead',index:0,page:0}};
const scroll=createDialogScroll(),wizard=dialogKey(ui);assert.equal(scroll.transition(wizard,0),0);
ui.modal={type:'picker'};const picker=dialogKey(ui);assert.equal(scroll.transition(picker,420),0);
ui.modal={type:'wizard'};assert.equal(scroll.transition(dialogKey(ui),1260),420);
ui.modal={type:'picker'};assert.equal(scroll.transition(dialogKey(ui),430),1260);
ui.picker.page=1;assert.equal(scroll.transition(dialogKey(ui),1280),0);
ui.modal={type:'wizard'};assert.equal(scroll.transition(dialogKey(ui),220),430);
ui.step=2;assert.equal(scroll.transition(dialogKey(ui),450),0);
ui.step=1;assert.equal(scroll.transition(dialogKey(ui),500),450);
scroll.clear();assert.equal(scroll.transition(wizard,900),0);
console.log('PASS: all 1600 portraits at four age stages; independent wizard/picker/page/step scroll positions');
