import {hash} from './career.js';
export const portraitStage = p => p.age < 18 ? 0 : p.age < 40 ? 1 : p.age < 65 ? 2 : 3;
export const portraitKey = p => `${p.id}|${p.gender}|${portraitStage(p)}|face-v2`;
/** Stable per-person facial proportions, feature donors and wardrobe palette.
 * The source photographs remain local. This is deterministic compositing, not an API.
 * A new generation uses its new ID, never the previous person's slot or imageKey.
 */
export function portraitRecipe(p) {
  let seed=hash(p.id+'distinct-face-v2');
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return {base:Math.floor(rnd()*4),donor:Math.floor(rnd()*4),face:.84+rnd()*.32,chin:.86+rnd()*.28,
    eyes:.82+rnd()*.36,eyeY:(rnd()-.5)*.026,nose:.78+rnd()*.44,mouth:.82+rnd()*.36,
    length:.94+rnd()*.12,tilt:(rnd()-.5)*.07,hair:rnd(),blend:.30+rnd()*.35,
    palette:[.76+rnd()*.46,.76+rnd()*.46,.76+rnd()*.46],glasses:rnd()<.30,frame:rnd(),flip:rnd()<.5};
}
const sheets=new Map(),tiles=new Map(),cache=new Map();
const S=168;
function source(gender) {
  if (!sheets.has(gender)) sheets.set(gender,new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{sheets.delete(gender);reject(Error('portrait source'));};
    image.src=new URL(`./assets/portraits-${gender}.png`,import.meta.url).href;
  }));
  return sheets.get(gender);
}
async function tile(gender,stage,row) {
  const key=`${gender}/${stage}/${row}`;if(tiles.has(key))return tiles.get(key);
  const image=await source(gender),canvas=document.createElement('canvas');canvas.width=canvas.height=S;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,stage*image.width/4,row*image.height/4,image.width/4,image.height/4,0,0,S,S);
  const pixels=ctx.getImageData(0,0,S,S).data;tiles.set(key,pixels);return pixels;
}
const gaussian=(x,y,cx,cy,wx,wy)=>Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2)*2);
function sample(a,x,y,c){
  x=Math.max(0,Math.min(S-1.001,x));y=Math.max(0,Math.min(S-1.001,y));
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=(iy*S+ix)*4+c;
  return (a[i]*(1-fx)+a[i+4]*fx)*(1-fy)+(a[i+S*4]*(1-fx)+a[i+S*4+4]*fx)*fy;
}
export async function renderPortrait(p) {
  const key=portraitKey(p);if(cache.has(key))return cache.get(key);
  const r=portraitRecipe(p),stage=portraitStage(p),gender=p.gender==='F'?'F':'M';
  const a=await tile(gender,stage,r.base),b=await tile(gender,stage,(r.base+1+r.donor)%4);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=S;
  const ctx=canvas.getContext('2d'),im=ctx.createImageData(S,S),out=im.data;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const u=x/(S-1),v=y/(S-1),eye=gaussian(u,v,.5,.39,.32,.065),nose=gaussian(u,v,.5,.50,.10,.10),mouth=gaussian(u,v,.5,.60,.17,.07),face=gaussian(u,v,.5,.50,.35,.40),jaw=gaussian(u,v,.5,.67,.24,.10);
    const k=1+(r.face-1)*face+(r.eyes-1)*eye+(r.nose-1)*nose+(r.mouth-1)*mouth+(r.chin-1)*jaw;
    let sx=(.5+(u-.5)/k+r.tilt*(v-.48)*face)*(S-1);
    const sy=(.5+(v-.5)/r.length+r.eyeY*eye)*(S-1);
    if(r.flip)sx=S-1-sx;
    const blend=r.blend*(nose*.34+mouth*.45);
    const wardrobe=Math.max(0,Math.min(1,(v-.75)*6))*(1-gaussian(u,v,.5,.78,.15,.25));
    const hair=gaussian(u,v,.5,.18,.3,.20);
    for(let c=0;c<3;c++){
      const base=sample(a,sx,sy,c),donor=sample(b,sx,sy,c);
      // Only blend local texture/features; masks keep the photo's lighting and silhouette.
      let val=base*(1-blend)+donor*blend;
      val*=1+(r.palette[c]-1)*wardrobe;
      val*=1+(r.hair-.5)*.16*hair;
      out[(y*S+x)*4+c]=Math.min(255,Math.max(0,val));
    }out[(y*S+x)*4+3]=255;
  }
  ctx.putImageData(im,0,0);
  if(r.glasses&&p.age>=18){
    ctx.save();ctx.translate(S*.5,S*(.395-r.eyeY));ctx.rotate(-r.tilt*.6);
    ctx.strokeStyle=r.frame<.5?'rgba(35,28,24,.73)':'rgba(146,125,82,.86)';ctx.lineWidth=S*.008;
    const width=S*.144*r.eyes,height=S*(r.frame<.5?.055:.047);
    for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(sign*S*.11*r.eyes,0,width,height,0,0,Math.PI*2);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(-S*.035*r.eyes,0);ctx.lineTo(S*.035*r.eyes,0);ctx.stroke();ctx.restore();
  }
  const url=canvas.toDataURL('image/webp',.90);cache.set(key,url);
  if(cache.size>500)cache.delete(cache.keys().next().value);
  return url;
}
export function hydratePortraits(root,lookup) {
  const nodes=root.querySelectorAll('img[data-portrait-id]:not([data-face-ready])');
  for(const node of nodes){node.dataset.faceReady='pending';const p=lookup(node.dataset.portraitId);if(!p)continue;
    const task=()=>renderPortrait(p).then(url=>{if(!node.isConnected)return;node.src=url;node.dataset.faceReady='true';node.classList.add('face-ready');}).catch(()=>{node.dataset.faceReady='failed';node.hidden=true;});
    if('requestIdleCallback' in window)requestIdleCallback(task,{timeout:250});else setTimeout(task,0);
  }
}
