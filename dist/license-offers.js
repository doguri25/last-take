/** Two offers per four-week window. Stateless: loading cannot reroll offers. */
export const LICENSE_WINDOW_WEEKS=4;
export const offerPeriod=s=>Math.floor((s.week??s.month*4)/LICENSE_WINDOW_WEEKS);
export const offerWeeksLeft=s=>LICENSE_WINDOW_WEEKS-((s.week??s.month*4)%LICENSE_WINDOW_WEEKS);
export function licenseOffers(s,catalog) {
 const groups=new Map();
 for(const item of catalog){const a=groups.get(item.medium)??[];a.push(item);groups.set(item.medium,a);}
 const order=[];let i=0;
 while(order.length<catalog.length){for(const a of groups.values())if(a[i])order.push(a[i]);i++;}
 if(!order.length)return [];
 const start=offerPeriod(s)*2%order.length;
 return [order[start],order[(start+1)%order.length]].filter((x,i,a)=>a.indexOf(x)===i);
}
