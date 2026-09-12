/** Korea-inspired economics v1. All money is in KRW 100 million.
 * Public reference data and game assumptions are separated in KOREAN_MARKET_MODEL.md.
 * Existing film contracts are intentionally NOT upgraded to this model.
 */
export const ECONOMY_VERSION=1;
export const DIFFICULTIES=Object.freeze([
 {id:'very-easy',name:'매우 쉬움',capital:220,demand:1.18,deal:1.08,overhead:.8,description:'넉넉한 자금과 우호적인 시장 · 제작과 이야기에 집중'},
 {id:'easy',name:'쉬움',capital:180,demand:1.09,deal:1.04,overhead:.9,description:'조금 더 여유 있게 배우는 제작사 경영'},
 {id:'normal',name:'보통',capital:150,demand:1,deal:1,overhead:1,description:'기본 설정 · 창작과 경영의 균형'},
 {id:'hard',name:'어려움',capital:125,demand:.94,deal:.96,overhead:1.1,description:'예산과 공개 시점을 신중하게 선택'},
 {id:'very-hard',name:'매우 어려움',capital:100,demand:.88,deal:.92,overhead:1.2,description:'빠듯한 자금 · 투자와 판권 전략이 중요'}
].map(Object.freeze));
export const DIFFICULTY=Object.freeze(Object.fromEntries(DIFFICULTIES.map(x=>[x.id,x])));
export const MARKET=Object.freeze({ticketWon:9800,vat:.10,filmShare:.50,distribution:.10,producerProfitRight:.40});
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const cents=n=>Math.round((Number(n)||0)*100);
export function difficulty(s){return DIFFICULTY[s?.difficulty]??DIFFICULTY.normal;}
export function initEconomy(s){
 if(s.difficulty==null)s.difficulty='normal';
 if(!DIFFICULTY[s.difficulty])throw Error('저장된 난이도를 확인해 주세요.');
 s.economyVersion=ECONOMY_VERSION;return s;
}
export function modernFilm(f){return f?.economy?.version===ECONOMY_VERSION;}
export function initFilmEconomy(s,f){
 if(s?.economyVersion!==ECONOMY_VERSION)return;
 const level=f.company==='c0'?difficulty(s):DIFFICULTY.normal;
 f.economy={version:ECONOMY_VERSION,...MARKET,difficulty:level.id,demand:level.demand,deal:level.deal,
  returnedCost:0,projectReceipts:0,profitPool:0,theatrical:{gross:0,vat:0,exhibitor:0,distribution:0,royalty:0,pool:0},settlements:[]};
}
/** Fictional per-film fixed fees, NOT a table of real actors' salaries.
 * Fame sets market value; skill and demonstrated film history remain distinct.
 */
export function marketFee(s,p){
 if(s?.economyVersion!==ECONOMY_VERSION)return p.fee;
 const fame=clamp((p.star??50)/100,0,1),skill=clamp((p.skill??50)/100,0,1);
 const fee=({
  writer:()=>.18+.8*fame**1.7+.45*skill,
  director:()=>.30+2*fame**1.8+.60*skill,
  lead:()=>.30+5.2*fame**2.35+.65*skill**1.4,
  support:()=>.06+.75*fame**1.6+.22*skill
 }[p.role]??(()=>p.fee))();
 return round(fee);
}
export function demandFactor(f){return modernFilm(f)?f.economy.demand:1;}
export function dealFactor(f){return modernFilm(f)?f.economy.deal:1;}
/** Gross ticket sales != producer cash. No cinema's hardware cost is charged here. */
export function theatricalSettlement(f,audience,ticketFactor=1){
 if(!Number.isFinite(audience)||audience<0)throw Error('관객 집계가 올바르지 않습니다.');
 if(!modernFilm(f)){
  const gross=round(audience/10000*ticketFactor),royalty=round(gross*.5*(f.script?.license?.share??0));
  return {gross,royalty,pool:round(gross*.5-royalty),legacy:true};
 }
 const e=f.economy,gross=cents(audience*e.ticketWon/1e8*ticketFactor),netVat=Math.round(gross/(1+e.vat));
 const rights=Math.round(netVat*e.filmShare),distribution=Math.round(rights*e.distribution);
 const royalty=Math.round((rights-distribution)*clamp(f.script?.license?.share??0,0,1));
 const result={gross:gross/100,vat:(gross-netVat)/100,exhibitor:(netVat-rights)/100,distribution:distribution/100,royalty:royalty/100,pool:(rights-distribution-royalty)/100};
 return result;
}
export function recordTheatrical(f,detail){
 if(!modernFilm(f))return;
 for(const key of Object.keys(f.economy.theatrical))f.economy.theatrical[key]=round(f.economy.theatrical[key]+(detail[key]??0));
}
/** Cumulative cost-recovery waterfall shared by cinema, OTT and overseas receipts.
 * New post-release costs are borne by the producer; investors never recover more
 * than their actual principal. No clawback of previously distributed profits.
 */
export function splitProjectReceipt(s,f,amount){
 if(!Number.isFinite(amount)||amount<0)throw Error('정산 금액을 확인해 주세요.');
 if(!modernFilm(f)){
  if(!f.investment)return round(amount);
  const share=round(amount*f.investment.share);f.investment.paid=round(f.investment.paid+share);return round(amount-share);
 }
 const e=f.economy,i=f.investment,money=cents(amount),unrecovered=Math.max(0,cents(f.spent)-cents(e.returnedCost));
 const recoup=Math.min(money,unrecovered),principalLeft=i?Math.max(0,cents(i.amount)-cents(i.principalRecovered)):0;
 const investorPrincipal=unrecovered?Math.min(principalLeft,recoup,Math.round(recoup*Math.min(1,principalLeft/unrecovered))):0;
 const profit=money-recoup,investorProfit=i?Math.round(profit*clamp(i.share,0,1)):0;
 const producer=money-investorPrincipal-investorProfit;
 e.returnedCost=round(e.returnedCost+recoup/100);e.projectReceipts=round(e.projectReceipts+money/100);e.profitPool=round(e.profitPool+profit/100);
 if(i){i.principalRecovered=round((i.principalRecovered??0)+investorPrincipal/100);i.profitPaid=round((i.profitPaid??0)+investorProfit/100);i.paid=round((i.paid??0)+(investorPrincipal+investorProfit)/100);}
 const row={week:s.week??s.month*4,pool:money/100,costRecovery:recoup/100,investorPrincipal:investorPrincipal/100,profit:profit/100,investorProfit:investorProfit/100,producer:producer/100};
 e.settlements.push(row);if(e.settlements.length>256)e.settlements.shift();return producer/100;
}
export function breakEvenAudience(f,ticketFactor=1){
 const perViewer=modernFilm(f)?f.economy.ticketWon/(1+f.economy.vat)*f.economy.filmShare*(1-f.economy.distribution)*(1-(f.script?.license?.share??0))*ticketFactor:5000*ticketFactor*(1-(f.script?.license?.share??0));
 const unrecovered=Math.max(0,(f.spent??0)-(f.economy?.returnedCost??0));
 return perViewer>0?Math.ceil(unrecovered*1e8/perViewer):0;
}
export function feeWarning(d,e){
 const fees=e.cast+e.writer;
 return fees>e.total*.35?'제작진 계약료가 제작비의 35%를 넘습니다. 스타의 흥행 효과와 예산 부담을 함께 비교하세요.':'';
}

/** Reject malformed imported snapshots instead of allowing NaN into live accounting. */
export function validateFilmEconomy(f){
 const e=f?.economy;if(e==null)return true;
 const nonnegative=x=>Number.isFinite(x)&&x>=0;
 const rate=x=>nonnegative(x)&&x<=1;
 if(e.version!==ECONOMY_VERSION||!DIFFICULTY[e.difficulty]||!nonnegative(e.ticketWon)||e.ticketWon<=0)return false;
 if(!['vat','filmShare','distribution','producerProfitRight'].every(k=>rate(e[k])))return false;
 if(!['demand','deal'].every(k=>Number.isFinite(e[k])&&e[k]>0&&e[k]<=2))return false;
 if(!['returnedCost','projectReceipts','profitPool'].every(k=>nonnegative(e[k])))return false;
 if(!e.theatrical||!['gross','vat','exhibitor','distribution','royalty','pool'].every(k=>nonnegative(e.theatrical[k])))return false;
 if(!Array.isArray(e.settlements)||e.settlements.length>256||e.settlements.some(x=>!x||!['week','pool','costRecovery','investorPrincipal','profit','investorProfit','producer'].every(k=>nonnegative(x[k]))))return false;
 const i=f.investment;
 if(i&&(!rate(i.share)||!['amount','paid','principalRecovered','profitPaid'].every(k=>nonnegative(i[k]))||i.principalRecovered>i.amount+.001))return false;
 return true;
}
