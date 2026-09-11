import test from 'node:test';
import assert from 'node:assert/strict';
import {markNotificationRead} from '../dist/clock.js';
const state = () => ({week:23,companies:[{cash:55,loans:3}],notifications:[
 {id:1,title:'현장 소식',text:'정상 진행 중',unread:true,popup:true},
 {id:2,title:'영화 성과',filmId:'f2',action:'film',unread:true,popup:false},
 {id:3,title:'지난 소식',unread:false,popup:false}
]});
test('reading a message clears only its unread/popup flags',()=>{
 const s=state(),before=structuredClone(s);const item=markNotificationRead(s,'1');
 assert.equal(item,s.notifications[0]);assert.equal(item.unread,false);assert.equal(item.popup,false);
 before.notifications[0].unread=false;before.notifications[0].popup=false;assert.deepEqual(s,before);
});
test('reading the same message twice is idempotent and does not remove it',()=>{
 const s=state();markNotificationRead(s,1);const before=structuredClone(s);
 markNotificationRead(s,'1');assert.deepEqual(s,before);assert.equal(s.notifications.length,3);
});
test('linked messages are read without changing their destination',()=>{
 const s=state(),item=markNotificationRead(s,2);
 assert.equal(item.filmId,'f2');assert.equal(item.action,'film');assert.equal(item.unread,false);
 assert.equal(s.notifications[0].unread,true);
});
test('missing notification IDs or legacy saves are safe no-ops',()=>{
 const s=state(),before=structuredClone(s);
 assert.equal(markNotificationRead(s,404),null);assert.deepEqual(s,before);
 const legacy={week:4};assert.equal(markNotificationRead(legacy,1),null);assert.deepEqual(legacy,{week:4});
 assert.equal(markNotificationRead(null,1),null);
});
test('read flags survive save serialization independently of navigation',()=>{
 const s=state();markNotificationRead(s,1);const restored=JSON.parse(JSON.stringify(s));
 assert.equal(restored.notifications[0].unread,false);assert.equal(restored.notifications[0].popup,false);
 assert.equal(restored.notifications[1].unread,true);assert.equal(restored.week,23);
 assert.deepEqual(restored.companies,s.companies);
});
