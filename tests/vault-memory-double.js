/** Explicit in-memory IndexedDB API test double. This does NOT test disk durability. */
export function installMemoryIndexedDB(target=globalThis){
 const rows=new Map(),control={failNextWrite:false,rows,events:[]};let created=false;
 const later=fn=>setTimeout(fn,0);
 const db={objectStoreNames:{contains:()=>created},createObjectStore(){created=true;},close(){},transaction(name,mode){
  const tx={oncomplete:null,onabort:null,onerror:null,objectStore(){return {
   put(row){const request={};later(()=>{if(control.failNextWrite){control.failNextWrite=false;control.events.push('abort');tx.onabort?.();return;}rows.set(row.id,structuredClone(row));control.events.push('write');request.onsuccess?.();later(()=>{control.events.push('complete');tx.oncomplete?.();});});return request;},
   delete(id){later(()=>{rows.delete(id);tx.oncomplete?.();});},
   get(id){const r={};later(()=>{r.result=structuredClone(rows.get(id));r.onsuccess?.();});return r;},
   getAll(){const r={};later(()=>{r.result=structuredClone([...rows.values()]);r.onsuccess?.();});return r;}
  };}};return tx;}};
 Object.defineProperty(target,'indexedDB',{configurable:true,value:{open(){const r={};later(()=>{r.result=db;if(!created)r.onupgradeneeded?.();r.onsuccess?.();});return r;}}});return control;
}
