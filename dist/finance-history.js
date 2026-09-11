/** Financial observations. Balances are ledger observations. The fixed-cost series records the monthly estimate visible at that time. */
import {syncTax,monthlyCosts} from './taxes.js';
import {weekOf, recordDate} from './clock.js';
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const fields = ['cash','receipts','debt','fixed','net','gross','ott'];
export const FINANCE_METRICS = {
  cash: ['보유 현금', '억 원'], receipts: ['누적 정산', '억 원'],
  debt: ['대출 잔액', '억 원'], fixed: ['월 운영비 · 세금 포함', '억 원'],
  net: ['현금 − 대출 잔액', '억 원'], gross: ['누적 극장 매출', '억 원'], ott: ['누적 OTT 정산', '억 원']
};
function balances(s) {
  const c=s.companies[0];
  return {cash:round(c.cash),receipts:round(c.totalReceipts||0),debt:round(c.debt),fixed:monthlyCosts(s).total,net:round(c.cash-c.debt),gross:round(c.totalGross||0),ott:round(c.totalOttReceipts||0)};
}
/** Reconstruct only the retained, consecutive ledger window in a legacy save. */
export function initFinanceHistory(s) {
  if (Array.isArray(s.financeHistory)) return;
  const entries=[...s.ledger].sort((a,b)=>a.id-b.id), current=balances(s);
  let cash=current.cash,debt=current.debt,receipts=current.receipts,ott=current.ott;
  const history=[];
  for (const l of entries.slice().reverse()) {
    history.push({week:Number.isInteger(l.week)?l.week:null,month:l.month,ledgerId:l.id,
      cash:round(cash),debt:round(debt),receipts:round(receipts),ott:round(ott),
      fixed:round(.25+debt*.005),net:round(cash-debt),gross:null,
      label:l.description,source:'ledger'});
    cash-=l.amount;
    if(l.kind==='loan'||l.kind==='repayment')debt-=l.amount;
    if(l.kind==='boxoffice'||l.kind==='ott')receipts-=l.amount;
    if(l.kind==='ott')ott-=l.amount;
  }
  s.financeHistory=history.reverse();
  s.financeHistoryInfo={fromLedger:true,complete:entries[0]?.kind==='capital',firstId:entries[0]?.id??null,
    note:entries[0]?.kind==='capital'?'설립 자본금부터 기록합니다.':'이전 저장에 남아 있는 거래부터 복원했습니다. 그 이전 기록은 없습니다.'};
  recordFinance(s,'현재 잔액');
}
export function recordFinance(s,label='잔액 확인') {
  syncTax(s);
  if (!Array.isArray(s.financeHistory)) {initFinanceHistory(s);return;}
  const values=balances(s),last=s.financeHistory.at(-1);
  const point={week:weekOf(s),month:s.month,ledgerId:s.ledgerCounter??0,label,source:'recorded',...values};
  if(last&&last.week===point.week&&fields.every(k=>last[k]===point[k]))return;
  s.financeHistory.push(point);
}
export function financeSeries(s,key) {
  if(!FINANCE_METRICS[key])return [];
  // Unknown legacy gross values stay unknown; they do not become zero.
  return (s.financeHistory??[]).filter(x=>Number.isFinite(x[key])).map((x,i)=>({...x,value:x[key],date:recordDate(x),index:i}));
}
export function runSeries(f,key) {
  let cumulative=0;
  return f.runs.map((r,i)=>{cumulative+=r.audience;return {...r,index:i,date:recordDate(r),value:key==='cumulative'?cumulative:r[key]};}).filter(r=>Number.isFinite(r.value));
}
/** Cumulative totals as of a displayed reporting period, not future receipts. */
export function runTotalsThrough(f,run) {
  const index=f.runs.indexOf(run);
  if(index<0)return {audience:0,receipts:0};
  return f.runs.slice(0,index+1).reduce((total,r)=>({audience:total.audience+r.audience,receipts:round(total.receipts+(r.receipts??0))}),{audience:0,receipts:0});
}
export function trendAt(f,run,key) {
  const i=f.runs.indexOf(run),prev=f.runs[i-1];
  if(!prev)return {direction:'new',symbol:'NEW',label:'첫 집계',percent:null};
  const weekly=Number.isInteger(run.week),sameKind=weekly===Number.isInteger(prev.week);
  if(!sameKind||(weekly?run.week-prev.week!==1:run.month-prev.month!==1))return {direction:'unknown',symbol:'—',label:'비교 가능한 직전 기록 없음',percent:null};
  const a=prev[key],b=run[key];
  if(a===0&&b!==0)return {direction:'up',symbol:'↑',label:'직전 0에서 증가',percent:null};
  const pct=a===0?0:round((b-a)/Math.abs(a)*100);
  return {direction:pct>0?'up':pct<0?'down':'flat',symbol:pct>0?'↑':pct<0?'↓':'→',percent:pct,label:pct===0?'변동 없음':`${pct>0?'+':''}${pct.toFixed(1)}%`};
}
