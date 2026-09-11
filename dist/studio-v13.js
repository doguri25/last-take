import * as RT from './runtime.js';
import * as T from './taxes.js';
import {sourceInfo} from './source-rights.js';
import {ROLE_NAMES} from './data.js';

// Include people who retired before leaving the active roster, but not people
// merely planning retirement or people who never retired.
export function retiredPeople(s) {
 const unique=new Map([...(s.roster??[]),...Object.values(s.alumni??{})].map(p=>[p.id,p]));
 return [...unique.values()].filter(p=>p.status==='retired'||p.retiredMonth!=null);
}
export function studioItems(s,key) {
 const films=s.films.filter(f=>f.company==='c0');
 if(key==='active')return films.filter(f=>['production','reshoot'].includes(f.status));
 if(key==='ready')return films.filter(f=>f.status==='ready');
 if(key==='audience')return films.filter(f=>f.audience>0).sort((a,b)=>b.audience-a.audience);
 if(key==='trophies')return films.flatMap(f=>(f.awards??[]).map(a=>({film:f,...a}))).sort((a,b)=>b.year-a.year);
 return [];
}
export function createStudioUpdates(ctx) {
 const {ui,E,X,R,esc,btn,icon,tags,avatar,dialogFrame,pageHead,render,renderDialog,mutate,go,persist,toast,features,personCard}=ctx;
 const state=()=>ctx.getGame(),person=id=>E.person(state(),id);
 const back=()=>btn('뒤로가기','feature-back','','ghost');
 const sign=n=>(n>0?'+':'')+n;
 const film=id=>state().films.find(f=>f.id===id);
 const mini=f=>`<span class="mini-poster">${features.posterArt(f)}</span>`;
 const row=(label,value)=>`<div class="relationship-row"><span>${label}</span><strong>${value}</strong></div>`;
 ui.retired??={query:'',role:'all',sort:'recent',page:0};ui.statsPage??=0;

 function licenseList() {
  return dialogFrame('원작 라이선스','원작을 이해하고, 우리 영화의 방향을 정하세요.',
   `<p class="small muted">아래 원작과 저자는 모두 게임 속 가상 설정입니다. 정보 확인에는 비용이 없으며, 선급금은 제작 확정 시 지출됩니다.</p><div class="rights-grid mt">${X.IPS.map(ip=>`<article class="card rights-card"><div class="row between">${tags([ip.genre])}<span class="tag outline">${esc(ip.medium)}</span></div><h3>${esc(ip.title)}</h3><p class="rights-byline">${esc(ip.author)} · ${ip.year} · ${esc(ip.format)}</p><p class="rights-tagline">${esc(ip.tagline)}</p><p class="small muted">${esc(ip.synopsis)}</p><div class="rights-terms">선급 ${E.money(ip.fee)} · 제작사 수익의 ${Math.round(ip.share*100)}%</div>${btn('원작 정보 · 계약 조건','rights-info',`data-id="${ip.id}"`,'ghost')}</article>`).join('')}</div>`,btn('닫기','close','','ghost'));
 }
 function rightsInfo(id) {
  const selected=X.IPS.find(x=>x.id===id)??ui.draft?.script?.license;
  if(!selected)return dialogFrame('원작 정보','','원작 정보를 찾을 수 없습니다.',back());
  const ip=sourceInfo(selected),already=ui.draft?.script?.license?.id===ip.id;
  return dialogFrame(esc(ip.title),`${esc(ip.medium)} 원작 · ${esc(ip.author)} · ${ip.year}`,
   `<div class="rights-intro">${tags([ip.genre])}<h3>${esc(ip.tagline)}</h3><p>${esc(ip.synopsis)}</p></div><div class="rights-two-column"><section class="card"><h3>원작의 세계</h3>${row('원작 구성',esc(ip.format))}${row('주요 독자·시청층',esc(ip.audience))}${row('각색 권장 길이',ip.runtime+'분')}<p class="small mt">${esc(ip.world)}</p><h4 class="mt">주요 등장인물</h4>${ip.characters.map(([name,text])=>`<p class="small mt-sm"><strong>${esc(name)}</strong> · ${esc(text)}</p>`).join('')}</section><section class="card"><h3>영화화 방향</h3><p class="small mt-sm">${ip.themes.map(esc).join(' · ')}</p><h4 class="mt">살릴 매력</h4><p class="small">${esc(ip.strength)}</p><h4 class="mt">각색 시 주의점</h4><p class="small">${esc(ip.risk)}</p><details class="fold-section"><summary>전체 이야기 · 결말 포함</summary>${ip.plot.split('\n\n').map(x=>`<p class="small mt-sm">${esc(x)}</p>`).join('')}</details></section></div><section class="card rights-contract"><h3>라이선스 조건</h3>${row('선급금',E.money(ip.fee))}${row('수익배분',Math.round(ip.share*100)+'%')}<p class="small muted">극장 매출의 50%인 제작사 몫에서 원작료를 차감합니다. OTT는 계약금에서 같은 비율을 차감합니다. 속편도 동일한 조건을 적용합니다. 선급금은 총 제작비에 포함되며 정보 열람이나 기획만으로 차감되지 않습니다.</p></section>`,`${back()}${!already?btn('이 원작으로 기획','license',`data-id="${ip.id}"`,'primary'):''}`);
 }
 function runtimeOptions(d) {
  return `<section class="runtime-planning"><div class="field-label">러닝타임 <small>후반작업에서 1회 편집 가능</small></div><div class="runtime-options">${RT.RUNTIMES.map(n=>`<button class="runtime-option ${RT.runtimeOf(d)===n?'selected':''}" data-action="runtime-select" data-id="${n}" aria-pressed="${RT.runtimeOf(d)===n}"><strong>${n}<small>분</small></strong><span>하루 ${RT.dailyShows(n)}회</span><small>촬영·후반비 ×${RT.runtimeCostFactor({runtime:n})}</small></button>`).join('')}</div><p class="small muted">이 작품의 권장 길이 ${RT.idealRuntime(d)}분 · 선택에 따른 품질 ${sign(RT.runtimeQuality(d))}점. 회차는 게임 기준(하루 12시간, 회차 사이 20분)이며 실제 극장 편성표가 아닙니다. 120분 대비 상영 여력 ${Math.round(RT.capacityFactor(d)*100)}%가 개봉 관객 계산에 반영됩니다.</p></section>`;
 }
 function editingPanel(f) {
  if(!f)return '<p>영화를 찾을 수 없습니다.</p>';
  const q=f.pendingEdit,can=RT.editingAvailable(f),current=RT.runtimeOf(f),target=ui.editTarget?.[f.id]??current;
  const summary=`<div class="editing-film"><span>${mini(f)}</span><div><h3>${esc(f.title)}</h3><p class="small muted">현재 ${current}분 · 하루 ${RT.dailyShows(f)}회 · 최초 기획 ${f.plannedRuntime??current}분</p></div></div>`;
  if(q) {
   const director=person(q.director),modes=q.conflict?['collaborate','override','cancel']:['agree','cancel'];
   return summary+`<div class="notice ${q.conflict?'warning':''}">${director?avatar(director):''}<div><strong>${q.conflict?'감독과 편집 방향이 충돌했습니다':'감독의 편집 응답이 도착했습니다'}</strong><p>${esc(q.message)}</p>${director?btn(esc(director.name)+' 감독 정보','person-peek',`data-id="${director.id}"`,'text-btn'):''}</div></div><div class="runtime-change"><span>${q.from}분 · ${q.beforeShows}회</span>${icon('arrow')}<strong>${q.to}분 · ${q.afterShows}회</strong></div><p class="small muted">결정 버튼을 누를 때만 편집 비용과 품질·친밀도 변화가 확정됩니다. 미결정 상태에서는 주간 진행을 멈춥니다.</p><div class="edit-decisions">${modes.map(mode=>{const out=RT.editOutcome(q,mode),labels={collaborate:'감독과 협의해 편집',override:'제작사 편집 강행',cancel:'기존 러닝타임 유지',agree:'합의한 편집 확정'};return `<article class="card"><h4>${labels[mode]}</h4>${row('편집비',E.money(out.cost))}${row('작품 품질',sign(out.quality)+'점')}${row('감독 친밀도',sign(out.affinity))}${btn(labels[mode],'runtime-resolve',`data-id="${f.id}" data-mode="${mode}" ${out.cost>0&&out.cost>E.player(state()).cash?'disabled':''}`,mode==='override'?'danger':mode==='cancel'?'ghost':'primary')}${out.cost>0&&out.cost>E.player(state()).cash?'<small class="red">보유 현금이 부족합니다.</small>':''}</article>`;}).join('')}</div>`;
  }
  if(!can)return summary+`<div class="notice"><p>${(f.editHistory??[]).some(h=>h.applied&&h.cycle===f.productionCycles.length)?'이번 제작 회차의 편집을 확정했습니다. 반복 편집으로 품질을 올릴 수 없습니다.':['ready','shelved','showing','closed','streaming'].includes(f.status)?'제작이 완료된 작품은 러닝타임을 바꿀 수 없습니다.':'크랭크업 이후, 제작 완료 전의 후반작업에서 편집할 수 있습니다. 현장 사건이나 하차 문제가 남아 있다면 먼저 해결해 주세요.'}</p></div>${editHistory(f)}`;
  let quote=null;try{if(target!==current)quote=RT.editQuote(state(),f,target,person(f.director),R.affinity(state(),f.director,'c0'));}catch{}
  return summary+`<p class="small muted">촬영본을 재구성해 상영 시간을 조정합니다. 길어지면 복원·추가 후반작업으로 비용이 더 들며, 짧아지면 인물과 서사가 약해질 수 있습니다.</p><div class="runtime-options">${RT.RUNTIMES.map(n=>`<button data-action="edit-target" data-id="${f.id}" data-minutes="${n}" class="runtime-option ${target===n?'selected':''}" aria-pressed="${target===n}"><strong>${n}<small>분</small></strong><span>하루 ${RT.dailyShows(n)}회</span>${n===current?'<small>현재 길이</small>':'<small>편집안</small>'}</button>`).join('')}</div>${quote?`<section class="card edit-preview">${row('기본 편집 비용',E.money(quote.cost))}${row('길이에 따른 품질 변화',sign(quote.quality)+'점')}${row('감독과 충돌 가능성',quote.risk+'%')}<p class="small muted">감독의 반응에 따라 최종 비용·품질이 달라집니다. 다음 화면에서 감독 응답을 보고 최종 결정합니다.</p></section>`:''}<div class="row wrap mt">${btn('감독에게 편집안 제시','runtime-propose',`data-id="${f.id}" ${!quote?'disabled':''}`,'primary')}</div>${editHistory(f)}`;
 }
 function editHistory(f) {
  const records=(f.editHistory??[]).slice().reverse();if(!records.length)return '';
  return `<details class="fold-section"><summary>러닝타임 편집 기록 · ${records.length}건</summary>${records.map(r=>`<p class="small record-line">${E.weekDate(r.week)} · ${r.from}분 → ${r.applied?r.to:r.from}분 · ${esc(r.label)} · ${E.money(r.cost)} · 품질 ${sign(r.quality)}</p>`).join('')}</details>`;
 }
 function retiredPage() {
  const s=state(),r=ui.retired,all=retiredPeople(s),filtered=all.filter(p=>(r.role==='all'||p.role===r.role)&&p.name.includes(r.query.trim()));
  filtered.sort((a,b)=>r.sort==='name'?a.name.localeCompare(b.name,'ko'):r.sort==='old'?(a.retiredMonth??0)-(b.retiredMonth??0):(b.retiredMonth??0)-(a.retiredMonth??0));
  const size=innerWidth<700?12:24,max=Math.max(0,Math.ceil(filtered.length/size)-1);r.page=Math.max(0,Math.min(r.page,max));
  return `${pageHead('은퇴 인물','현역 활동을 마친 영화인의 정보와 작품 이력을 보관합니다.',btn('전체 인물정보','nav','data-view="talents"','ghost'))}<div class="toolbar retired-toolbar"><label class="search-field" for="retired-query">${icon('search')}<input id="retired-query" data-retired="query" value="${esc(r.query)}" placeholder="은퇴 인물 이름 검색"></label><select data-retired="role" aria-label="은퇴 인물 직군"><option value="all">모든 직군</option>${Object.entries(ROLE_NAMES).map(([id,name])=>`<option value="${id}" ${r.role===id?'selected':''}>${name}</option>`).join('')}</select><select data-retired="sort" aria-label="은퇴 인물 정렬">${[['recent','최근 은퇴순'],['old','오래된 은퇴순'],['name','이름순']].map(([id,name])=>`<option value="${id}" ${r.sort===id?'selected':''}>${name}</option>`).join('')}</select></div><p class="small muted mt-sm">검색 ${filtered.length}명 / 은퇴 기록 ${all.length}명 · 은퇴 예정자는 아직 현역 인물정보에 표시됩니다.</p><div class="people-grid retired-grid">${filtered.slice(r.page*size,(r.page+1)*size).map(p=>`<div>${personCard(p)}<p class="retired-date">${p.retiredMonth!=null?E.date(p.retiredMonth)+' 은퇴':'은퇴'}${p.status==='dead'?' · 이후 별세':''}</p></div>`).join('')||`<section class="card empty"><h3>${all.length?'검색 결과가 없습니다.':'아직 은퇴한 인물이 없습니다.'}</h3><p>은퇴가 확정되면 이곳에 자동으로 등록됩니다.</p></section>`}</div><div class="pager">${btn('이전','retired-page',`data-delta="-1" ${!r.page?'disabled':''}`,'ghost small-btn')}<span>${r.page+1} / ${max+1}</span>${btn('다음','retired-page',`data-delta="1" ${r.page===max?'disabled':''}`,'ghost small-btn')}</div>`;
 }
 function statsDialog(key) {
  const labels={active:'동시 제작',ready:'개봉 대기',audience:'누적 관객',trophies:'트로피'},s=state(),items=studioItems(s,key),size=10,max=Math.max(0,Math.ceil(items.length/size)-1);ui.statsPage=Math.min(Math.max(ui.statsPage??0,0),max);
  const count=key==='audience'?E.viewers(E.player(s).totalAudience)+'명':key==='trophies'?E.player(s).trophies+'개':items.length+'편';
  const list=items.slice(ui.statsPage*size,(ui.statsPage+1)*size).map(item=>{const f=key==='trophies'?item.film:item;return `<article class="metric-film-row">${mini(f)}<div><h3>${esc(f.title)}</h3><p class="small muted">${key==='audience'?`누적 관객 ${E.viewers(f.audience)}명 · 주간 기록까지 합산`:key==='trophies'?`${item.year}년 · ${esc(item.category)}`:key==='ready'?`${RT.runtimeOf(f)}분 · ${f.activePromotion?'홍보 종료 대기':'개봉 또는 OTT 배급 가능'}`:`진행 ${Math.round(Math.min(1,(f.status==='reshoot'?(f.reshootElapsedWeeks??f.reshootElapsed*4)/48:(f.elapsedWeeks??f.elapsed*4)/(f.months*4)))*100)}% · ${RT.runtimeOf(f)}분 · ${f.pendingEdit?'편집 결정 대기':ctx.statusLabel(f)}`}</p></div>${btn('작품 보기','film-peek',`data-id="${f.id}"`,'ghost small-btn')}</article>`;}).join('');
  return dialogFrame(labels[key]??'제작사 정보',`${esc(E.player(s).name)} · ${count}`,`<p class="small muted">${key==='ready'?'창고에 보관한 작품은 창고영화 메뉴에서 별도로 확인합니다.':key==='audience'?'우리 제작사 극장 개봉작의 누적 관객입니다. OTT 시청은 합산하지 않습니다.':key==='trophies'?'우리 제작사가 수상한 상을 연도·작품별로 모았습니다.':'현재 제작 슬롯을 사용 중인 우리 작품입니다.'}</p><div class="metric-film-list">${list||'<div class="card empty">아직 해당하는 기록이 없습니다.</div>'}</div>${max>0?`<div class="pager">${btn('이전','stats-page',`data-delta="-1" ${ui.statsPage===0?'disabled':''}`,'ghost small-btn')}<span>${ui.statsPage+1} / ${max+1}</span>${btn('다음','stats-page',`data-delta="1" ${ui.statsPage===max?'disabled':''}`,'ghost small-btn')}</div>`:''}`,`${back()}${btn('관련 메뉴로 이동','nav',`data-view="${{active:'studio',ready:'studio',audience:'portfolio',trophies:'awards'}[key]??'studio'}"`,'ghost')}`);
 }
 function newsDialog(id) {
  const s=state(),m=s.messages.find(m=>String(m.id)===String(id));if(!m)return dialogFrame('이전 소식','','수신함에 더 이상 보관되어 있지 않은 소식입니다.',back());
  const pitches=(m.pitchId?s.pitches.filter(p=>p.id===m.pitchId):m.pitchIds?s.pitches.filter(p=>m.pitchIds.includes(p.id)):s.pitches.filter(p=>m.text.includes(p.title))),f=film(m.filmId),p=person(m.personId);
  const destination={finance:'finance',awards:'awards',award:'awards',trend:'market',industry:'market',script:'scripts'}[m.kind];
  return dialogFrame(esc(m.title),E.recordDate(m),`<article class="news-detail"><p>${esc(m.text)}</p>${p?`<button class="person-chip" data-action="person-peek" data-id="${p.id}">${avatar(p)}<span>${esc(p.name)} · 상세정보</span></button>`:''}${f?`<article class="metric-film-row">${mini(f)}<div><h3>${esc(f.title)}</h3><p>${ctx.statusLabel(f)}</p></div>${btn('영화 상세','film-peek',`data-id="${f.id}"`,'ghost')}</article>`:''}${pitches.map(p=>`<section class="card news-pitch"><h3>${esc(p.title)}</h3>${tags([p.genre])}<p>${esc(p.synopsis)}</p><p class="small muted">${esc(person(p.writer)?.name)} 작가 · 시나리오 ${p.quality}점</p>${p.license?btn('원작 정보','rights-info',`data-id="${p.license.id}"`,'ghost small-btn'):''}${btn('이 시나리오 기획','news-plan',`data-id="${p.id}"`,'primary')}</section>`).join('')}${m.kind==='script'&&!pitches.length?'<p class="small muted mt">이 제안은 이미 제작했거나 새로운 제안으로 교체되었습니다. 현재 시나리오 목록에서 다른 제안을 확인해 주세요.</p>':''}</article>`,`${back()}${destination?btn('관련 정보로 이동','nav',`data-view="${destination}"`,'primary'):''}`);
 }
 function taxDialog() {
  const s=state(),cost=T.monthlyCosts(s),p=T.taxPosition(s),history=[...s.tax.history].reverse(),y=s.tax.years[p.year];
  return dialogFrame('월 운영비 · 세금 상세',`${p.year}년 누적 소득 기준 · 2026년 일반 내국법인 기본세율`,
   `<div class="notice"><p>법인세·법인지방소득세 예상액을 월 운영비에 포함해 적립합니다. <strong>게임의 월 적립이며 실제 세법의 월 납부 제도가 아닙니다.</strong> 대출·자본금은 소득에서 제외합니다.</p></div><div class="rights-two-column"><section class="card"><h3>이번 월 결산 예상</h3>${row('기본 운영비',E.money(cost.base))}${row('대출 이자',E.money(cost.interest))}${row(cost.tax<0?'기존 세금 적립 반환':'추가 세금 적립',E.money(cost.tax))}${row('현금 변동 예상',E.money(-cost.total))}<p class="small muted">현재까지의 소득으로 계산한 예상액입니다. 이번 달 새 정산·제작비에 따라 달라집니다. 반환액이 운영비보다 크면 현금이 증가합니다.</p></section><section class="card"><h3>${p.year}년 소득과 적립</h3>${row('사업 수입',E.money(p.income))}${row('인식한 사업 비용',E.money(p.expenses))}${row('공제 전 소득',E.money(p.profit))}${row('이월결손금 공제',E.money(p.lossUsed))}${row('과세표준',E.money(p.taxable))}${row('현재 소득의 국세 / 지방세',E.money(p.national)+' / '+E.money(p.local))}${row('이미 적립한 세금',E.money(y.reserve))}</section></div><section class="card tax-brackets"><h3>누진 구간 · 구간을 넘는 소득에만 다음 세율 적용</h3>${[['2억 원 이하','10%','1%'],['2억 초과 ~ 200억 원','20%','2%'],['200억 초과 ~ 3,000억 원','22%','2.2%'],['3,000억 원 초과','25%','2.5%']].map(([band,n,l])=>row(band,`국세 ${n} · 지방세 ${l}`)).join('')}</section><details class="fold-section"><summary>월별 적립 내역 · ${history.length}건</summary>${history.map(h=>`<p class="small record-line">${E.date(h.month)} · 과세소득 ${E.money(h.taxable)} · ${h.delta<0?'반환':'추가 적립'} ${E.money(Math.abs(h.delta))} · 연 누적 ${E.money(h.total)}</p>`).join('')||'<p class="small muted">첫 월 결산 후 표시됩니다.</p>'}</details><details class="fold-section"><summary>계산 범위와 법령 출처</summary><p class="small">일반 내국법인의 기본 누진세율·표준 지방세율 및 결손금 15년 이월, 소득의 80% 공제 한도를 적용합니다. 중소기업 여부를 추정하지 않으며 중소기업 100% 공제 특례 등은 구현하지 않습니다. 제작비는 지출 시 비용으로 단순화합니다. 부가가치세, 원천징수, 세액공제·감면, 감가상각, 중간예납·신고기한은 별도 구현하지 않았습니다. 현실의 세무 신고에 사용할 수 없습니다.</p><p class="small muted">${s.tax.legacy?'이전 저장은 업데이트 이후 거래부터 적용하며 과거에 세금을 소급 청구하지 않습니다.':'설립 이후 사업 거래부터 반영합니다.'}</p>${T.TAX_SOURCES.map(([label,url])=>`<p class="small mt-sm"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a></p>`).join('')}</details>`,back());
 }
 function modalMarkup(m) {
  if(m.type==='rights-info')return rightsInfo(m.id);
  if(m.type==='runtime-edit')return dialogFrame('후반작업 · 러닝타임 편집','상영 시간과 감독의 작품 의도를 함께 조율합니다.',editingPanel(film(m.id)),back());
  if(m.type==='studio-stat')return statsDialog(m.id);
  if(m.type==='news-detail')return newsDialog(m.id);
  if(m.type==='tax-details')return taxDialog();
  return null;
 }
 function handleAction(a,id,button) {
  if(['rights-info','runtime-edit','news-detail','tax-details'].includes(a)){if(a==='runtime-edit'){ui.editTarget??={};ui.editTarget[id]=RT.runtimeOf(film(id)??{});}features.deepOpen(a,id);return true;}
  if(a==='studio-stat'){ui.statsPage=0;features.deepOpen(a,id);return true;}
  if(a==='stats-page'){ui.statsPage+=Number(button.dataset.delta);renderDialog();return true;}
  if(a==='retired-page'){ui.retired.page+=Number(button.dataset.delta);render();return true;}
  if(a==='runtime-select'){if(!ui.draft||!RT.RUNTIMES.includes(Number(id)))return true;ui.draft.runtime=Number(id);renderDialog();return true;}
  if(a==='edit-target'){ui.editTarget??={};ui.editTarget[id]=Number(button.dataset.minutes);renderDialog();return true;}
  if(a==='runtime-propose'){mutate(()=>E.proposeRuntimeEdit(state(),id,ui.editTarget?.[id]));return true;}
  if(a==='runtime-resolve'){mutate(()=>{const result=E.resolveRuntimeEdit(state(),id,button.dataset.mode);ui.editTarget??={};ui.editTarget[id]=RT.runtimeOf(film(id));toast(`${result.label} · ${RT.runtimeOf(film(id))}분 · 품질 ${sign(result.quality)}`);});return true;}
  if(a==='news-plan'){ui.peekStack=[];ctx.startPlanning(id);return true;}
  if(a==='license'){ui.peekStack=[];return false;}
  if(a==='notification-open'){const n=state().notifications.find(n=>n.id===Number(id));if(n?.action==='runtime-edit'){n.unread=false;n.popup=false;persist();features.deepOpen('runtime-edit',n.filmId);return true;}}
  return false;
 }
 function handleField(event) {const target=event.target,key=target.dataset.retired;if(!key)return false;ui.retired[key]=target.value;ui.retired.page=0;render();return true;}
 return {licenseList,runtimeOptions,editingPanel,editHistory,retiredPage,modalMarkup,handleAction,handleField};
}
