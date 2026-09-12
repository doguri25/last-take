/** Persistent save slots in IndexedDB, separate from the active-game localStorage.
 * Only completed transactions count as saved. No cloud upload or auto-overwrite on import.
 */
import * as E from './engine.js';
export const VAULT_SLOTS=['manual-1','manual-2','manual-3','auto-0','auto-1','auto-2','safety'];
const clone=x=>JSON.parse(JSON.stringify(x));
const checksum=text=>{let n=2166136261;for(let i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619);}return (n>>>0).toString(16);};
export function exportSave(game){
 if(!E.validateSave(game))throw Error('내보낼 저장 내용을 확인해 주세요.');
 const data=clone(game);return {format:'LASTTAKE-SAVE',formatVersion:1,appVersion:'1.5.0',exportedAt:new Date().toISOString(),checksum:checksum(JSON.stringify(data)),game:data};
}
function finite(n){return typeof n==='number'&&Number.isFinite(n);}
export function parseSave(text){
 if(typeof text!=='string'||text.length>32*1024*1024)throw Error('저장 파일은 32MB 이하 JSON만 지원합니다.');
 let payload;try{payload=JSON.parse(text,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw Error('허용되지 않는 저장 키');return v;});}catch{throw Error('올바른 JSON 저장 파일이 아닙니다. 현재 게임은 바뀌지 않았습니다.');}
 const envelope=payload?.format==='LASTTAKE-SAVE',s=envelope?payload.game:payload;
 if(envelope&&(payload.formatVersion!==1||payload.checksum!==checksum(JSON.stringify(s))))throw Error('저장 파일의 형식 또는 무결성 확인에 실패했습니다.');
 if(!E.validateSave(s)||!finite(s.seed)||!Number.isInteger(s.filmCounter)||!Number.isInteger(s.pitchCounter)||!Number.isInteger(s.ledgerCounter)||s.month>12000||s.films.length>12000||s.ledger.length>300000)throw Error('지원되는 라스트 테이크 저장 데이터가 아닙니다.');
 if(s.roster?.some(p=>typeof p.name!=='string'||!finite(p.skill)||!finite(p.star)||!finite(p.coop)||!finite(p.fee)||!Array.isArray(p.genres)))throw Error('인물 데이터가 손상되었습니다.');
 if(s.ledger.some(l=>!finite(l.amount)||!Number.isInteger(l.id)))throw Error('거래 기록이 손상되었습니다.');
 const g=s.studioGrowth;
 if(g){
  if(!Number.isInteger(g.counter)||g.counter<0||!Number.isFinite(g.lastWeek))throw Error('확장 기록의 시점이 올바르지 않습니다.');
  if(g.version!==1||!Array.isArray(g.favorites)||g.favorites.some(x=>typeof x!=='string')||!Array.isArray(g.teams)||g.teams.length>12||!Array.isArray(g.drafts)||g.drafts.length>9||!g.facilities)throw Error('확장 기능의 저장 형식이 올바르지 않습니다.');
  if(g.teams.some(t=>typeof t.id!=='string'||typeof t.name!=='string'||!Array.isArray(t.leads)||t.leads.length!==2||!Array.isArray(t.supports)||t.supports.length!==4))throw Error('제작팀 기록이 손상되었습니다.');
  if(g.drafts.some(d=>!d.draft?.script?.id||!Array.isArray(d.draft.genres)||d.draft.genres.some(id=>!GENRE_IDS.has(id))||!GENRE_IDS.has(d.draft.script.genre)||typeof d.draft.script.writer!=='string'||!finite(d.draft.script.fee)||typeof d.draft.title!=='string'||!['small','medium','large'].includes(d.draft.scale)||!Array.isArray(d.draft.leads)||!Array.isArray(d.draft.supports)))throw Error('기획 보관함 기록이 손상되었습니다.');
  if(Object.entries(g.facilities).some(([id,f])=>!['editing','sound','stage'].includes(id)||!['lease','own'].includes(f.mode)))throw Error('시설 기록이 손상되었습니다.');
 }
 for(const f of s.films){
  if(f.investment&&(!finite(f.investment.amount)||f.investment.amount<0||!finite(f.investment.share)||f.investment.share<0||f.investment.share>.75||!finite(f.investment.deadline)||!finite(f.investment.paid)))throw Error('투자 계약 기록이 손상되었습니다.');
  if(f.screening&&(!['running','decision','editing','done'].includes(f.screening.status)||!Array.isArray(f.screening.groups)||f.screening.groups.length!==3||f.screening.groups.some(g=>typeof g.name!=='string'||typeof g.text!=='string'||!finite(g.score))||!finite(f.screening.dueWeek)||!finite(f.screening.cost)))throw Error('시사회 기록이 손상되었습니다.');
  if(f.screening?.decision&&(!['keep','recut','reshoot'].includes(f.screening.decision.id)||!finite(f.screening.decision.quality)||!finite(f.screening.decision.cost)))throw Error('시사회 후속 결정이 손상되었습니다.');
  if(f.foreignDeals&&(!Array.isArray(f.foreignDeals)||f.foreignDeals.some(d=>!Array.isArray(d.runs)||!finite(d.receipts)||!finite(d.week)||!['fixed','share'].includes(d.mode)||!['east','europe','north','latin','ocean'].includes(d.territory)||!finite(d.projected)||!['active','complete'].includes(d.status)||d.runs.length>8||d.runs.some(r=>!finite(r.week)||!finite(r.receipts)||!finite(r.gross)))))throw Error('해외 정산 기록이 손상되었습니다.');
  if(f.festivalEntries&&(!Array.isArray(f.festivalEntries)||f.festivalEntries.some(e=>typeof e.key!=='string'||!finite(e.dueWeek)||!['spring','midnight','first','horizon'].includes(e.id)||!['submitted','withdrawn','selected','winner','not-selected'].includes(e.status))))throw Error('영화제 기록이 손상되었습니다.');
 }
 return E.migrateSave(clone(s));
}
import {GENRES} from './data.js';
const GENRE_IDS=new Set(GENRES.map(x=>x.id));
let databasePromise;
function database(){
 if(databasePromise)return databasePromise;
 databasePromise=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('이 환경에서는 저장 슬롯을 사용할 수 없습니다. JSON 내보내기를 이용해 주세요.'));return;}
  const request=indexedDB.open('lasttake-vault',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('saves'))request.result.createObjectStore('saves',{keyPath:'id'});};
  request.onerror=()=>reject(Error('저장 공간을 열지 못했습니다. 브라우저의 저장 권한을 확인해 주세요.'));
  request.onblocked=()=>reject(Error('다른 게임 창을 닫고 저장 관리를 다시 열어 주세요.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();databasePromise=null;};resolve(db);};
 }).catch(e=>{databasePromise=null;throw e;});return databasePromise;
}
export async function putSave(id,game,label=''){
 if(!VAULT_SLOTS.includes(id))throw Error('지원하지 않는 저장 슬롯입니다.');
 const data=exportSave(game),record={id,label:String(label||game.companies[0].name).slice(0,40),company:game.companies[0].name,week:E.weekOf(game),cash:game.companies[0].cash,films:game.films.filter(f=>f.company==='c0').length,updatedAt:Date.now(),data};
 const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(Error('저장하지 못했습니다. 저장 용량을 확인한 뒤 파일로 내보내 주세요.'));tx.onerror=()=>{};tx.objectStore('saves').put(record);});return record;
}
async function read(method,id){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('saves','readonly'),r=id==null?tx.objectStore('saves')[method]():tx.objectStore('saves')[method](id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('저장 슬롯을 읽지 못했습니다.'));});}
export const listSaves=async()=>{const rows=await read('getAll');return rows.map(({data,...meta})=>meta).sort((a,b)=>b.updatedAt-a.updatedAt);};
export async function getSave(id){const row=await read('get',id);if(!row)throw Error('이 슬롯은 비어 있습니다.');return parseSave(JSON.stringify(row.data));}
export async function deleteSave(id){if(!VAULT_SLOTS.includes(id))throw Error('올바른 슬롯을 선택해 주세요.');const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(Error('슬롯을 삭제하지 못했습니다.'));tx.objectStore('saves').delete(id);});}
let autoKey=null,queue=Promise.resolve();
export function autoBackup(game){
 if(!game)return Promise.resolve();
 const key=game.companies[0].name+':'+E.weekOf(game);if(autoKey===key)return queue;
 autoKey=key;const saved=clone(game),id='auto-'+(E.weekOf(game)%3);
 queue=queue.catch(()=>{}).then(()=>putSave(id,saved,'주간 자동 백업')).catch(e=>{if(autoKey===key)autoKey=null;throw e;});return queue;
}
