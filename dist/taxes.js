import {difficulty} from './economy.js';
import {facilityMonthlyCost} from './studio-growth.js';
/** 2026 ordinary domestic corporation brackets; all values are in KRW 100 million.
 * Monthly reserve transfers are a GAME abstraction, not statutory monthly payments.
 * Production outlays are expensed when paid; VAT, credits and asset depreciation
 * are not simulated. Never use this module for an actual tax return.
 */
export const TAX_RULE_YEAR=2026;
export const TAX_SOURCES=[
 ['국세청 · 2026년 이후 법인세율','https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7746'],
 ['국가법령정보센터 · 지방세법 제103조의20','https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=20&joNo=0103&lsiSeq=282559&urlMode=lsScJoRltInfoR'],
 ['국가법령정보센터 · 법인세법 제13조','https://www.law.go.kr/법령/법인세법/제13조']
];
export const TAX_BRACKETS=[{cap:2,national:.10,local:.01},{cap:200,national:.20,local:.02},{cap:3000,national:.22,local:.022},{cap:Infinity,national:.25,local:.025}];
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const yearOf=s=>2026+Math.floor(s.month/12);
export function corporateTax(profit) {
 if(!Number.isFinite(profit))throw Error('유효한 과세소득이 필요합니다.');
 let national=0,local=0,lower=0;const taxable=Math.max(0,profit),bands=[];
 for(const b of TAX_BRACKETS){const base=Math.max(0,Math.min(taxable,b.cap)-lower);if(base>0)bands.push({base,nationalRate:b.national,localRate:b.local});national+=base*b.national;local+=base*b.local;lower=b.cap;}
 return {taxable:round(taxable),national:round(national),local:round(local),total:round(round(national)+round(local)),bands};
}
const emptyYear=year=>({year,income:0,expenses:0,reserve:0,national:0,local:0,closed:false});
export function initTax(s,{fresh=false}={}) {
 if(s.tax)return s.tax;
 // Existing cash/ledger/films are never changed or taxed retroactively.
 s.tax={version:1,rulesYear:TAX_RULE_YEAR,startMonth:s.month,legacy:!fresh,lastId:fresh?0:s.ledgerCounter??0,years:{},losses:[],history:[],lastMonth:null};
 s.tax.years[yearOf(s)]=emptyYear(yearOf(s));return s.tax;
}
export function syncTax(s) {
 const tax=initTax(s);
 for(const l of [...(s.ledger??[])].filter(l=>l.id>tax.lastId).sort((a,b)=>a.id-b.id)){
  const year=2026+Math.floor(l.month/12),y=tax.years[year]??=emptyYear(year);
  if(!y.closed&&!['capital','investment','loan','repayment','tax','tax-refund'].includes(l.kind)){
   if(l.kind==='overhead')y.expenses=round(y.expenses+(Number.isFinite(l.operatingBase)?l.operatingBase:Math.max(0,-l.amount)));
   else if(l.kind==='boxoffice'||l.kind==='ott'||l.kind==='foreign')y.income=round(y.income+l.amount);
   else y.expenses=round(y.expenses-l.amount-(l.kind==='production'?Math.max(0,l.externalFunding??0):0)); // refunds reduce the corresponding cost
  }
  tax.lastId=Math.max(tax.lastId,l.id);
 }
 return tax;
}
export function taxPosition(s,extraExpenses=0) {
 const tax=syncTax(s),year=yearOf(s),y=tax.years[year]??=emptyYear(year),profit=round(y.income-y.expenses-extraExpenses);
 const losses=tax.losses.filter(x=>x.year<year&&year-x.year<=15&&x.remaining>0);
 const available=round(losses.reduce((sum,x)=>sum+x.remaining,0));
 // Ordinary-corporation default. SME exceptions are deliberately not inferred.
 const used=round(Math.min(available,Math.max(0,profit)*.8));
 return {...corporateTax(Math.max(0,profit-used)),year,income:y.income,expenses:round(y.expenses+extraExpenses),profit,lossAvailable:available,lossUsed:used,reserved:y.reserve,legacy:tax.legacy};
}
export function monthlyCosts(s,{afterInterest=false}={}) {
 const base=round(.25*difficulty(s).overhead+facilityMonthlyCost(s)),interest=afterInterest?0:round((s.companies[0]?.debt??0)*.005),position=taxPosition(s,base+interest);
 const settled=s.tax.lastMonth===s.month,delta=settled?0:round(position.total-position.reserved);
 return {base,interest,tax:delta,total:round(base+interest+delta),overhead:round(base+delta),position,settled};
}
/** Called just before recording the single overhead entry, never from a read-only view. */
export function reserveMonthlyTax(s) {
 const tax=syncTax(s);if(tax.lastMonth===s.month)return null;
 const costs=monthlyCosts(s,{afterInterest:true}),p=costs.position,y=tax.years[p.year];
 y.reserve=p.total;y.national=p.national;y.local=p.local;tax.lastMonth=s.month;
 tax.history.push({month:s.month,week:s.week??s.month*4,year:p.year,profit:p.profit,taxable:p.taxable,lossUsed:p.lossUsed,national:p.national,local:p.local,total:p.total,delta:costs.tax,operatingBase:costs.base});
 return costs;
}
/** Close the year without a second cash debit: reserves already left available cash. */
export function closeTaxYear(s) {
 const tax=syncTax(s),p=taxPosition(s),y=tax.years[p.year];if(y.closed)return y;
 let remaining=p.lossUsed;
 for(const loss of tax.losses.sort((a,b)=>a.year-b.year))if(loss.year<p.year&&p.year-loss.year<=15){const use=Math.min(loss.remaining,remaining);loss.remaining=round(loss.remaining-use);remaining=round(remaining-use);}
 if(p.profit<0)tax.losses.push({year:p.year,remaining:round(-p.profit)});
 Object.assign(y,{closed:true,profit:p.profit,taxable:p.taxable,lossUsed:p.lossUsed,national:p.national,local:p.local,total:p.total});
 return y;
}
