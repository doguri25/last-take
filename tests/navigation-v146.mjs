import test from 'node:test';
import assert from 'node:assert/strict';
import {cloneNavigationState,createNavigation} from '../dist/navigation.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('screen snapshots preserve data, filters, draft identifiers and scrolling',()=>{
 const input={home:false,view:'talents',modal:{type:'film',id:'f1'},draftId:'p1',state:{people:{query:'김',page:2,available:false},filmTab:'crew',peekStack:[{modal:{type:'person',id:'a1'},reviewPage:0}]},scroll:{page:100,dialog:80,filters:15}};
 const copy=cloneNavigationState(input);
 assert.deepEqual(copy,input);assert.notEqual(copy,input);
 assert.notEqual(copy.state.peekStack,input.state.peekStack);
 copy.state.people.query='박';assert.equal(input.state.people.query,'김');
 assert.doesNotThrow(()=>structuredClone(copy));
});
test('legacy graph helpers cannot trigger DataCloneError in screen snapshots',()=>{
 const old={view:'market',state:{peekStack:[{modal:{type:'film',id:'f1'},chart:{title:'주간 관객',series:[{value:2400}],unit:'명',x:i=>i*20,y:v=>v/2}}]}};
 assert.throws(()=>structuredClone(old),{name:'DataCloneError'});
 const copy=cloneNavigationState(old);
 assert.deepEqual(copy.state.peekStack[0].chart,{title:'주간 관객',series:[{value:2400}],unit:'명'});
 assert.doesNotThrow(()=>structuredClone(copy));
 assert.equal(typeof old.state.peekStack[0].chart.x,'function');
});
test('transient events, DOM-like instances, maps and callbacks are not history data',()=>{
 class RenderNode {constructor(){this.parent=this;}}
 const input={view:'studio',callback(){},node:new RenderNode(),event:new Event('click'),map:new Map(),promise:Promise.resolve(),empty:null,n:2};
 const copy=cloneNavigationState(input);
 assert.deepEqual(copy,{view:'studio',empty:null,n:2});assert.doesNotThrow(()=>structuredClone(copy));
});
test('circular helpers are omitted while shared plain objects and array positions survive',()=>{
 const shared={id:'p1'},input={left:shared,right:shared,list:[undefined,()=>{},0,false,'',null]};input.self=input;
 const copy=cloneNavigationState(input);
 assert.deepEqual(copy,{left:{id:'p1'},right:{id:'p1'},list:[null,null,0,false,'',null]});
 assert.equal(input.self,input);assert.doesNotThrow(()=>structuredClone(copy));
});
test('untrusted prototype keys cannot change the screen snapshot prototype',()=>{
 const copy=cloneNavigationState(JSON.parse('{"view":"studio","__proto__":{"polluted":true}}'));
 assert.equal(Object.getPrototypeOf(copy),Object.prototype);assert.equal(copy.polluted,undefined);
 assert.equal({}.polluted,undefined);
});
test('old graph snapshots support capture, back and forward without touching the game',async()=>{
 let current={home:false,view:'studio',modal:null,state:{peekStack:[]},scroll:{page:0}},position=0;
 const records=[null],listeners=new Set(),game={week:17,cash:78,contracts:{f1:42}},before=structuredClone(game);
 const win={history:{get state(){return records[position]},replaceState(v){records[position]=structuredClone(v)},pushState(v){records.splice(++position);records.push(structuredClone(v))},go(delta){position+=delta;queueMicrotask(()=>listeners.forEach(fn=>fn({state:records[position]})))}},addEventListener(_,fn){listeners.add(fn)},removeEventListener(_,fn){listeners.delete(fn)}};
 const nav=createNavigation({window:win,read:()=>current,restore:s=>current=s,home:()=>({...current,home:true,view:'studio',modal:null})});nav.start();
 current={...current,modal:{type:'film',id:'f1'},state:{...current.state,peekStack:[{modal:{type:'company-info',id:'c0'},chart:{series:[{value:12}],x:()=>1,y:()=>2}}]}};
 nav.schedule();await tick();nav.remember();
 assert.equal(win.history.state.screen.modal.type,'film');assert.equal(win.history.state.screen.state.peekStack[0].chart.x,undefined);
 assert.equal(nav.back(),true);await tick();assert.equal(current.modal,null);assert.equal(current.view,'studio');
 win.history.go(1);await tick();assert.equal(current.modal.type,'film');assert.deepEqual(game,before);
 nav.dispose();
});
