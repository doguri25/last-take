import {createStudioUpdates} from './studio-v13.js';
import * as RT from './runtime.js';
import {createStudioFeatures} from './studio-v12.js';
import * as C from './cinema.js';
import {recordFinance} from './finance-history.js';
import * as N from './casting.js';
import {createSound} from './sound.js';
import {hydratePortraits} from './portraits.js';
import {createStartScreenFitter} from './start-screen.js';
import {dialogKey,createDialogScroll} from './dialog-state.js';
import * as V from './release.js';
import * as R from './relationships.js';
import * as X from './expansion.js';
import {GENRES,GENRE,SCALES,SCALE,ROLE_NAMES,EVENTS} from './data.js';
import * as E from './engine.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SAVE_KEY='last-take-game-v1';
let game=null,saveError=false,invalidSave=false;
let features,updates;
try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const parsed=JSON.parse(raw);if(E.validateSave(parsed))game=E.migrateSave(parsed);else invalidSave=true;}}catch{saveError=true;}
const PERSON=new Proxy({}, {get:(_,id)=>E.person(game,id)});
const ui={agencies:{},comparisonQuery:'',comparisonTarget:null,view:'studio',modal:null,draft:null,step:0,market:'boxoffice',scriptGenre:'all',people:{role:'director',gender:'all',genre:'all',query:'',sort:'skill-desc',available:false,page:0,age:'all',status:'all'},picker:null,awardYear:null};
const sound=createSound();
Object.assign(ui,{home:false,advancing:false,businessTab:'promotion',filmTab:'overview',agencyChannel:'all',selectedAgency:null,promoTone:0,posterPage:0,posterChoices:{},popupTimers:new Map()});
const dialogScroll=createDialogScroll();
const startScreen=createStartScreenFitter();
const icons={
 studio:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18M3 7l2-4h16l-2 4M8 3l-2 4m8-4-2 4m8-4-2 4"/>',
 script:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h5"/>',
 people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
 chart:'<path d="M3 3v18h18M7 14v3m5-8v8m5-12v12"/>',
 bank:'<path d="m3 9 9-6 9 6H3zm0 12h18M6 11v7m6-7v7m6-7v7"/>',
 award:'<path d="M8 21h8m-4-5v5M7 3h10v6a5 5 0 0 1-10 0V3zm0 2H4v3a3 3 0 0 0 4 3m9-6h3v3a3 3 0 0 1-4 3"/>',
 library:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16m8-16v16M3 9h5m-5 6h5m8-6h5m-5 6h5"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',back:'<path d="m14 5-7 7 7 7"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',check:'<path d="m5 12 4 4L19 6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 spark:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3z"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12a2 2 0 0 0 4 0"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',refresh:'<path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 5 9 8 9-8"/>'
};
Object.assign(icons,{home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',volume:'<path d="M11 5 6 9H3v6h3l5 4V5zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',mute:'<path d="M11 5 6 9H3v6h3l5 4V5zm5 4 5 6m-5 0 5-6"/>'});
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]??icons.studio}</svg>`;
const btn=(label,action,extra='',cls='')=>`<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const tags=gs=>gs.map(g=>`<span class="tag genre-tag" style="--genre:${GENRE[g].color}">${GENRE[g].name}</span>`).join('');
const plus=n=>`${n>=0?'+':''}${n}`;
const statusLabel=f=>({production:'제작 중',reshoot:'추가 제작',ready:'개봉 대기',shelved:'창고 보관',showing:'상영 중',closed:'상영 종료',streaming:'OTT 공개 중'}[f.status]);
const avatar=(p,large=false)=>p?`<span class="avatar portrait unique-portrait ${large?'large':''}" role="img" aria-label="${esc(p.name)}의 고유 초상화"><span class="portrait-fallback" aria-hidden="true">${esc(p.name.slice(1))}</span><img data-portrait-id="${esc(p.id)}" alt="" width="168" height="168" decoding="async"></span>`:'';
const gStyle=genre=>`style="--genre:${GENRE[genre].color}"`;
function toast(message,error=false){
 const t=$('toast');t.textContent=message;sound.play(error?'error':'success');t.className='toast visible'+(error?' error':'');
 // A native dialog sits in the browser top layer, above every ordinary z-index.
 const dialog=$('dialog');let feedback=dialog.querySelector('.dialog-feedback');
 if(dialog.open){if(!feedback){feedback=document.createElement('div');feedback.className='dialog-feedback';feedback.setAttribute('role','status');dialog.append(feedback);}feedback.textContent=message;feedback.className='dialog-feedback'+(error?' error':'');feedback.hidden=false;}
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>{t.className='toast';if(feedback)feedback.hidden=true;},4200);
}
function persist(){if(game)recordFinance(game);try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));saveError=false;}catch{saveError=true;}}
function mutate(fn,message){try{const result=fn();persist();render();if(message)toast(message);return result;}catch(error){toast(error.message||'작업을 완료하지 못했습니다.',true);return null;}}
function go(view){ui.peekStack=[];ui.home=false;ui.view=view;ui.modal=null;render();window.scrollTo({top:0,behavior:'instant'});}
function open(type,id){if(type==='film')ui.filmTab='overview';if(type==='business'){ui.businessTab='promotion';ui.selectedAgency=null;ui.agencyChannel='all';ui.agencyPage=0;}if(type==='completion'){ui.posterPage=0;ui.posterContext=null;}ui.modal={type,id};renderDialog();}
function close(){if(ui.peekStack?.length){features.back();return;}if(ui.modal?.type==='negotiation'){ui.modal={type:ui.pendingSelection?'picker':'wizard'};ui.pendingSelection=null;renderDialog();return;}if(ui.modal?.type==='completion'){acknowledgeCompletion(ui.modal.id,false);return;}if(ui.modal?.type==='picker'){ui.modal={type:'wizard'};renderDialog();return;}ui.modal=null;renderDialog();}
function startPage(){return `<div class="start-viewport"><div class="start-page"><header class="start-top"><div class="brand"><span class="brand-mark">L/T</span><div><strong>라스트 테이크</strong><small>FILM STUDIO SIMULATOR</small></div></div><div class="start-tools">${utilityButtons(true)}<button class="text-btn" data-action="versions">v${V.APP_VERSION} · 버전 기록</button></div></header><main id="main" class="start-grid"><div class="start-intro"><div class="wordmark" aria-hidden="true">LAST<span>TAKE.</span></div><h1>당신의 영화사가<br>시작되는 순간.</h1><p>이야기를 고르고, 팀을 모으고,<br>세상에 한 편의 영화를 선보이세요.</p><div class="start-facts"><div><strong>10</strong><small>전체 제작사</small></div><div><strong>1,600</strong><small>영화인</small></div><div><strong>3</strong><small>동시 제작</small></div></div></div>${game?resumeCard():`<form class="setup-card" id="found-form"><div class="setup-step"><span>01</span> YOUR FIRST CREDIT</div><h2>제작사 설립</h2><p>엔딩 크레딧에 올라갈<br>당신의 회사 이름을 정해 주세요.</p>${invalidSave?'<div class="notice warning mt-sm">이전 저장 내용을 읽지 못했습니다. 새 게임을 시작하면 저장 내용이 교체됩니다.</div>':''}<label for="company-name">제작사 이름</label><input id="company-name" name="company" value="모먼트 필름" maxlength="24" required autocomplete="organization" aria-label="제작사 이름"><fieldset class="logo-picker"><legend>제작사 로고</legend>${X.LOGOS.map((mark,i)=>`<label><input type="radio" name="logo" value="${i}" ${i===0?'checked':''}><span>${mark}</span></label>`).join('')}</fieldset><div class="setup-summary"><div><span>시작 자본</span><strong>150억 원</strong></div><div><span>시작 시점</span><strong>2026년 1월</strong></div><div><span>진행 방식</span><strong>카드 선택 · 일주일씩 진행</strong></div></div><button type="submit" class="btn primary full">영화사 설립하기 ${icon('arrow')}</button><p class="save-note">진행 상황은 이 브라우저에 자동 저장됩니다.<br>모든 회사와 인물은 가상 설정입니다.</p></form>`}</main><footer class="start-bottom"><span>시나리오 → 캐스팅 → 제작 → 개봉</span><span>라스트 테이크 · 제작자: 도구리</span></footer></div></div>`;}
const navs=[['studio','studio','제작 스튜디오'],['scripts','script','시나리오 제안'],['talents','people','인물정보'],['market','chart','박스오피스'],['finance','bank','재무 · 은행'],['awards','award','연말 시상식'],['portfolio','library','필모그래피'],['warehouse','library','창고영화'],['ott','globe','OTT 상영관'],['retired','people','은퇴 인물']];
function shell(){
 const c=E.player(game),pending=E.pendingEvents(game).length;
 return `<div class="shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">L/T</span><div><strong>라스트 테이크</strong><small>FILM STUDIO SIM</small></div></div><div class="nav-label">PRODUCTION DESK</div><nav class="nav" aria-label="주 메뉴">${navs.map(([v,i,t])=>`<button data-action="nav" data-view="${v}" class="${ui.view===v?'active':''}" ${ui.view===v?'aria-current="page"':''}>${icon(i)}${t}${v==='studio'&&pending?`<span class="tag green">${pending}</span>`:''}</button>`).join('')}</nav><div class="sidebar-bottom"><nav class="nav"><button data-action="home">${icon('home')}저장하고 첫 화면</button><button data-action="help">${icon('help')}플레이 가이드</button><button data-action="versions">${icon('library')}v${V.APP_VERSION} · 제작자: 도구리</button></nav><div class="studio-identity"><span class="avatar">${X.LOGOS[c.logo??0]}</span><div><strong>${esc(c.name)}</strong><small>독립 제작사 · 대표</small></div></div></div></aside><div class="workspace"><header class="topbar"><div class="topbar-date"><span class="calendar-box">${icon('calendar')}</span><div><strong>${E.weekDate(E.weekOf(game))}</strong><small>${Math.floor(game.month/12)+1}년 차 · 1개월 = 4주</small></div></div><div class="topbar-right">${utilityButtons()}<button class="cash-button" data-action="nav" data-view="finance" aria-label="보유 현금 ${E.money(c.cash)} · 재무 화면"><small>보유 현금</small><strong class="${c.cash<0?'red':''}">${E.money(c.cash)}</strong></button>${btn(`${pending?`현장 결정 ${pending}`:'1주 진행'} ${icon(pending?'bell':'arrow')}`,'advance',ui.advancing?'disabled':'','primary advance-button')}</div></header><main id="main" class="content" data-view="${ui.view}">${saveError?'<div class="notice warning save-warning">자동 저장을 사용할 수 없습니다. 이 창을 닫기 전에 저장 환경을 확인해 주세요.</div>':''}${({studio:studioPage,scripts:scriptsPage,talents:talentsPage,market:marketPage,finance:financePage,awards:awardsPage,portfolio:portfolioPage,warehouse:warehousePage,ott:()=>features.ottPage(),retired:()=>updates.retiredPage()}[ui.view]??studioPage)()}<footer class="page-footer"><span>${esc(c.name)} · ${E.weekOf(game)+1}번째 경영 주</span><span>${saveError?'저장 확인 필요':'자동 저장'} · v${V.APP_VERSION}</span></footer></main></div><nav class="mobile-nav" aria-label="모바일 메뉴">${navs.slice(0,4).map(([v,i,t],n)=>`<button data-action="nav" data-view="${v}" class="${ui.view===v?'active':''}" ${ui.view===v?'aria-current="page"':''}>${icon(i)}${['스튜디오','시나리오','인물정보','흥행'][n]}</button>`).join('')}<button data-action="more">${icon('more')}더보기</button></nav></div>`;
}

function pageHead(title,description='',action=''){return `<div class="page-head"><div><h1>${title}</h1>${description?`<p>${description}</p>`:''}</div>${action}</div>`;}
function stat(label,value,note,i){const key={'동시 제작':'active','개봉 대기':'ready','누적 관객':'audience','트로피':'trophies'}[label];return key?`<button class="stat studio-stat" data-action="studio-stat" data-id="${key}"><span class="stat-label">${label}${icon(i)}</span><strong>${value}</strong><small>${note}</small><span class="stat-link">상세 보기 ${icon('chevron')}</span></button>`:`<div class="stat"><div class="stat-label">${label}${icon(i)}</div><strong>${value}</strong><small>${note}</small></div>`;}
function filmCard(f){
 if(f.status==='streaming')return features.ottFilmCard(f);
 const working=['production','reshoot'].includes(f.status),elapsed=f.status==='reshoot'?(f.reshootElapsedWeeks??f.reshootElapsed*4):(f.elapsedWeeks??f.elapsed*4),total=f.status==='reshoot'?48:f.months*4;
 return `<article class="card film-card compact-film"><div class="film-cover" ${gStyle(f.genres[0])}><div class="row between"><span class="eyebrow">${SCALE[f.scale].name}</span><span class="tag ${f.pending!=null?'orange':f.status==='ready'?'green':'outline'}">${f.pending!=null?'결정 필요':statusLabel(f)}</span></div><h3>${esc(f.title)}</h3><div class="row wrap">${tags(f.genres)}</div></div><div class="film-body">${working?`<div class="film-meta"><span>제작 진행</span><strong>${elapsed} / ${total}주</strong></div><div class="progress" role="progressbar" aria-label="제작 진행" aria-valuenow="${elapsed}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${Math.min(100,elapsed/total*100)}%"></span></div>`:`<div class="compact-film-result">${posterArt(f,f.poster??0)}<div><small>누적 관객</small><strong>${E.viewers(f.audience)}명</strong><small>제작사 정산 ${E.money(f.receipts)}</small></div></div>`}<div class="film-meta"><span>총 제작비</span><strong>${E.money(f.spent)}</strong></div><div class="row wrap">${btn(f.pending!=null?'현장 결정':'영화 상세',f.pending!=null?'event':'film',`data-id="${f.id}"`,'ghost small-btn')}${f.company==='c0'&&X.promotionAvailable(f)?btn(f.activePromotion?'홍보 진행 중':'홍보 관리','business',`data-id="${f.id}"`,'small-btn'):''}</div></div></article>`;
}

function studioPage(){
 const films=E.myFilms(game),active=films.filter(f=>['production','reshoot'].includes(f.status)),ready=films.filter(f=>f.status==='ready'),pending=E.pendingEvents(game),c=E.player(game);
 return `${pageHead('제작 스튜디오',`${esc(c.name)}의 이번 주를 시작하세요.`,btn(`${icon('plus')} 새 영화 기획`,'nav','data-view="scripts"','primary'))}${pending.length?`<div class="event-alert"><strong>${icon('bell')} 현장 결정 ${pending.length}건</strong>${btn('결정하기','event',`data-id="${pending[0].id}"`,'primary small-btn')}</div>`:''}<div class="stats">${stat('동시 제작',`${active.length}<small>/ 3편</small>`,'제작 슬롯','studio')}${stat('개봉 대기',`${ready.length}<small>편</small>`,E.releaseWaitWeeks(game)?`${E.releaseWaitWeeks(game)}주 후 개봉 가능`:'지금 개봉 가능','calendar')}${stat('누적 관객',E.viewers(c.totalAudience)+'<small>명</small>','우리 영화의 관객','people')}${stat('트로피',`${c.trophies}<small>개</small>`,'12월 4주 결산','award')}</div><section><div class="section-head"><h2>제작 라인업 <span class="count">${active.length} / 3</span></h2><span class="small muted">일주일씩, 한 장면씩</span></div><div class="production-grid">${active.map(filmCard).join('')}${active.length<3?`<div class="empty-slot compact-slot"><span class="slot-number">${3-active.length}개 슬롯 여유</span>${icon('plus')}<strong>${active.length?'다음 작품을 함께 준비하세요':'첫 영화를 만들어 보세요'}</strong>${btn('시나리오 살펴보기','nav','data-view="scripts"','ghost small-btn')}</div>`:''}</div></section>${ready.length?`<section class="ready-section"><div class="section-head"><h2>개봉 준비 <span class="count">${ready.length}편</span></h2></div><div class="ready-list">${ready.map(f=>`<div class="ready-row"><div class="ready-title">${posterArt(f,f.poster??0)}<div><h3>${esc(f.title)}</h3><p>평론 ${E.reviewScore(game,f)}점 · 제작 완료</p></div></div>${btn(f.completionAcknowledged?'평론 · 개봉':'포스터 선택',f.completionAcknowledged?'film':'completion',`data-id="${f.id}"`,'primary small-btn')}</div>`).join('')}</div></section>`:''}${warehouseNotice()}<div class="dashboard-bottom compact-dashboard"><section><div class="section-head"><h2>최근 수신함</h2>${btn('알림함','notifications','','ghost small-btn')}</div><details class="fold-section studio-inbox"><summary>${esc(game.messages[0]?.title??'첫 소식을 기다립니다')} · 펼쳐 보기</summary><div class="message-list">${game.messages.slice(0,10).map(messageCard).join('')}</div></details></section><aside><details class="fold-section"><summary>지금 극장에 부는 바람 · ${game.trends.map(g=>GENRE[g].name).join(' / ')}</summary>${marketEventCards()}<p class="small muted">분기 주목 장르의 신규 관객 유입에 12% 보너스.</p></details><details class="fold-section"><summary>경쟁사 제작 소식</summary>${game.films.filter(f=>f.company!=='c0'&&['production','ready'].includes(f.status)).slice(0,5).map(f=>`<p class="small mt-sm">${esc(f.title)} · ${statusLabel(f)}</p>`).join('')}${btn('개봉 전망 보기','nav','data-view="market"','ghost small-btn mt-sm')}</details><div class="notice compact-tip">${icon('clock')}<p>상단 <strong>1주 진행</strong>을 누르면 제작·홍보·흥행이 한 주씩 진행됩니다. 세금 적립을 포함한 운영비와 이자는 4주마다 한 번만 결산합니다.</p></div></aside></div>`;
}

function messageCard(m){const iconsByKind={welcome:'studio',script:'script',production:'studio',review:'script',release:'chart',close:'chart',event:'bell',decision:'check',trend:'chart',award:'award',awards:'award',industry:'globe',finance:'bank'};return `<article class="message"><span class="message-icon ${m.kind}">${icon(iconsByKind[m.kind]??'mail')}</span><div style="flex:1;min-width:0"><div class="row between" style="align-items:start"><h3><button class="news-title-link" data-action="news-detail" data-id="${m.id}">${esc(m.title)} ${icon('chevron')}</button></h3><time>${Number.isInteger(m.week)?`${Math.floor(m.week%48/4)+1}월 ${m.week%4+1}주`:`${m.month%12+1}월`}</time></div><p>${esc(m.text)}</p>${btn('소식 자세히 보기','news-detail',`data-id="${m.id}"`,'text-btn')}${m.filmId?`<button class="text-btn" data-action="film" data-id="${m.filmId}">작품 보기 ${icon('chevron')}</button>`:''}</div></article>`;}
function scriptsPage(){const all=game.pitches.filter(p=>ui.scriptGenre==='all'||p.genre===ui.scriptGenre),size=innerWidth<620?2:(innerHeight<820?(innerWidth>1200?3:2):6),pages=Math.max(1,Math.ceil(all.length/size));ui.scriptPage=E.clamp(ui.scriptPage??0,0,pages-1);const pitches=all.slice(ui.scriptPage*size,(ui.scriptPage+1)*size);const canRefresh=E.player(game).cash>=E.PITCH_REFRESH_COST;return `${pageHead('시나리오 제안','한 편의 영화는 좋은 이야기에서 시작됩니다.',btn('원작 라이선스','licenses','','ghost')+btn(`${icon('refresh')} 다시 받기 · 0.5억`,'refresh-pitches',canRefresh?'':'disabled','ghost'))}<div class="toolbar"><label for="script-genre" class="small muted">장르</label><select id="script-genre" data-field="script-genre"><option value="all">모든 장르</option>${GENRES.map(g=>`<option value="${g.id}" ${ui.scriptGenre===g.id?'selected':''}>${g.name}</option>`).join('')}</select><span class="small muted">${game.pitches.length}편 도착 · ${canRefresh?'0.5억 원으로 6편 교체 · 대기 없음':'수신 비용 0.5억 원 필요'}</span></div>${pitches.length?`<div class="script-grid">${pitches.map((p,i)=>`<article class="card script-card"><div class="script-head" ${gStyle(p.genre)}><div class="row between"><span class="script-no">SCRIPT ${String(ui.scriptPage*size+i+1).padStart(2,'0')}</span>${tags([p.genre])}</div><h3>${esc(p.title)}</h3></div><div class="script-body"><div class="writer-line">${avatar(PERSON[p.writer])}<div><strong>${esc(PERSON[p.writer].name)}</strong><small>작가 · ${PERSON[p.writer].trait} 이야기</small></div><span class="spacer"></span><span class="score-box">${p.quality}<small>시나리오</small></span></div><p>${esc(p.synopsis)}</p><div class="card-info"><span>시나리오 계약 <strong>${E.money(p.fee)}</strong></span><span>${!E.available(game,PERSON[p.writer])?'계약 불가':E.busyFilm(game,p.writer)?'다른 작품 제작 중':'계약 가능'}</span></div>${btn(`이 이야기로 기획 ${icon('arrow')}`,'pitch',`data-id="${p.id}" ${!E.available(game,PERSON[p.writer])||E.busyFilm(game,p.writer)||E.active(game).filter(f=>f.company==='c0').length>=3?'disabled':''}`,'full ghost')}</div></article>`).join('')}</div>`:`<div class="card empty">${icon('script')}<h3>이 장르의 제안이 아직 없습니다.</h3><p>다른 장르를 살펴보거나 원하는 작가에게 시놉시스를 받아 보세요.</p>${btn('작가 찾아보기','writers','','primary')}</div>`}${pages>1?`<div class="pagination">${btn('이전','script-page',`data-delta="-1" ${ui.scriptPage===0?'disabled':''}`,'ghost small-btn')}<span>${ui.scriptPage+1} / ${pages} · ${all.length}편</span>${btn('다음','script-page',`data-delta="1" ${ui.scriptPage===pages-1?'disabled':''}`,'ghost small-btn')}</div>`:''}<details class="fold-section"><summary>원하는 작가에게 직접 의뢰하기</summary><div class="notice">${icon('script')}<div><strong>마음에 맞는 작가에게 직접 의뢰할 수도 있습니다.</strong><p>인물정보의 작가 카드를 열어 시놉시스를 받아 보세요. 계약금은 제작을 확정할 때 지출합니다.</p></div></div></details>`;}
function filterPeople(filter){
 let list=(filter.status==='dead'?Object.values(game.alumni):E.people(game)).filter(p=>p.role===filter.role&&(!filter.age||filter.age==='all'||E.ageGroup(p)===filter.age)&&(!filter.status||filter.status==='all'||p.status===filter.status)&&(filter.gender==='all'||p.gender===filter.gender)&&(filter.genre==='all'||p.genres.includes(filter.genre))&&(!filter.query||p.name.includes(filter.query.trim()))&&(!filter.available||(E.available(game,p)&&!E.busyFilm(game,p.id))));
 const legacy={skill:'skill-desc',star:'star-desc',fee:'fee-asc',fit:'fit-desc'},order=legacy[filter.sort]??filter.sort??'skill-desc';
 const [metric,direction]=order.split('-'),factor=direction==='asc'?1:-1;
 const value=p=>({skill:p.skill,star:p.star,fee:E.contractQuote(game,p).fee,age:p.age,coop:p.coop,fit:ui.draft?E.genreFit(p,ui.draft.genres):p.skill}[metric]??p.skill);
 list.sort((a,b)=>factor*(value(a)-value(b))||a.name.localeCompare(b.name,'ko'));return list;
}
function peopleToolbar(filter,prefix){return `<div class="people-toolbar"><div class="people-filter-main"><div class="search-wrap">${icon('search')}<input id="${prefix}-query" aria-label="인물 이름 검색" type="search" placeholder="이름으로 검색" value="${esc(filter.query)}" data-filter="${prefix}" data-key="query"></div><select id="${prefix}-sort" aria-label="인물 정렬" data-filter="${prefix}" data-key="sort">${[['skill-desc','실력 높은순'],['skill-asc','실력 낮은순'],['star-desc','인지도 높은순'],['star-asc','인지도 낮은순'],['fee-asc','계약료 낮은순'],['fee-desc','계약료 높은순'],['age-asc','나이 낮은순'],['age-desc','나이 높은순'],['coop-desc','협업 높은순'],['coop-asc','협업 낮은순'],...(prefix==='picker'?[['fit-desc','장르 적합 높은순'],['fit-asc','장르 적합 낮은순']]:[])].map(([v,n])=>`<option value="${v}" ${filter.sort===v?'selected':''}>${n}</option>`).join('')}</select></div><details class="filter-details" ${ui.filtersOpen?.[prefix]?'open':''} data-filter-panel="${prefix}"><summary>상세 필터 · 성별 / 장르 / 연령 ${filter.available?'· 섭외 가능만':''}</summary><div class="toolbar"><select id="${prefix}-gender" aria-label="성별" data-filter="${prefix}" data-key="gender"><option value="all">성별 전체</option><option value="M" ${filter.gender==='M'?'selected':''}>남성</option><option value="F" ${filter.gender==='F'?'selected':''}>여성</option></select><select id="${prefix}-genre" aria-label="전문 장르" data-filter="${prefix}" data-key="genre"><option value="all">모든 장르</option>${GENRES.map(g=>`<option value="${g.id}" ${filter.genre===g.id?'selected':''}>${g.name}</option>`).join('')}</select><select id="${prefix}-age" aria-label="연령대" data-filter="${prefix}" data-key="age"><option value="all">모든 연령대</option>${['어린이','성인','중년','노년'].map(a=>`<option value="${a}" ${filter.age===a?'selected':''}>${a}</option>`).join('')}</select>${prefix==='people'?`<select aria-label="활동 상태" data-filter="${prefix}" data-key="status">${[['all','현재 인물 전체'],['active','현역'],['retired','은퇴'],['dead','고인 기록']].map(([v,n])=>`<option value="${v}" ${filter.status===v?'selected':''}>${n}</option>`).join('')}</select>`:''}<label class="check-label"><input id="${prefix}-available" type="checkbox" data-filter="${prefix}" data-key="available" ${filter.available?'checked':''}>섭외 가능만</label></div></details></div>`;}

function personCard(p,picker=false){const busy=E.busyFilm(game,p.id),selected=picker&&E.crewIds(ui.draft).includes(p.id),fit=picker?E.genreFit(p,ui.draft.genres):null;return `<button class="person-card ${busy?'busy':''} ${selected?'selected':''}" data-action="${picker?'choose-person':'person'}" data-id="${p.id}" ${picker&&(busy||selected||!E.eligible(game,p,ui.draft.genres))?'disabled':''}><span class="row">${avatar(p)}<span><strong class="person-name">${esc(p.name)}<small>${p.gender==='M'?'남':'여'}</small></strong><small class="muted">${ROLE_NAMES[p.role]} · ${p.age}세 · ${E.ageGroup(p)}</small></span></span><span class="row wrap" style="gap:5px">${tags(p.genres)}<span class="tag outline">${X.trait(p)}</span></span><span class="person-stats"><span>실력<b>${p.skill}</b></span><span>인지도<b>${p.star}</b></span><span>${picker?'장르 적합':'협업'}<b class="${picker&&fit>=70?'lime':''}">${picker?fit:p.coop}</b></span></span><span class="person-footer"><small>${selected?'선정 완료':p.status==='dead'?'별세':p.status==='retired'?'은퇴':p.retirementPending?'은퇴 예정':!E.available(game,p)?'성장 중':busy?'다른 작품 제작 중':picker&&!E.eligible(game,p,ui.draft.genres)?'이 작품 배역 불가':'섭외 가능'}</small><b>${E.money(p.fee)}</b></span></button>`;}
function pagination(filter,total,prefix){const size=peopleLayout(prefix).size,pages=Math.max(1,Math.ceil(total/size));filter.page=E.clamp(filter.page,0,pages-1);return `<div class="pagination">${btn(`${icon('back')} 이전`,'people-page',`data-prefix="${prefix}" data-delta="-1" ${filter.page===0?'disabled':''}`,'ghost small-btn')}<span>${filter.page+1} / ${pages} · ${size}명씩</span>${btn(`다음 ${icon('chevron')}`,'people-page',`data-prefix="${prefix}" data-delta="1" ${filter.page+1>=pages?'disabled':''}`,'ghost small-btn')}</div>`;}

function peopleResults(filter,prefix){const list=filterPeople(filter),layout=peopleLayout(prefix),page=pagination(filter,list.length,prefix);return `<div class="results-caption">${ROLE_NAMES[filter.role]} ${list.length.toLocaleString('ko-KR')}명 · 인물별 고유 초상화</div>${list.length?`<div class="people-grid" style="--people-columns:${layout.columns}">${list.slice(filter.page*layout.size,filter.page*layout.size+layout.size).map(p=>personCard(p,prefix==='picker')).join('')}</div>${page}`:'<div class="empty"><h3>조건에 맞는 인물이 없습니다.</h3><p>검색어나 필터를 바꿔 주세요.</p></div>'}`;}

function talentsPage(){return `${pageHead('인물정보','실력, 전문 장르, 출연료를 살펴보고 우리 영화에 어울리는 팀을 찾으세요.','<span class="tag outline">총 1,600명</span>')}<div class="tabbar" aria-label="직군 선택">${[['director','감독',200],['writer','작가',200],['lead','주연',400],['support','조연',800]].map(([r,t,n])=>`<button class="${ui.people.role===r?'active':''}" data-action="people-role" data-role="${r}" aria-pressed="${ui.people.role===r}">${t}<small>${n}</small></button>`).join('')}</div>${peopleToolbar(ui.people,'people')}${peopleResults(ui.people,'people')}`;}
function marketPage(){const history=game.marketHistory.at(-1);return `${pageHead('박스오피스','포스터와 숫자로 만나는 이번 주의 영화.')}<div class="tabbar"><button data-action="market-tab" data-tab="boxoffice" class="${ui.market==='boxoffice'?'active':''}">주간 흥행</button><button data-action="market-tab" data-tab="schedule" class="${ui.market==='schedule'?'active':''}">개봉 전망</button><button data-action="market-tab" data-tab="companies" class="${ui.market==='companies'?'active':''}">제작사 순위</button></div>${ui.market==='companies'?companiesTable():ui.market==='schedule'?schedule():`<div class="row between wrap weekly-market-head"><div><h2>${history?E.recordDate(history)+' 집계':'첫 흥행 집계를 기다립니다'}</h2><p class="muted small mt-sm">${history?`주간 매출 ${E.money(history.gross)} · ${E.viewers(history.audience)}명`:'개봉 후 1주 진행 시 첫 성적이 집계됩니다.'}</p></div><span class="tag outline">개봉 후 8주 성과 알림</span></div>${boxofficeTable(history)}<details class="fold-section"><summary>흥행 정산과 상영 종료 기준</summary><p class="small mt-sm">기본 관람료 1만 원(특수상영 가산 별도), 제작사 정산은 매출의 50%에서 원작료를 뺀 금액입니다. 최소 8주 상영 후 주간 관객이 개봉 첫 주의 12% 미만 또는 2,500명 미만이면 종료합니다.</p>${marketEventCards()}</details>`}`;}

function boxofficeTable(period){return features.boxofficeTable(period);}

function schedule(){const films=game.films.filter(f=>['production','reshoot','ready'].includes(f.status)).sort((a,b)=>Math.max(game.month,E.expectedRelease(a))-Math.max(game.month,E.expectedRelease(b)));return `<div class="notice" style="margin-bottom:22px">${icon('calendar')}<p>제작 일정 기준의 예상 개봉 시점입니다. 완성 후 개봉 대기, 추가 제작과 경쟁 상황에 따라 달라질 수 있습니다.</p></div><div class="schedule-list">${films.map(f=>{const m=Math.max(game.month,E.expectedRelease(f)),matches=E.competitors(game,f,m,true).length;return `<article class="card schedule-item"><div class="schedule-date"><small>${2026+Math.floor(m/12)}</small><strong>${String(m%12+1).padStart(2,'0')}<small style="display:inline">월</small></strong></div><div><h3><button class="film-link text-btn" style="font:inherit;color:inherit;padding:0;text-align:left" data-action="film" data-id="${f.id}">${esc(f.title)}</button>${f.company==='c0'?' <span class="tag green">우리 영화</span>':''}</h3><p>${esc(game.companies.find(c=>c.id===f.company).name)} · ${f.genres.map(g=>GENRE[g].name).join(' / ')} · ${statusLabel(f)}</p></div><span class="tag ${matches?'orange':'outline'}">${matches?`유사 장르 ${matches}편`:'경쟁 여유'}</span></article>`;}).join('')||'<div class="empty">제작 중인 영화가 없습니다.</div>'}</div>`;}
function companiesTable(){const cs=[...game.companies].sort((a,b)=>b.totalGross-a.totalGross||b.trophies-a.trophies);return `<p class="results-caption">누적 극장 매출 순위 · 전 제작사 동시 제작 3편 / 개봉 간격 2개월</p><div class="company-list">${cs.map((c,i)=>`<article class="card company-card ${c.id==='c0'?'own':''}"><span class="rank ${i<3?'top':''}">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(c.name)} ${c.id==='c0'?'<span class="tag green">MY</span>':''}</h3><small class="muted">${GENRE[c.genre].name} ${c.id==='c0'?'· 플레이어':'전문'} · 제작 ${E.active(game).filter(f=>f.company===c.id).length}/3편</small></div><div class="company-number"><small>누적 매출</small><strong>${E.money(c.totalGross)}</strong></div><div class="company-number"><small>누적 관객</small><strong>${E.viewers(c.totalAudience)} 명</strong></div><div class="company-number"><small>수상</small><strong>${c.trophies}개</strong></div></article>`).join('')}</div>`;}
function financePage(){return features.financePage();}
function awardsPage(){const selected=game.awards.find(a=>a.year===ui.awardYear)??game.awards.at(-1);const currentYear=2026+Math.floor(game.month/12);return `${pageHead('연말 시상식','흥행의 숫자 너머, 올해의 영화와 영화인을 만납니다.')}<div class="award-header"><div><span class="eyebrow lime">THE FILM AWARDS</span><h2>${selected?selected.year:currentYear} 필름 어워즈</h2><p class="small muted">${selected?`${selected.eligible}편 출품 · 올해를 빛낸 여섯 개의 크레딧`:`${currentYear}년 12월 결산 후 개최 · ${48-E.weekOf(game)%48}주 남음`}</p></div>${icon('award')}</div>${game.awards.length>1?`<div class="toolbar"><label class="small muted" for="award-year">지난 시상식</label><select id="award-year" data-field="award-year">${[...game.awards].reverse().map(a=>`<option value="${a.year}" ${selected.year===a.year?'selected':''}>${a.year}년</option>`).join('')}</select></div>`:''}${selected?.winners.length?`<div class="award-grid">${selected.winners.map(w=>{const f=game.films.find(f=>f.id===w.film);return `<article class="card award-card ${f.company==='c0'?'own':''}"><div class="row between"><span class="eyebrow">${w.category}</span>${icon('award')}</div><h3>${esc(f.title)}</h3><p>${w.person?esc(PERSON[w.person].name)+' · ':''}${esc(game.companies.find(c=>c.id===f.company).name)}</p>${f.company==='c0'?'<span class="tag green" style="align-self:flex-start">우리 제작사 수상작</span>':''}<button class="text-btn" data-action="film" data-id="${f.id}">수상작 살펴보기 ${icon('arrow')}</button></article>`;}).join('')}</div>`:`<div class="card empty">${icon('award')}<h3>${selected?'올해 개봉한 출품작이 없습니다.':'첫 번째 트로피를 기다립니다.'}</h3><p>해당 연도 개봉작을 대상으로 작품상, 감독상, 각본상,<br>남우·여우주연상, 흥행상을 선정합니다.</p></div>`}<div class="notice mt">${icon('award')}<p>작품의 품질, 평론, 담당 영화인의 실력으로 수상작을 결정합니다. 흥행상은 해당 연도 개봉작의 그해 매출을 기준으로 선정합니다.</p></div>`;}
function portfolioPage(){const films=[...E.myFilms(game)].reverse();return `${pageHead('필모그래피',`${X.LOGOS[E.player(game).logo??0]} ${esc(E.player(game).name)}가 만들어 온 모든 크레딧.`,`<span class="tag outline">총 ${films.length}편</span>`)}${films.length?`<div class="portfolio-grid">${films.map(filmCard).join('')}</div>`:`<div class="card empty">${icon('library')}<h3>첫 번째 크레딧을 남겨 보세요.</h3><p>제작 중인 작품부터 상영을 마친 영화까지 이곳에 기록됩니다.</p>${btn('첫 영화 기획하기','nav','data-view="scripts"','primary')}</div>`}`;}
function dialogFrame(title,subtitle,body,footer=''){return `<header class="dialog-header"><div><h2 id="dialog-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button type="button" class="icon-btn" data-action="close" aria-label="닫기">${icon('close')}</button></header><div class="dialog-body">${body}</div>${footer?`<footer class="dialog-footer">${footer}</footer>`:''}`;}
function budgetBox(d){const e=E.estimate(d,game);return `<aside class="budget-box"><h3>제작 예산</h3>${e.negotiation?`<p class="negotiation-budget">섭외 추가 개런티 ${E.money(e.negotiation)} 포함</p>`:''}<p>${R.subgenreNames(d).join(' · ')}<br>세부장르 조합 품질 ${plus(R.subgenreEffect(d))}</p>${d.script.license?`<p>${d.script.license.medium} 원작 · 선급 ${E.money(d.script.license.fee)} 포함 · 제작사 정산 몫의 ${Math.round(d.script.license.share*100)}% 원작료 별도</p>`:''}<div class="budget-line"><span>촬영 · 후반 · 배급 준비<small class="runtime-budget-note">${RT.runtimeOf(d)}분 적용 · 기준 대비 ${plus(e.runtimeAdjustment??0)}억</small></span><strong>${E.money(e.set)}</strong></div><div class="budget-line"><span>시나리오 계약</span><strong>${E.money(e.writer)}</strong></div><div class="budget-line"><span>감독 · 출연진 계약</span><strong>${E.money(e.cast)}</strong></div><div class="budget-line"><span>특수상영 기술 제작</span><strong>${E.money(e.formats??0)}</strong></div><div class="budget-total"><span>총 제작비</span><strong>${E.money(e.total)}</strong></div><div class="budget-line"><span>현재 보유 현금</span><strong class="${E.player(game).cash<e.total?'red':''}">${E.money(E.player(game).cash)}</strong></div><div class="budget-line"><span>계약 후 잔액</span><strong>${E.money(E.player(game).cash-e.total)}</strong></div><div class="quality-bar"><div class="row between small"><span class="muted">기본 예상 품질</span><strong class="lime">${e.quality??'—'}${e.quality?' / 100':''}</strong></div><div class="progress"><span style="width:${e.quality??0}%"></span></div></div><p>제작 확정 시 전액 지출합니다.<br>사건 대응을 위해 약 ${E.money(e.reserve)}의 예비비를 남기는 것을 권합니다. 예상 품질은 사건 선택으로 달라집니다.</p></aside>`;}
function stepIndicator(){return `<div class="steps">${['작품 기획','캐스팅','제작 확정'].map((label,i)=>`${i?'<div class="step-line"></div>':''}<div class="step ${ui.step===i?'active':''}"><span>${i+1}</span>${label}</div>`).join('')}</div>`;}
function castSlot(role,index,id){const p=PERSON[id];return `<button class="cast-slot ${p?'':'empty-cast'}" data-action="cast-slot" data-role="${role}" data-index="${index}">${p?avatar(p):icon('plus')}<span><strong>${p?esc(p.name):`${ROLE_NAMES[role]} ${role==='director'?'선정':String(index+1).padStart(2,'0')}`}</strong><small>${p?`실력 ${p.skill} · 적합 ${E.genreFit(p,ui.draft.genres)} · ${E.money(p.fee)}`:'인물 선택하기'}</small></span></button>`;}
function completeCast(d){return !!(d.director&&d.leads.filter(Boolean).length===2&&d.supports.filter(Boolean).length===4);}
function wizardDialog(){const d=ui.draft;if(!d)return '';const e=E.estimate(d,game);let content='';
  if(ui.step===0)content=`<div class="brief"><div class="row between"><span class="eyebrow">${d.script.license?'LICENSED ADAPTATION':'ORIGINAL SCREENPLAY'}</span>${tags([d.script.genre])}</div><h3>${esc(d.script.title)}</h3><p>${esc(d.script.synopsis)}</p><p class="mt-sm">${esc(PERSON[d.script.writer].name)} 작가 · 시나리오 ${d.script.quality}점</p>${d.script.license?btn('원작 정보 · 라이선스 조건','rights-info',`data-id="${d.script.license.id}"`,'ghost small-btn mt-sm'):''}</div><label for="film-title" class="field-label">영화 제목 <small>시나리오에 맞게 자동 제안</small></label><input id="film-title" value="${esc(d.title)}" maxlength="40" data-field="film-title"><div class="field-label">장르 조합 <small>최대 3개 · 재클릭하면 선택 취소</small></div><div class="genre-options">${GENRES.map(g=>`<button class="genre-option ${d.genres.includes(g.id)?'selected':''}" data-action="genre-toggle" data-id="${g.id}" aria-pressed="${d.genres.includes(g.id)}" >${g.name}${g.id===d.script.genre?' · 원작':''}</button>`).join('')}</div><p class="synergy-note">장르 조합에 따른 품질 <strong class="${E.genreBonus(d.genres)>=0?'lime':'red'}">${plus(E.genreBonus(d.genres))}</strong> · ${E.genreBonus(d.genres)>=4?'서로의 매력을 살리는 조합입니다.':E.genreBonus(d.genres)<0?'장르의 분위기가 달라 품질이 낮아질 수 있습니다.':'최소 한 장르를 골라 작품의 방향을 정해 주세요.'}</p>${subgenrePicker(d)}<div class="field-label">제작 규모 <small>제작 기간은 최대 12개월</small></div><div class="scale-grid">${SCALES.map(scale=>`<button class="scale-option ${d.scale===scale.id?'selected':''}" data-action="scale" data-id="${scale.id}" aria-pressed="${d.scale===scale.id}"><strong>${scale.name}</strong><small class="scale-description">${scale.label}</small><span>${scale.months*4}주 <small>(${scale.months}개월)</small></span><small>기본 ${scale.base}억 + 장르·계약료</small></button>`).join('')}</div>${features.formatOptions(d)}${updates.runtimeOptions(d)}`;
  else if(ui.step===1)content=`<div class="row between wrap" style="margin-bottom:22px"><div><h3>${esc(d.title)}</h3><p class="small muted mt-sm">성별 조합 제한 없이 주연 2명, 조연 4명을 선정합니다.</p></div>${btn(`${icon('spark')} 추천 캐스팅`,'recommend','','ghost')}</div><div class="casting-layout"><div><div class="cast-group"><h3>감독 <small>1명</small></h3>${castSlot('director',0,d.director)}</div><div class="cast-group"><h3>주연배우 <small>2명</small></h3><div class="cast-slots">${d.leads.map((id,i)=>castSlot('lead',i,id)).join('')}</div></div><div class="cast-group"><h3>조연배우 <small>4명</small></h3><div class="cast-slots">${d.supports.map((id,i)=>castSlot('support',i,id)).join('')}</div></div><p class="small muted">실력과 장르 적합도가 품질에, 주연의 인지도가 관객 유입에 영향을 줍니다. 제작 중인 인물은 다른 작품에 참여할 수 없습니다.</p></div>${budgetBox(d)}</div>${teamNotes(d)}`;
  else content=`<div class="summary-grid"><div><div class="row wrap" style="gap:6px">${tags(d.genres)}<span class="tag outline">${SCALE[d.scale].name}</span><span class="tag outline">${RT.runtimeOf(d)}분 · 하루 ${RT.dailyShows(d)}회</span></div><h3 class="detail-title">${esc(d.title)}</h3><p class="detail-synopsis">${esc(d.script.synopsis)}</p><div class="cast-credit"><span>각본</span><strong>${esc(PERSON[d.script.writer].name)}</strong></div><div class="cast-credit"><span>감독</span><strong>${esc(PERSON[d.director]?.name)}</strong></div><div class="cast-credit"><span>주연</span><strong>${d.leads.map(id=>esc(PERSON[id]?.name)).join(' · ')}</strong></div><div class="cast-credit"><span>조연</span><strong>${d.supports.map(id=>esc(PERSON[id]?.name)).join(' · ')}</strong></div><div class="notice mt">${icon('calendar')}<div><strong>${E.weekDate(E.weekOf(game)+e.months*4)} 제작 완료 예정</strong><p>현장 사건 4개 · 완성 후 평론 확인<br>선택 시 1회, 12개월 추가 제작 가능</p></div></div></div>${budgetBox(d)}</div>${teamNotes(d)}${E.player(game).cash<e.total?`<div class="notice warning mt"><div><strong>${E.money(e.total-E.player(game).cash)}의 자금이 부족합니다.</strong><p>제작을 확정하기 전에 자금을 보충할 수 있습니다. 월 이자율 0.5%.</p><div class="row wrap mt-sm">${[10,30,50].map(n=>btn(`${n}억 대출`,'borrow',`data-amount="${n}" ${E.player(game).debt+n>E.loanLimit(game)?'disabled':''}`,'small-btn')).join('')}</div></div></div>`:''}`;
  return dialogFrame('새 영화 제작',`기획 중 · ${esc(PERSON[d.script.writer].name)} 작가의 시나리오`,stepIndicator()+content,`${btn(ui.step===0?'나중에 기획하기':'이전 단계',ui.step===0?'close':'wizard-back','','ghost')}<div class="row"><p>${ui.step===0?'작품의 방향을 정해 주세요.':ui.step===1?`감독 1 · 주연 ${d.leads.filter(Boolean).length}/2 · 조연 ${d.supports.filter(Boolean).length}/4`:`${E.money(e.total)} · ${e.months*4}주 제작`}</p>${btn(ui.step===2?`제작 시작 ${icon('studio')}`:`${ui.step===0?'캐스팅하기':'최종 확인'} ${icon('arrow')}`,ui.step===2?'greenlight':'wizard-next',ui.step===1&&!completeCast(d)||ui.step===2&&E.player(game).cash<e.total?'disabled':'','primary')}</div>`);
}
function pickerDialog(){return dialogFrame(`${ROLE_NAMES[ui.picker.role]} 선정`,`선택한 영화 「${esc(ui.draft.title)}」 · ${ui.draft.genres.map(g=>GENRE[g].name).join(' / ')}`,`<div class="picker">${peopleToolbar(ui.picker,'picker')}${peopleResults(ui.picker,'picker')}</div>`,`${btn(`${icon('back')} 캐스팅으로 돌아가기`,'close','','ghost')}<p>제작 중인 인물은 중복 섭외할 수 없습니다.</p>`);}
function eventDialog(f){if(!f||f.pending==null)return dialogFrame('현장 사건','',`<p>모든 사건을 결정했습니다.</p>`);const event=EVENTS[f.pending],c=E.player(game);return dialogFrame('현장에서 온 카드',`「${esc(f.title)}」 · ${E.date(game.month)}`,`<div class="event-intro"><span class="event-count">${String(f.decisions.length+1).padStart(2,'0')}<small> / 04</small></span><div><span class="eyebrow">PRODUCTION EVENT</span><h3>${event[0]}</h3></div></div><p class="event-story">${event[1]}${event[3]?`<br>대상: ${esc(PERSON[event[3].type==='director'?f.director:(f.leads.find(id=>PERSON[id].age>=18)??f.director)].name)}`:''}</p>${event[3]?`<div class="notice mt-sm"><p>추가 개런티는 대상 계약료의 30%. 귀책 하차는 계약료 전액 반환 + 30% 위약금 수령. 제작사 교체는 25% 반환 + 25% 보상금 지급. 대체 인물의 새 계약료는 별도이며 교체 시 품질 -3입니다.</p></div>`:''}<div class="event-choices">${event[2].map((choice,i)=>{const cost=E.eventCost(f,choice);return `<button class="event-choice" data-action="decide" data-id="${f.id}" data-index="${i}" ${cost>0&&c.cash<cost?'disabled':''}><span class="choice-top"><span class="choice-letter">${['A','B','C'][i]}</span><strong>${choice[0]}</strong></span><span class="choice-effects"><span>${cost?E.money(cost)+' 추가 지출':event[3]&&i===1?'하차·새 계약 차액 정산':event[3]?.type==='fee'&&i===0?'계약료 30% 추가':'추가 비용 없음'}</span><span class="${choice[2]>=0?'lime':'red'}">품질 ${plus(choice[2])}</span>${choice[3]?`<span class="amber">인지도 ${plus(choice[3])}</span>`:''}</span></button>`;}).join('')}</div><div class="event-account"><span>현재 현금 <strong class="${c.cash<0?'red':''}">${E.money(c.cash)}</strong></span><button class="text-btn" data-action="nav" data-view="finance">은행 이용 ${icon('arrow')}</button></div>`,`<p>네 번의 선택이 영화의 완성도를 바꿉니다.</p>${btn('잠시 닫기','close','','ghost')}`);}
const critique=n=>n>=88?'장면마다 밀도가 살아 있다.':n>=77?'이야기와 연출의 균형이 좋다.':n>=66?'익숙한 이야기 속 작은 발견.':n>=53?'가능성은 보이지만 아쉬움도 남는다.':'이야기를 더 다듬을 필요가 있다.';
function filmDialog(f){return features.filmDialog(f);}

function historyBadge(p,h){return h.hits?`<span class="tag green">${p.role==='director'?'천만감독':p.role==='writer'?'천만작가':'천만배우'} · ${h.hits}편</span>`:'';}
function resultLabel(f){return ['closed','streaming'].includes(f.status)?(f.receipts>=f.spent?'흥행 성공':'흥행 실패'):f.releaseMonth!=null?'상영 집계 중':statusLabel(f);}
function personDialog(p){
  if(!p)return dialogFrame('인물 기록','', '<p>인물 기록을 찾지 못했습니다.</p>');
  const busy=E.busyFilm(game,p.id),h=E.career(game,p.id),quote=E.contractQuote(game,p),other=PERSON[ui.comparisonTarget];
  const matches=ui.comparisonQuery.trim()?E.people(game).filter(o=>o.id!==p.id&&o.name.includes(ui.comparisonQuery.trim())).slice(0,6):[];
  const label=p.status==='dead'?'별세':p.status==='retired'?'은퇴':p.retirementPending?'현재 작품 후 은퇴':!E.available(game,p)?'성장 중 · 18세부터 활동':'현역';
  return dialogFrame('영화인 프로필','가상 인물 · 기록은 세대가 바뀌어도 보존됩니다.',`
    <div class="row">${avatar(p,true)}<div><h3 style="font-size:26px">${esc(p.name)}</h3><p class="muted small">${ROLE_NAMES[p.role]} · ${p.gender==='M'?'남성':'여성'} · ${p.age}세 · ${E.ageGroup(p)}</p></div></div>
    <div class="row wrap mt-sm"><span class="tag outline">${label}</span><span class="tag outline">${p.generation??1}세대</span>${historyBadge(p,h)}</div>
    ${p.previousLife?`<p class="small muted mt-sm">이전 생: <button class="text-btn" data-action="person" data-id="${p.previousLife}">${esc(PERSON[p.previousLife]?.name)}</button> · 아이콘만 이어받고 경력은 새로 시작합니다.</p>`:''}
    ${p.status==='dead'?`<div class="notice mt-sm"><p>${esc(p.deathReason)} · ${E.date(p.deathMonth)}. 남긴 작품과 수상 이력은 계속 보존됩니다.</p></div>`:''}
    <h3 class="mt">강점 장르 · 작업 성향</h3><div class="row wrap mt-sm">${tags(p.genres)}<span class="tag outline">${esc(p.personality??'탐구형')}</span><span class="tag green">${X.trait(p)}</span></div>
    <div class="detail-metrics"><div><small>실력</small><strong>${p.skill}</strong></div><div><small>인지도</small><strong>${p.star}</strong></div><div><small>협업 능력</small><strong>${p.coop}</strong></div></div>
    <div class="card" style="background:#121719"><div class="row between"><span class="muted small">현재 기준 계약료</span><strong style="font-size:24px">${E.money(quote.fee)}</strong></div><p class="muted small mt-sm">기본 ${E.money(p.fee)} × 경력 배수 ${quote.historyFactor} × 친밀도 배수 ${quote.relationshipFactor}. 실제 계약은 함께할 제작진과의 궁합 및 제작 규모를 더 반영합니다.</p></div>
    <div class="detail-metrics"><div><small>참여 작품</small><strong>${h.films.length}편</strong></div><div><small>흥행 성공</small><strong class="lime">${h.success}편</strong></div><div><small>흥행 실패</small><strong>${h.failure}편</strong></div></div><p class="small muted">성공·실패는 상영 종료 후 정산금과 제작비를 비교합니다. 천만 타이틀은 한 작품의 관객이 1,000만 명에 도달했을 때 획득합니다.</p>
    <div class="divider"></div><h3>인물 간 궁합 · 친밀도</h3><input id="compat-query" class="mt-sm" type="search" data-field="compat-query" value="${esc(ui.comparisonQuery)}" placeholder="비교할 인물의 이름을 입력하세요" aria-label="궁합을 비교할 인물 이름"><div class="row wrap mt-sm">${matches.map(o=>btn(`${esc(o.name)} · ${ROLE_NAMES[o.role]}`,'compare-person',`data-id="${o.id}"`,'ghost small-btn')).join('')}</div>
    ${other?`<div class="notice mt-sm"><div><strong>${esc(p.name)} × ${esc(other.name)} · 궁합 ${E.pairCompatibility(game,p.id,other.id)}점</strong><p>친밀도 ${relationBadge(p.id,other.id)}</p><p>두 사람이 함께 계약할 때 ${esc(p.name)}의 경력 반영 계약료에 ×${E.contractQuote(game,p,[other.id]).chemistryFactor} 적용. 낮은 궁합도 새로운 창작의 계기가 될 수 있습니다.</p></div></div>`:'<p class="small muted mt-sm">이름 검색 후 비교할 인물을 선택하세요. 함께한 성공·실패 이력에 따라 궁합도 달라집니다.</p>'}
    <div class="notice mt">${icon(busy?'clock':'check')}<p>${busy?`현재 「${esc(busy.title)}」 제작에 참여하고 있습니다.`:E.available(game,p)?'현재 새 작품에 참여할 수 있습니다.':label+' 상태로 새로운 계약은 할 수 없습니다.'}</p></div>
    ${personRelations(p)}<h3 class="mt">작품 히스토리</h3>${h.films.length?`<div class="stack mt-sm">${[...h.films].reverse().map(f=>`<div class="card"><button class="text-btn" data-action="film" data-id="${f.id}">${esc(f.title)}</button><p class="small muted">${f.releaseMonth!=null?E.date(f.releaseMonth)+' 개봉':statusLabel(f)} · ${resultLabel(f)} · ${E.viewers(f.audience)}명</p><div class="row wrap mt-sm">${f.audience>=10000000?'<span class="tag green">천만 관객</span>':''}${f.awards.map(a=>`<span class="tag outline">${a.year} ${a.category}</span>`).join('')}</div></div>`).join('')}</div>`:'<p class="small muted mt-sm">아직 참여한 작품이 없습니다. 새로운 경력을 기다립니다.</p>'}
  `,`${ui.peekStack?.length?btn('뒤로가기','feature-back','','ghost'):btn('닫기','close','','ghost')}${p.role==='writer'?btn('이 작가에게 시놉시스 받기','request-pitch',`data-id="${p.id}" ${busy||!E.available(game,p)?'disabled':''}`,'primary'):btn('시나리오부터 기획하기','nav','data-view="scripts"','primary')}`);
}
function teamNotes(d){return features.teamNotes(d);}
function filmCareerNotes(f){return `<div class="divider"></div><h3>제작진의 기록</h3><div class="row wrap mt-sm">${E.credits(f).map(id=>btn(`${esc(PERSON[id]?.name)} · ${ROLE_NAMES[PERSON[id]?.role]}`,'person',`data-id="${id}"`,'ghost small-btn')).join('')}</div><p class="small muted mt-sm">계약 당시 팀 궁합 ${f.chemistry??50}점 · 경력에 따른 예상 품질 ${plus(f.historyInfluence??0)}. 작품의 능력치 기록은 계약 당시 값으로 보존합니다.</p>${f.creativeOutcome?`<div class="notice mt-sm"><p>${f.creativeOutcome.surprise?'강점 밖의 장르에서 뜻밖의 가능성을 발견했습니다. ':''}${f.creativeOutcome.chemistryTurn>0?'서로 다른 성향이 좋은 호흡으로 이어졌습니다. ':f.creativeOutcome.chemistryTurn<0?'높은 궁합에도 조율의 어려움이 있었습니다. ':''}최종 창작 결과 품질 ${plus(f.creativeOutcome.change)}.</p></div>`:''}${f.sequelOf?`<div class="notice mt-sm"><div><strong>시리즈 ${f.episode}편</strong><p>전작: <button class="text-btn" data-action="film" data-id="${f.sequelOf}">${esc(game.films.find(o=>o.id===f.sequelOf)?.title)}</button></p><p>전작의 관객 반응과 시리즈 피로도가 흥행에 반영됩니다.</p></div></div>`:''}${game.films.some(o=>o.sequelOf===f.id)?`<div class="row wrap mt-sm">${game.films.filter(o=>o.sequelOf===f.id).map(o=>btn('속편: '+esc(o.title),'film',`data-id="${o.id}"`,'ghost')).join('')}</div>`:''}${f.staffVacancy?.length?`<div class="notice warning mt">대체 제작진을 찾는 중입니다. 섭외가 완료될 때까지 제작 진행이 잠시 멈춥니다.</div>`:''}`;}

function helpDialog(){const rows=[
 ['01 · 이야기와 새 제안','시작 자본은 150억 원입니다. 시나리오를 골라 기획하거나 작가에게 직접 의뢰하세요. 다시 받기는 대기 없이 0.5억 원을 내고 제안 6편을 교체합니다. 제작 중인 영화는 바뀌지 않습니다.'],
 ['02 · 장르와 세부장르','장르는 1~3개입니다. 선택한 장르를 다시 누르면 취소되며 원작 장르도 변경할 수 있습니다. 각 장르의 세부장르 조합은 작품의 품질에 영향을 줍니다.'],
 ['03 · 캐스팅과 섭외 답장','감독 1명, 주연 2명, 조연 4명을 직접 또는 추천으로 고릅니다. 시나리오·전문 장르·제작사·다른 제작진과의 관계에 따라 참여 수락, 추가 개런티 제안, 섭외 거절이 나옵니다. 조건을 수락해도 비용은 최종 제작 시작 때만 지출합니다. 제작진이 바뀌면 조건을 다시 확인하세요.'],
 ['04 · 한 번에 일주일','1주 진행을 누르면 날짜 전환 화면과 함께 한 주가 흐릅니다. 게임의 한 달은 4주, 1년은 48주입니다. 독립영화 24주, 상업영화 36주, 블록버스터 48주를 제작합니다. 모든 제작사는 최대 3편을 동시에 제작합니다.'],
 ['05 · 네 번의 현장 결정','작품마다 서로 다른 현장 사건 4개가 발생합니다. 선택지의 비용·품질·인지도를 비교하세요. 결정하지 않은 사건은 다음 주로 넘어가기 전에 처리해야 합니다.'],
 ['06 · 홍보사 선택과 캠페인','제작 75% 시점에 오른쪽 하단으로 홍보 가능 알림이 옵니다. 제작·홍보 관리에서 한 홍보사만 선택한 뒤 홍보 시작을 누르세요. 계약 비용은 한 번 지출하며 1주 뒤 결과가 도착합니다. 동시에 캠페인 1개, 매체별 1회입니다. 홍보를 하지 않고 개봉해도 됩니다.'],
 ['07 · 제작 완료와 포스터','제작이 끝나면 완료 알림과 포스터 선택 창이 열립니다. 포스터 12종을 6개씩 넘겨 보며 고르거나 나중에 선택할 수 있습니다. 개봉 전에는 제작 관리의 포스터 탭에서 변경할 수 있습니다.'],
 ['08 · 개봉과 첫 8주 성과','가상 평론가 7명의 평론과 장르 흐름을 보고 개봉하세요. 회사별 개봉 간격은 8주입니다. 진행 중인 홍보가 있다면 완료 후 개봉합니다. 첫 주간 관객·매출·누적 정산·손익은 1주 뒤 집계되며 개봉 후 8주간 오른쪽 하단 알림과 알림함에 기록됩니다.'],
 ['09 · 매출과 정산','기본 관람료는 1인 1만 원이며, 특수상영은 일부 좌석의 요금 가산을 반영합니다.  제작사는 극장 매출의 50%에서 원작료를 뺀 금액을 정산받습니다. 영화 손익은 이 정산금에서 실제 제작비를 뺀 값입니다. 최소 8주 상영 후 주간 관객이 첫 주의 12% 미만 또는 2,500명 미만이면 상영이 끝납니다.'],
 ['10 · 추가 제작과 창고영화','개봉 전 완성작은 한 번에 한해 48주 추가 제작할 수 있습니다. 최초 제작비의 40%가 들고 완료 시 품질 +8입니다. 빈 슬롯과 제작진 일정이 필요합니다. 창고영화는 완성작을 무료로 보관하며 원하는 때 직접 꺼내거나 개봉합니다.'],
 ['11 · 자금과 시상식','대출은 10억 단위, 월 이자율은 0.5%입니다. 월 운영비 0.25억과 이자는 4주마다 한 번만 지출합니다. 12월 4주 결산 후 그해 개봉작을 대상으로 연말 시상식을 개최합니다.'],
 ['12 · 인물, 관계와 경력','1,600명의 가상 인물은 고유 ID별로 얼굴 합성과 스타일이 구분됩니다. 같은 인물은 동일 연령대에서 같은 얼굴을 유지하고 새 세대는 다른 얼굴을 사용합니다. 친밀도·궁합·과거 작품 이력은 서로 구분됩니다. 은퇴·세대 교체 후에도 지난 작품 기록이 남습니다.'],
 ['13 · 화면과 소리','집 모양은 저장하고 첫 화면으로 돌아갑니다. 이어서 플레이로 현재 게임에 복귀할 수 있습니다. 스피커는 효과음 켜기·끄기, 네 모서리 아이콘은 전체화면입니다. 전체화면이 허용되지 않으면 브라우저 주소창을 유지하는 집중화면으로 전환합니다.'],
 ['14 · OTT 독점 공개','완성된 미개봉 영화를 가상 OTT 5곳 중 한 곳에 제공합니다. 실수령 계약금은 즉시 정산됩니다. 재판매와 극장 개봉은 불가하며 공개 1주 뒤 시청자평이 도착합니다.'],
 ['15 · 그래프와 단축키','재무의 잔액 카드와 박스오피스의 추세 화살표를 누르면 실제 기록을 확인합니다. 스페이스는 일반 화면에서 1주 진행, 기획 중에는 다음 단계입니다. 이름 입력 중이거나 계약 최종 확인창에서는 시간을 넘기지 않습니다.'],
 ['16 · 자동 저장','저장은 현재 사이트의 이 브라우저에만 남습니다. 다른 기기나 주소와 자동 공유하지 않습니다. 첫 화면 복귀는 기록을 지우지 않지만, 새 게임 확인이나 브라우저의 사이트 데이터 삭제는 기존 기록을 지웁니다. 기획 중인 미확정 작품은 같은 창에서만 이어집니다.']
 ];return dialogFrame('플레이 가이드',`라스트 테이크 ${V.APP_VERSION} · 제작자: 도구리`,`<div class="help-list">${rows.map(([title,text],i)=>`<details class="fold-section" ${i===0?'open':''}><summary>${title}</summary><p class="small" style="line-height:1.8">${text}</p></details>`).join('')}</div>`,`${btn('새 게임 시작','reset-confirm','','danger')}${btn('확인','close','','primary')}`);}

function posterArt(f,index=f.poster??0){return features.posterArt(f,index);}
function businessPanel(f){return `<div class="divider"></div><div class="business-summary">${posterArt(f)}<div><h3>포스터 · 홍보 · 제작 계약</h3><p class="small muted mt-sm">관객 관심 ${plus(f.publicity??0)}% · 홍보 ${(f.promotions??[]).length}회 · 카메오 ${(f.cameos??[]).map(id=>esc(PERSON[id]?.name)).join(', ')||'없음'}</p>${f.script.license?`<p class="small muted mt-sm">${f.script.license.medium} 원작 · 선급 라이선스 ${E.money(f.script.license.fee)} 포함 · 극장 배분 후 제작사 몫의 ${Math.round(f.script.license.share*100)}% 지급<br>누적 원작료 ${E.money(f.royalties??0)} · 작품 정산은 원작료 차감 후 금액</p>`:''}${f.company==='c0'?btn('제작·홍보 관리','business',`data-id="${f.id}"`,'primary mt-sm'):''}</div></div>${(f.businessHistory??[]).slice(-8).reverse().map(x=>`<p class="small muted mt-sm">${E.date(x.month)} · ${esc(x.text)}</p>`).join('')}`;}
function businessDialog(f){
 if(!f)return dialogFrame('제작 관리','','영화를 찾을 수 없습니다.');
 const tab=ui.businessTab??'promotion',before=['production','reshoot','ready','shelved'].includes(f.status);
 const tabs=`<div class="tabbar dialog-tabs">${[['promotion','홍보'],['poster','포스터'],['cameo','카메오'],['editing','후반 편집'],['records','계약 기록']].map(([key,title])=>`<button data-action="business-tab" data-id="${key}" class="${tab===key?'active':''}">${title}</button>`).join('')}</div>`;
 let body='',footer=btn('영화로 돌아가기','film',`data-id="${f.id}"`,'ghost');
 if(tab==='promotion'){
   body=mediaCards(f,before);
   const agency=R.AGENCIES.find(a=>a.id===ui.selectedAgency),method=agency&&X.CAMPAIGNS.find(m=>m.id===agency.channel),terms=agency&&R.mediaTerms(game,f,agency,method.cost);
   footer=`<div class="promotion-commit"><div><strong>${agency?agency.name:'홍보사 한 곳을 선택하세요'}</strong><small>${terms?`${E.money(terms.cost)} · 1주 뒤 결과 도착`:'선택만으로는 비용이 나가지 않습니다.'}</small></div>${btn('홍보 시작','start-promotion',`data-id="${f.id}" ${!agency||!X.promotionAvailable(f)||f.activePromotion||(f.promotions??[]).some(x=>x.channel===agency?.channel)||terms&&E.player(game).cash<terms.cost?'disabled':''}`,'primary')}</div>`;
 }
 if(tab==='poster'){body=`<p class="small muted">제작 후반부터 개봉 전까지 포스터를 선택할 수 있습니다.</p>${X.posterAvailable(f)?posterPicker(f):'<div class="notice mt">제작 75%가 되면 포스터가 열립니다.</div>'}`;if(X.posterAvailable(f)&&before)footer=`${btn('돌아가기','film',`data-id="${f.id}"`,'ghost')}${btn('선택한 포스터 적용','confirm-poster',`data-id="${f.id}"`,'primary')}`;}
 if(tab==='cameo')body=`<p class="small muted">출연료 0원 · 작품당 한 번 · 관계와 일정에 따라 수락 또는 거절합니다.</p>${f.status==='production'&&!f.cameoAttempted?`<div class="cameo-grid">${X.cameoCandidates(game,f).map(x=>`<article class="card"><div class="row">${avatar(x.p)}<strong>${esc(x.p.name)}</strong></div><p class="small mt-sm">${esc(PERSON[x.friend.id].name)}와 친밀도 ${x.friend.score}</p>${btn('무료 초청','cameo',`data-id="${f.id}" data-person="${x.p.id}"`,'ghost small-btn mt-sm')}</article>`).join('')||'<p>지금 초청할 수 있는 인물이 없습니다.</p>'}</div>`:`<div class="notice mt">${f.cameoAttempted?'이번 작품의 초청을 마쳤습니다.':'촬영 중에 초청할 수 있습니다.'}</div>`}`;
 if(tab==='editing')body=updates.editingPanel(f);
 if(tab==='records')body=(f.businessHistory??[]).slice().reverse().map(x=>`<p class="small record-line">${E.recordDate(x)} · ${esc(x.text)}</p>`).join('')||'<p class="small muted">아직 추가 기록이 없습니다.</p>';
 return dialogFrame('제작·홍보 관리',esc(f.title),tabs+body,footer);
}

function licenseDialog(){return dialogFrame('원작 라이선스','애니 · 만화 · 소설 · 게임의 세계를 영화로',`<p class="small muted">모든 원작은 게임 속 가상 작품입니다. 선급금은 제작 확정 시 제작비에 포함되며, 매월 극장 매출의 50%인 제작사 몫에서 원작 수익배분을 차감합니다. 속편도 동일한 라이선스 조건을 적용합니다.</p><div class="script-grid mt">${X.IPS.map(ip=>`<article class="card"><span class="tag green">${ip.medium}</span><h3 class="mt-sm">${ip.title}</h3><div class="mt-sm">${tags([ip.genre])}</div><p class="small muted mt-sm">선급 ${E.money(ip.fee)} · 제작사 몫의 ${Math.round(ip.share*100)}%</p>${btn('각색 시놉시스 받기','license',`data-id="${ip.id}"`,'ghost mt-sm')}</article>`).join('')}</div>`);}


function relationBadge(a,b){const value=R.affinity(game,a,b);return `<span class="relation rel-${Math.min(4,Math.floor(value/20))}">${R.level(value)} <small>${value}/100</small></span>`;}
function subgenrePicker(d){return `<section class="subgenre-picker"><div class="field-label">세부장르 <small>선택한 장르마다 하나</small></div><div class="subgenre-grid">${d.genres.map(g=>{const sub=R.SUBGENRES[g].find(x=>x[0]===d.subgenres?.[g])??R.SUBGENRES[g][0];return `<label>${GENRE[g].name}<select id="subgenre-${g}" data-field="subgenre" data-genre="${g}">${R.SUBGENRES[g].map(x=>`<option value="${x[0]}" ${sub[0]===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select><small>조화: ${sub[2].map(g=>GENRE[g].name).join(' · ')}<br>충돌: ${sub[3].map(g=>GENRE[g].name).join(' · ')}</small></label>`;}).join('')}</div><p class="synergy-note">세부장르와 전체 장르의 조합 효과: 품질 ${plus(R.subgenreEffect(d))}. 같은 조합에서도 제작진과 현장 선택에 따라 결과가 달라집니다.</p></section>`;}
function personRelations(p){return `<div class="divider"></div><h3>친밀도 · 관계망</h3><p class="small muted mt-sm">전문적 궁합과 별도의 관계입니다. 매월 변하거나 유지되며 계약·현장 협업·홍보·카메오에 반영됩니다.</p><details class="relations-list"><summary>제작사 10곳과의 관계</summary>${game.companies.map(c=>`<div class="relationship-row"><span>${esc(c.name)}</span>${relationBadge(p.id,c.id)}</div>`).join('')}</details><details class="relations-list"><summary>홍보 기관 50곳과의 관계</summary>${R.AGENCIES.map(a=>`<div class="relationship-row"><button class="text-btn" data-action="agency" data-id="${a.id}">${a.name}</button>${relationBadge(p.id,a.id)}</div>`).join('')}</details>`;}
function mediaCards(f,before){
 if(f.activePromotion){const plan=f.activePromotion,a=R.AGENCIES.find(a=>a.id===plan.agency);return `<div class="campaign-running">${mediaArt(plan.channel)}<span class="tag green">진행 중</span><h3>${a.name}</h3><p>${X.TONES[plan.tone]}</p><strong>${E.weekDate(plan.dueWeek)} 결과 도착</strong><p class="small muted">${E.money(plan.cost)} 집행 완료. 한 번에 한 홍보사와 진행합니다.</p>${btn('닫고 1주 진행하기','close','','ghost')}</div>`;}
 if(!X.promotionAvailable(f))return `<div class="notice"><p>${before?'제작 진행률 75%부터 홍보할 수 있습니다. 가능해지면 오른쪽 하단으로 알려 드립니다.':'개봉 전 홍보 기간이 끝났습니다.'}</p></div>${promotionHistory(f)}`;
 const completed=new Set((f.promotions??[]).map(r=>r.channel));
 const agencies=R.AGENCIES.filter(a=>ui.agencyChannel==='all'||a.channel===ui.agencyChannel);const page=E.clamp(ui.agencyPage??0,0,Math.ceil(agencies.length/6)-1);ui.agencyPage=page;
 return `<div class="promotion-heading"><p class="small muted">한 곳 선택 → 홍보 시작 → 1주 뒤 결과. 매체별 1회, 동시에 1개 캠페인만 진행합니다.</p><div class="promotion-filters"><label>매체<select id="promotion-channel" data-field="promotion-channel"><option value="all">전체 매체</option>${X.CAMPAIGNS.map(m=>`<option value="${m.id}" ${ui.agencyChannel===m.id?'selected':''}>${m.name}${completed.has(m.id)?' · 완료':''}</option>`).join('')}</select></label><label>홍보 주제<select id="promotion-tone" data-field="promotion-tone">${X.TONES.map((t,i)=>`<option value="${i}" ${ui.promoTone===i?'selected':''}>${t}</option>`).join('')}</select></label></div></div><div class="agency-options" role="radiogroup" aria-label="홍보사 한 곳 선택">${agencies.slice(page*6,page*6+6).map(a=>{const method=X.CAMPAIGNS.find(m=>m.id===a.channel),terms=R.mediaTerms(game,f,a,method.cost),done=completed.has(a.channel);return `<button class="agency-option ${ui.selectedAgency===a.id?'selected':''}" data-action="select-agency" data-id="${a.id}" role="radio" aria-checked="${ui.selectedAgency===a.id}" ${done?'disabled':''}>${mediaArt(a.channel)}<span class="agency-copy"><strong>${a.name}</strong><small>${method.name} · ${done?'이 매체 완료':E.money(terms.cost)}</small><small>회사 관계 ${R.level(terms.company)} · 도달력 ×${a.reach}</small></span><span class="radio-dot" aria-hidden="true"></span></button>`}).join('')}</div><div class="pagination">${btn('이전','agency-page',`data-delta="-1" ${page===0?'disabled':''}`,'ghost small-btn')}<span>${page+1} / ${Math.ceil(agencies.length/6)} · ${agencies.length}곳</span>${btn('다음','agency-page',`data-delta="1" ${page+1>=Math.ceil(agencies.length/6)?'disabled':''}`,'ghost small-btn')}</div>${promotionHistory(f)}`;
}

function agencyDialog(id){const a=R.AGENCIES.find(x=>x.id===id);if(!a)return dialogFrame('기관 정보','','기관을 찾지 못했습니다.');const persons=ui.agencyQuery?E.people(game).filter(p=>p.name.includes(ui.agencyQuery)).slice(0,12):E.myFilms(game).flatMap(f=>E.crewIds(f)).filter((id,i,ids)=>ids.indexOf(id)===i).slice(0,12).map(id=>PERSON[id]);return dialogFrame(a.name,`${X.CAMPAIGNS.find(x=>x.id===a.channel).name} · 가상 기관`, `<div class="agency-heading">${mediaArt(a.channel)}<span class="tag green">${a.name}</span></div><p class="small muted">관계는 매월 유지되거나 변화합니다. 이 기관과의 홍보 협업 결과도 관계에 반영됩니다.</p><h3 class="mt">제작사와의 관계</h3>${game.companies.map(c=>`<div class="relationship-row"><span>${esc(c.name)}</span>${relationBadge(a.id,c.id)}</div>`).join('')}<h3 class="mt">인물과의 관계</h3><input id="agency-query" class="mt-sm" data-field="agency-query" value="${esc(ui.agencyQuery??'')}" placeholder="인물 이름 검색" aria-label="기관과 관계를 볼 인물 검색">${persons.map(p=>`<div class="relationship-row"><button class="text-btn" data-action="person" data-id="${p.id}">${esc(p.name)}</button>${relationBadge(a.id,p.id)}</div>`).join('')||'<p class="small muted mt-sm">인물 이름을 입력해 주세요.</p>'}`,ui.agencyReturn?btn('홍보로 돌아가기','business',`data-id="${ui.agencyReturn}"`,'ghost'):btn('닫기','close','','ghost'));}


function mediaArt(channel){const i=Math.max(0,['magazine','press','youtube','tv','goods','agency'].indexOf(channel));return `<div class="media-art" role="img" aria-label="${X.CAMPAIGNS.find(x=>x.id===channel)?.name??'홍보 기관'} 대표 일러스트" style="background-position:${i%3*50}% ${Math.floor(i/3)*100}%"></div>`;}
function versionDialog(){return dialogFrame('버전 기록',`라스트 테이크 · 정식 ${V.APP_VERSION}`,`<p class="small muted">제작자: <strong>도구리</strong><br>정식 출시 ${V.RELEASE_DATE} · 기존 저장을 이어서 플레이할 수 있습니다.</p><div class="stack mt">${V.VERSION_HISTORY.map(v=>`<section class="card"><span class="tag ${v.version===V.APP_VERSION?'green':'outline'}">${v.version}</span><h3 class="mt-sm">${v.title}</h3>${v.date?`<p class="small muted">${v.date}</p>`:''}<ul class="version-items">${v.items.map(x=>`<li>${x}</li>`).join('')}</ul></section>`).join('')}</div>`,btn('확인','close','','primary'));}
function timelinePanel(f){const month=m=>m==null?'아직 기록 없음':E.date(m),cycles=f.productionCycles??[];return `<div class="divider"></div><h3>제작·개봉 기록</h3><p class="small muted mt-sm">게임 시간은 주 단위입니다 (1개월=4주). 이전 저장에서 주차를 알 수 없는 기록은 기존 월 표기를 유지합니다.</p>${cycles.map((c,i)=>`<section class="timeline-record"><strong>${c.kind==='additional'?'추가 제작':'본 제작'}${c.inferred?' · 이전 저장에서 복원한 추정 기록':''}</strong><dl><div><dt>제작 착수</dt><dd>${c.startWeek!=null?E.weekDate(c.startWeek):month(c.start)}</dd></div><div><dt>크랭크인 · 촬영 시작</dt><dd>${c.crankInWeek!=null?E.weekDate(c.crankInWeek):month(c.crankIn)}</dd></div><div><dt>크랭크업 · 촬영 종료</dt><dd>${c.crankUpWeek!=null?E.weekDate(c.crankUpWeek):month(c.crankUp)}</dd></div><div><dt>제작 완료 · 후반 작업 종료</dt><dd>${c.completedWeek!=null?E.weekDate(c.completedWeek):month(c.completed)}</dd></div></dl></section>`).join('')}<div class="relationship-row"><strong>개봉</strong><span>${f.releaseMonth==null?'미개봉':f.releaseWeek!=null?E.weekDate(f.releaseWeek):month(f.releaseMonth)}</span></div>${f.closeMonth!=null?`<div class="relationship-row"><strong>상영 종료</strong><span>${month(f.closeMonth)}</span></div>`:''}${(f.storageHistory??[]).length?`<details class="relations-list"><summary>창고 보관 이력</summary>${f.storageHistory.map(x=>`<p class="small mt-sm">${E.recordDate(x)} · ${{shelve:'창고 입고',restore:'창고에서 꺼냄',release:'창고에서 개봉'}[x.action]}</p>`).join('')}</details>`:''}`;}
function marketEventCards(){const events=V.currentMarketEvents(game);return events.length?`<section class="market-events"><h3>지금 극장에 부는 바람</h3>${events.map(e=>`<article class="market-event" style="--genre:${GENRE[e.genre].color}"><div class="row between wrap"><strong>${e.title}</strong><span class="tag green">${GENRE[e.genre].name} 관객 +${e.boost}%</span></div><p>${e.reason}</p><small>${E.date(e.start)} ~ ${E.date(e.end-1)} · ${e.end-game.month}개월 남음</small></article>`).join('')}<p class="small muted">해당 기간의 상영 관객에 적용됩니다. 중복 이벤트는 가장 큰 보너스만 적용하며 흥행을 보장하지는 않습니다.</p></section>`:'';}
function warehouseNotice(){const count=E.myFilms(game).filter(f=>f.status==='shelved').length;return count?`<div class="notice mt"><div><strong>창고에서 기다리는 영화 ${count}편</strong><p>지금의 장르 흐름을 살펴보고 개봉 시기를 결정하세요.</p></div>${btn('창고영화 보기','nav','data-view="warehouse"','ghost')}</div>`:'';}
function warehousePage(){const stored=E.myFilms(game).filter(f=>f.status==='shelved'),ready=E.myFilms(game).filter(f=>f.status==='ready');return `${pageHead('창고영화','완성된 이야기를 가장 알맞은 시기에 선보이세요.')}<div class="notice"><p>제작 슬롯 사용 없음 · 보관료 없음 · 기간 제한 없음. 보관 중에는 자동으로 개봉되지 않습니다. 홍보를 준비하거나 원하는 때 직접 개봉할 수 있습니다.</p></div>${marketEventCards()}<div class="section-head mt"><h2>보관 중 <span class="count">${stored.length}편</span></h2></div>${stored.length?`<div class="portfolio-grid">${stored.map(f=>`<section class="card"><h3>${esc(f.title)}</h3><p class="small muted mt-sm">제작 완료 ${f.productionCompletedMonth!=null?E.date(f.productionCompletedMonth):'기록 없음'} · 창고 보관 ${game.month-f.shelvedMonth}개월</p><p class="small mt-sm">현재 장르 이벤트 +${V.marketBoost(game,f)}% · 평론 예상 ${E.reviewScore(game,f)}점</p><div class="row wrap mt-sm">${btn('기록·홍보·개봉 결정','film',`data-id="${f.id}"`,'primary')}${btn('꺼내기','unshelve',`data-id="${f.id}"`,'ghost')}</div></section>`).join('')}</div>`:'<div class="card empty"><h3>보관 중인 영화가 없습니다.</h3><p>제작이 끝난 영화의 상세 화면에서 창고에 넣을 수 있습니다.</p></div>'}${ready.length?`<div class="section-head mt"><h2>보관할 수 있는 완성작</h2></div><div class="stack">${ready.map(f=>`<div class="card row wrap"><strong>${esc(f.title)}</strong><span class="spacer"></span>${btn('영화 보기','film',`data-id="${f.id}"`,'ghost')}${btn('창고에 보관','shelve',`data-id="${f.id}"`,'ghost')}</div>`).join('')}</div>`:''}`;}

function renderDialog(){const dialog=$('dialog');const focus=document.activeElement?.id,selection=document.activeElement?.selectionStart,wasOpen=dialog.open;const scrollBody=dialog.querySelector('.dialog-body');const ownScroll=scrollBody&&getComputedStyle(scrollBody).overflowY==='auto';const top=dialogScroll.transition(dialogKey(ui),ownScroll?scrollBody.scrollTop:dialog.scrollTop);
  if(!ui.modal){if(dialog.open)dialog.close();document.documentElement.classList.remove('modal-open');renderPopups();return;}
  const m=ui.modal;let content=updates?.modalMarkup(m)??features?.modalMarkup(m)??'';
  if(m.type==='completion'){const f=game.films.find(f=>f.id===m.id);if(f&&ui.posterContext!==m.id){ui.posterContext=m.id;ui.posterPage=Math.floor((ui.posterChoices[f.id]??f.poster??GENRES.findIndex(g=>g.id===f.genres[0])%12)/6);}content=completionDialog(f);}
  if(m.type==='negotiation')content=negotiationDialog();
  if(m.type==='notifications')content=notificationsDialog();
  if(m.type==='refresh-confirm')content=refreshDialog();
  if(m.type==='wizard')content=wizardDialog();
  if(m.type==='picker')content=pickerDialog();
  if(m.type==='event')content=eventDialog(game.films.find(f=>f.id===m.id));
  if(m.type==='film')content=filmDialog(game.films.find(f=>f.id===m.id));
  if(m.type==='person')content=personDialog(PERSON[m.id]);
  if(m.type==='business')content=businessDialog(game.films.find(f=>f.id===m.id));
  if(m.type==='agency')content=agencyDialog(m.id);
  if(m.type==='licenses')content=updates.licenseList();
  if(m.type==='versions')content=versionDialog();
  if(m.type==='help')content=helpDialog();
  if(m.type==='more')content=dialogFrame('회사 메뉴',esc(E.player(game).name),`<nav class="nav-modal">${navs.slice(4).map(([v,i,t])=>btn(`${icon(i)} ${t}`,'nav',`data-view="${v}"`,'ghost')).join('')}${btn(`${icon('home')} 저장하고 첫 화면`,'home','','ghost')}${btn(`${icon('bell')} 알림함`,'notifications','','ghost')}${btn(`${icon('help')} 플레이 가이드`,'help','','ghost')}${btn(`버전 기록 · ${V.APP_VERSION}`,'versions','','ghost')}</nav>`);
  if(m.type==='extend-confirm'){const f=game.films.find(f=>f.id===m.id);content=dialogFrame('12개월 추가 제작',esc(f.title),`<div class="notice">${icon('studio')}<p>더 나은 완성도를 위해 기존 제작진과 다시 작업합니다.</p></div><div class="detail-metrics"><div><small>추가 제작비</small><strong>${E.money(E.round(f.budget*.4))}</strong></div><div><small>기간</small><strong>12개월</strong></div><div><small>완료 시 품질</small><strong class="lime">+8점</strong></div></div><p class="small muted">제작 슬롯 1개를 사용합니다. 추가 제작은 한 번만 가능하며, 기존 제작진의 일정이 비어 있어야 합니다. 품질 최대치는 99점입니다.</p>`,`${btn('돌아가기','film',`data-id="${f.id}"`,'ghost')}${btn('추가 제작 시작','extend',`data-id="${f.id}"`,'primary')}`);}
  if(m.type==='reset-confirm')content=dialogFrame('새로운 제작사를 세울까요?','',`<p>현재 제작사와 모든 영화, 자금, 수상 기록이 삭제됩니다.</p><p class="small muted mt-sm">삭제한 진행 내용은 되돌릴 수 없습니다.</p>`,`${btn('계속 플레이','close','','ghost')}${btn('기록을 지우고 새 게임','reset','','danger')}`);
  dialog.className=['rights-info','licenses','runtime-edit','studio-stat','tax-details','wizard','picker','business','completion','film','ott-offers','company-info','film-chart','finance-chart','critic-reviews','audience-reviews'].includes(m.type)?'wide':'';dialog.dataset.modal=m.type;dialog.innerHTML=content;dialog.setAttribute('aria-labelledby','dialog-title');document.documentElement.classList.add('modal-open');if(!wasOpen)dialog.showModal();
  if(focus&&$(focus)){const node=$(focus);node.focus({preventScroll:true});if(typeof selection==='number'&&node.setSelectionRange){try{node.setSelectionRange(selection,selection)}catch{}}}
  const body=dialog.querySelector('.dialog-body');const inner=body&&getComputedStyle(body).overflowY==='auto';dialog.scrollTop=inner?0:top;if(body)body.scrollTop=inner?top:0;hydratePortraits(dialog,id=>PERSON[id]);renderPopups();
}
function render(){const focus=document.activeElement?.id,selection=document.activeElement?.selectionStart;$('app').innerHTML=game&&!ui.home?shell():startPage();startScreen.sync();renderDialog();hydratePortraits($('app'),id=>PERSON[id]);renderPopups();if(focus&&$(focus)&&!$('dialog').open){const node=$(focus);node.focus({preventScroll:true});if(typeof selection==='number'&&node.setSelectionRange){try{node.setSelectionRange(selection,selection)}catch{}}}}
function startPlanning(id){
  if(!game)throw Error('먼저 제작사를 설립해 주세요.');
  const p=game.pitches.find(p=>p.id===id);if(!p)throw Error('시나리오를 찾을 수 없습니다.');
  if(E.active(game).filter(f=>f.company==='c0').length>=3)throw Error('세 개 제작 슬롯을 모두 사용 중입니다.');
  if(!E.available(game,PERSON[p.writer])||E.busyFilm(game,p.writer))throw Error('이 작가는 다른 작품을 제작 중입니다.');
  dialogScroll.clear();ui.draft={requireNegotiation:true,castingAgreements:{},formats:[],runtime:120,script:p,title:p.title,genres:[p.genre],scale:'medium',director:null,leads:[null,null],supports:[null,null,null,null]};if(p.sequelOf){const parent=game.films.find(f=>f.id===p.sequelOf);ui.draft.scale=parent.scale;ui.draft.runtime=RT.runtimeOf(parent);ui.draft.genres=[...parent.genres];const keep=id=>E.eligible(game,PERSON[id],ui.draft.genres)&&!E.busyFilm(game,id)?id:null;ui.draft.director=keep(parent.director);ui.draft.leads=parent.leads.map(keep);ui.draft.supports=parent.supports.map(keep);}
  ui.draft.subgenres=R.normalizeSubgenres({...ui.draft,subgenres:p.sequelOf?game.films.find(f=>f.id===p.sequelOf)?.subgenres:undefined});ui.step=0;open('wizard');return{pitchId:id,title:p.title,stage:'planning'};
}
async function nextWeek(){
 if(ui.advancing||!game||ui.home)return;
 const task=nextRequiredTask();if(task){ui.modal=task;renderDialog();return;}
 ui.advancing=true;document.querySelectorAll('[data-action="advance"]').forEach(b=>b.disabled=true);sound.play('week');
 const overlay=$('week-transition'),from=E.weekOf(game);
 overlay.innerHTML=`<div class="week-change-card"><span class="eyebrow">A WEEK IN MOTION</span><span class="week-calendar">${icon('calendar')}</span><p>${E.weekDate(from)}</p><strong>${E.weekDate(from+1)}</strong><span class="week-progress"></span><small>제작 · 홍보 · 흥행을 한 주씩 기록합니다.</small></div>`;
 overlay.hidden=false;document.documentElement.setAttribute('aria-busy','true');
 try{
  await new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?300:480));
  const next=structuredClone(game);E.advanceWeek(next);game=next;persist();render();
  await new Promise(r=>setTimeout(r,400));
 }catch(error){toast(error.message||'주간 진행을 완료하지 못했습니다.',true);}
 finally{
  ui.advancing=false;overlay.hidden=true;document.documentElement.removeAttribute('aria-busy');
  ui.modal=nextRequiredTask();render();
  if(ui.modal?.type==='completion')sound.play('complete');else if(game.notifications.some(n=>n.popup))sound.play('notify');
 }
}
// A failed image load gets one fresh request; fallback remains readable offline.
document.addEventListener('error',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||!img.classList.contains('portrait-image'))return;if(!img.dataset.retried){img.dataset.retried='1';img.src=img.src+'&retry=1';}else{img.hidden=true;img.parentElement.setAttribute('aria-label',img.parentElement.getAttribute('aria-label')+' · 이미지 로딩 실패');}},true);
document.addEventListener('submit',event=>{
  if(event.target.id!=='found-form')return;event.preventDefault();if(game)return open('reset-confirm');sound.unlock();
  try{game=E.createGame($('company-name').value,Date.now()>>>0,Number(new FormData(event.target).get('logo')));ui.home=false;ui.view='studio';ui.modal=null;persist();render();window.scrollTo({top:0,behavior:'instant'});toast('회사 설립을 마쳤습니다. 첫 시나리오를 골라 보세요.');}catch(error){toast(error.message,true);}
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const a=button.dataset.action,id=button.dataset.id;
  sound.unlock();if(a!=='sound')sound.play('click');if(ui.advancing)return;
  try{
    if(updates.handleAction(a,id,button))return;
    if(features.handleAction(a,id,button))return;
    if(handleNewAction(a,id,button))return;
    if(a==='agency'){ui.agencyReturn=ui.modal?.type==='business'?ui.modal.id:null;ui.agencyQuery='';return open('agency',id);}
    if(a==='business')return open('business',id);
    if(a==='licenses')return open('licenses');
    if(a==='license')return mutate(()=>{const p=X.licensePitch(game,id);startPlanning(p.id);});
    if(a==='promote')return mutate(()=>X.promote(game,id,button.dataset.channel,Number(button.dataset.tone),button.dataset.agency),'홍보 결과를 기록했습니다.');
    if(a==='poster')return mutate(()=>X.selectPoster(game,id,Number(button.dataset.index)),'포스터를 선택했습니다.');
    if(a==='cameo')return mutate(()=>X.inviteCameo(game,id,button.dataset.person));
    if(a==='versions')return open('versions');
    if(a==='shelve')return mutate(()=>{E.shelveFilm(game,id);ui.modal=null;ui.view='warehouse';},'창고영화로 보관했습니다.');
    if(a==='unshelve')return mutate(()=>{E.unshelveFilm(game,id);ui.modal={type:'film',id};},'개봉 준비를 다시 시작합니다.');
    if(a==='close')return close();
    if(a==='nav')return go(button.dataset.view);
    if(a==='more'||a==='help'||a==='reset-confirm')return open(a);
    if(a==='person'){ui.comparisonQuery='';ui.comparisonTarget=null;return open(a,id);}if(a==='film'||a==='event'||a==='extend-confirm')return open(a,id);
    if(a==='advance')return nextWeek();
    if(a==='pitch')return startPlanning(id);
    if(a==='sequel')return mutate(()=>{const p=E.createSequelPitch(game,id);startPlanning(p.id);},'속편 시나리오가 준비되었습니다. 출연진을 다시 선정할 수 있습니다.');
    if(a==='compare-person'){ui.comparisonTarget=id;renderDialog();return;}
    if(a==='refresh-pitches')return open('refresh-confirm');
    if(a==='writers'){ui.people.role='writer';ui.people.page=0;return go('talents');}
    if(a==='request-pitch')return mutate(()=>{const p=E.requestPitch(game,id);ui.view='scripts';ui.scriptGenre='all';ui.modal=null;return p;},'작가의 시놉시스가 도착했습니다.');
    if(a==='people-role'){ui.people.role=button.dataset.role;ui.people.page=0;return render();}
    if(a==='people-page'){const f=button.dataset.prefix==='picker'?ui.picker:ui.people;f.page+=Number(button.dataset.delta);if(button.dataset.prefix==='picker'){renderDialog();const b=$('dialog').querySelector('.dialog-body');if(b)b.scrollTop=0;}else{render();window.scrollTo({top:0,behavior:'instant'});}return;}
    if(a==='market-tab'){ui.market=button.dataset.tab;return render();}
    if(a==='genre-toggle'){
      const d=ui.draft;
      if(d.genres.includes(id))d.genres=d.genres.filter(g=>g!==id);else{if(d.genres.length===3)return toast('장르는 최대 3개까지 조합할 수 있습니다.',true);d.genres.push(id);}d.subgenres=R.normalizeSubgenres(d);return renderDialog();
    }
    if(a==='scale'){ui.draft.scale=id;return renderDialog();}
    if(a==='wizard-next'){if(!ui.draft.title.trim())return toast('영화 제목을 적어 주세요.',true);if(!ui.draft.genres.length)return toast('장르를 하나 이상 선택해 주세요.',true);if(ui.step===1&&!completeCast(ui.draft))return toast('감독과 출연진을 모두 선정해 주세요.',true);if(ui.step===1)E.assertCrewAvailable(game,ui.draft);ui.step=Math.min(2,ui.step+1);renderDialog();$('dialog').scrollTop=0;const body=$('dialog').querySelector('.dialog-body');if(body)body.scrollTop=0;return;}
    if(a==='wizard-back'){ui.step=Math.max(0,ui.step-1);renderDialog();$('dialog').scrollTop=0;const body=$('dialog').querySelector('.dialog-body');if(body)body.scrollTop=0;return;}
    if(a==='recommend'){if(!ui.draft.genres.length)return toast('장르를 먼저 선택해 주세요.',true);ui.draft=E.recommend(game,ui.draft);renderDialog();return toast('제작진을 추천했습니다. 최종 제작 전에 섭외 응답과 추가 조건을 확인합니다.');}
    if(a==='cast-slot'){ui.picker={role:button.dataset.role,index:Number(button.dataset.index),gender:'all',genre:'all',query:'',sort:'fit-desc',available:true,page:0,age:'all',status:'all'};return open('picker');}
    if(a==='choose-person')return choosePerson(id);
    if(a==='greenlight')return confirmGreenlight();
    if(a==='decide')return mutate(()=>{E.resolveEvent(game,id,Number(button.dataset.index));ui.modal=nextRequiredTask();},'현장에 결정을 전달했습니다.');
    if(a==='release')return mutate(()=>{E.releaseFilm(game,id);ui.modal=null;ui.view='studio';},'영화를 개봉했습니다. 1주 뒤 첫 흥행 성적이 집계됩니다.');
    if(a==='extend')return mutate(()=>{E.extendFilm(game,id);ui.modal=null;ui.view='studio';},'12개월 추가 제작을 시작했습니다.');
    if(a==='borrow')return mutate(()=>E.borrow(game,Number(button.dataset.amount)),`${button.dataset.amount}억 원의 운영 자금을 대출받았습니다.`);
    if(a==='repay')return mutate(()=>E.repay(game,Number(button.dataset.amount)),'대출 원금을 상환했습니다.');
    if(a==='reset'){try{localStorage.removeItem(SAVE_KEY)}catch{}game=null;ui.home=false;ui.modal=null;ui.draft=null;ui.posterChoices={};ui.popupTimers.forEach(clearTimeout);ui.popupTimers.clear();invalidSave=false;render();window.scrollTo({top:0,behavior:'instant'});return;}
  }catch(error){toast(error.message||'선택을 다시 확인해 주세요.',true);}
});
function fieldChanged(event){if(updates.handleField(event)||features.handleField(event))return;const target=event.target;
  if(target.dataset.field==='promotion-channel'){ui.agencyChannel=target.value;ui.agencyPage=0;ui.selectedAgency=null;renderDialog();return;}
  if(target.dataset.field==='promotion-tone'){ui.promoTone=Number(target.value);renderDialog();return;}
  if(target.dataset.field==='agency-query'){ui.agencyQuery=target.value;renderDialog();return;}
  if(target.dataset.field==='agency'){ui.agencies[target.dataset.channel]=target.value;renderDialog();return;}
  if(target.dataset.field==='subgenre'){ui.draft.subgenres??={};ui.draft.subgenres[target.dataset.genre]=target.value;renderDialog();return;}
  if(target.dataset.field==='compat-query'){ui.comparisonQuery=target.value;renderDialog();return;}
  if(target.dataset.field==='film-title'){ui.draft.title=target.value;return;}
  if(target.dataset.field==='script-genre'){ui.scriptGenre=target.value;ui.scriptPage=0;render();return;}
  if(target.dataset.field==='award-year'){ui.awardYear=Number(target.value);render();return;}
  if(target.dataset.filter){const filter=target.dataset.filter==='picker'?ui.picker:ui.people;filter[target.dataset.key]=target.type==='checkbox'?target.checked:target.value;filter.page=0;target.dataset.filter==='picker'?renderDialog():render();}
}
document.addEventListener('input',event=>{if(event.target.matches('input:not([type=checkbox])'))fieldChanged(event)});
document.addEventListener('change',event=>{if(event.target.matches('select,input[type=checkbox]'))fieldChanged(event)});
$('dialog').addEventListener('cancel',event=>{event.preventDefault();close();});
$('dialog').addEventListener('click',event=>{if(event.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
// Optional page-scoped WebMCP support. These are the same actions used above.
function registerPageTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const toolDefinitions=[
    {name:'get_studio_status',title:'제작사 현황 읽기',description:'Read this browser’s current studio, films, pending decisions, and available script pitches. Does not advance time.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('Expected an empty object.');if(!game)return{founded:false};const c=E.player(game);return{founded:true,company:c.name,date:E.weekDate(E.weekOf(game)),cash:c.cash,debt:c.debt,pendingEvents:E.pendingEvents(game).map(f=>({filmId:f.id,title:EVENTS[f.pending][0]})),films:E.myFilms(game).map(f=>({id:f.id,title:f.title,status:f.status})),pitches:game.pitches.map(p=>({id:p.id,title:p.title,genre:GENRE[p.genre].name}))};}},
    {name:'start_film_planning',title:'영화 기획 화면 열기',description:'Open the planning flow for an existing script pitch. This only stages a draft; it does not spend money or start production.',inputSchema:{type:'object',properties:{pitchId:{type:'string'}},required:['pitchId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input.pitchId!=='string'||Object.keys(input).some(k=>k!=='pitchId'))throw Error('A valid pitchId is required.');return startPlanning(input.pitchId);}}
  ];
  for(const tool of toolDefinitions){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
function utilityButtons(start=false){
 const unread=(game?.notifications??[]).filter(n=>n.unread).length;
 return `<div class="utility-buttons">${game&&!start?`<button class="icon-btn" data-action="home" aria-label="저장하고 첫 화면" title="저장하고 첫 화면">${icon('home')}</button><button class="icon-btn notification-control" data-action="notifications" aria-label="알림함 ${unread}개" title="알림함">${icon('bell')}${unread?`<span class="notification-count">${unread>99?'99+':unread}</span>`:''}</button>`:''}<button class="icon-btn" data-action="sound" aria-label="효과음 ${sound.enabled?'끄기':'켜기'}" aria-pressed="${sound.enabled}" title="효과음 ${sound.enabled?'켜짐':'꺼짐'}">${icon(sound.enabled?'volume':'mute')}</button><button class="icon-btn" data-action="fullscreen" aria-label="${document.fullscreenElement||document.webkitFullscreenElement?'전체화면 나가기':document.documentElement.classList.contains('focus-mode')?'집중화면 나가기':'전체화면'}" title="전체화면">${icon('fullscreen')}</button></div>`;
}
function resumeCard(){const c=E.player(game);return `<section class="setup-card resume-card"><div class="setup-step"><span>▶</span> YOUR NEXT SCENE</div><h2>다시, 라스트 테이크.</h2><p>지금까지의 제작사와 영화 기록이 저장되어 있습니다.</p><div class="resume-company"><span class="avatar">${X.LOGOS[c.logo??0]}</span><strong>${esc(c.name)}</strong></div><div class="setup-summary"><div><span>저장 시점</span><strong>${E.weekDate(E.weekOf(game))}</strong></div><div><span>보유 현금</span><strong>${E.money(c.cash)}</strong></div><div><span>우리 영화</span><strong>${E.myFilms(game).length}편</strong></div></div>${btn(`이어서 플레이 ${icon('arrow')}`,'resume','','primary full')}${ui.draft?'<p class="small muted mt-sm">기획 중인 작품도 이 창에서 이어서 편집할 수 있습니다.</p>':''}${btn('새 제작사 설립','reset-confirm','','ghost full mt-sm')}<p class="save-note">첫 화면으로 돌아와도 게임은 지워지지 않습니다.<br>제작자: 도구리</p></section>`;}
function peopleLayout(prefix){
 const content=document.querySelector('#main.content'),dialogBody=document.querySelector('#dialog .dialog-body');
 const fallback=prefix==='picker'?Math.min(innerWidth-32,1050):innerWidth-(innerWidth>1000?270:32);
 const width=Math.max(260,(prefix==='picker'?dialogBody?.clientWidth:content?.clientWidth)??fallback)-(innerWidth<620?24:40);
 const columns=Math.max(2,Math.min(7,Math.floor(width/(innerWidth<620?142:180))));
 const overhead=prefix==='picker'?(innerWidth<620?300:270):(innerWidth<620?390:330);
 const rows=Math.max(1,Math.min(4,Math.floor((innerHeight-overhead)/150)));
 return {columns,size:columns*rows};
}
function nextRequiredTask(){if(!game||ui.home)return null;const edit=E.pendingEdits(game)[0];if(edit)return {type:'runtime-edit',id:edit.id};const f=E.myFilms(game).find(f=>f.status==='ready'&&!f.completionAcknowledged);if(f)return {type:'completion',id:f.id};const e=E.pendingEvents(game)[0];return e?{type:'event',id:e.id}:null;}
function posterPicker(f){
 const choice=ui.posterChoices[f.id]??f.poster??GENRES.findIndex(g=>g.id===f.genres[0])%12;
 const before=!['showing','closed','streaming'].includes(f.status),page=ui.posterPage??0;
 return `<div class="poster-grid compact-posters">${Array.from({length:6},(_,j)=>j+page*6).map(i=>`<button class="poster-option ${choice===i?'selected':''}" data-action="poster-preview" data-id="${f.id}" data-index="${i}" aria-label="포스터 ${i+1} 선택" aria-pressed="${choice===i}" ${before?'':'disabled'}>${posterArt(f,i)}<span>콘셉트 ${i+1}${choice===i?' · 선택됨':''}</span></button>`).join('')}</div><div class="pagination">${btn(`${icon('back')} 이전`,'poster-page','data-delta="-1" '+(page===0?'disabled':''),'ghost small-btn')}<span>포스터 ${page+1} / 2 · 선택 ${choice+1}</span>${btn(`다음 ${icon('chevron')}`,'poster-page','data-delta="1" '+(page===1?'disabled':''),'ghost small-btn')}</div>`;
}
function completionDialog(f){if(!f)return dialogFrame('제작 완료','','작품을 찾을 수 없습니다.');return dialogFrame('제작이 완료되었습니다!',`「${esc(f.title)}」 · ${E.weekDate(f.readyWeek??E.weekOf(game))}`,`<div class="completion-summary"><span>${icon('check')} 촬영·후반 작업 완료</span><strong>평론 ${E.reviewScore(game,f)}점</strong><span>총 제작비 ${E.money(f.spent)}</span></div><p class="small muted">이 영화의 얼굴이 될 포스터를 골라 주세요. 나중에 제작 관리에서 바꿀 수도 있습니다.</p>${posterPicker(f)}`,`${btn('나중에 선택','completion-later',`data-id="${f.id}"`,'ghost')}${btn('선택한 포스터 확정','completion-done',`data-id="${f.id}"`,'primary')}`);}
function acknowledgeCompletion(id,apply){
 const f=game.films.find(f=>f.id===id);if(!f)return;
 if(apply)X.selectPoster(game,id,ui.posterChoices[id]??f.poster??GENRES.findIndex(g=>g.id===f.genres[0])%12);
 f.completionAcknowledged=true;
 for(const n of game.notifications??[])if(n.filmId===id&&n.type==='complete'){n.popup=false;n.unread=false;}
 persist();ui.modal=nextRequiredTask();render();if(apply)sound.play('success');
}
function promotionHistory(f){return (f.promotions??[]).length?`<details class="fold-section"><summary>완료한 홍보 · ${f.promotions.length}회</summary>${f.promotions.map(r=>`<p class="small record-line">${R.AGENCIES.find(a=>a.id===r.agency)?.name??'이전 홍보'} · 인지도 ${plus(r.effect)} · ${E.money(r.cost)}</p>`).join('')}</details>`:'';}
function refreshDialog(){return dialogFrame('시나리오를 다시 받을까요?','대기 기간 없이 새 제안 6편을 받습니다.',`<div class="detail-metrics"><div><small>수신 비용</small><strong>0.5억 원</strong></div><div><small>처리 후 현금</small><strong>${E.money(E.player(game).cash-E.PITCH_REFRESH_COST)}</strong></div></div><p>현재 받은 시나리오 목록을 새 제안 6편으로 교체합니다. 제작 중인 영화와 완료한 영화는 바뀌지 않습니다.</p><p class="small muted mt-sm">이미 계약한 영화의 시나리오 비용과는 별도입니다.</p>`,`${btn('취소','close','','ghost')}${btn('0.5억 · 다시 받기','refresh-confirmed',E.player(game).cash<E.PITCH_REFRESH_COST?'disabled':'','primary')}`);}
function choosePerson(id){
 const p=PERSON[id],picker=ui.picker;
 if(!p||!picker||p.role!==picker.role||!E.eligible(game,p,ui.draft.genres)||E.busyFilm(game,id)||E.crewIds(ui.draft).includes(id))throw Error('지금 해당 배역에 섭외할 수 없는 인물입니다.');
 const prospective=structuredClone(ui.draft);
 if(picker.role==='director')prospective.director=id;else prospective[picker.role==='lead'?'leads':'supports'][picker.index]=id;
 const offer=N.castingOffer(game,prospective,id);
 if(offer.status==='accepted'){ui.draft=prospective;ui.modal={type:'wizard'};renderDialog();return;}
 ui.pendingSelection=prospective;ui.offerPerson=id;open('negotiation');sound.play(offer.status==='refused'?'error':'notify');
}
function negotiationDialog(){
 const single=!!ui.pendingSelection,d=ui.pendingSelection??ui.draft;
 const reports=single?[N.castingOffer(game,d,ui.offerPerson)]:N.negotiationReport(game,d);
 const refused=reports.some(r=>r.status==='refused'),extra=E.round(reports.reduce((n,r)=>n+r.extra,0));
 return dialogFrame(single?'섭외 답장이 도착했습니다':'최종 섭외 조건 확인',`「${esc(d.title)}」 · 비용은 제작 확정 시에만 지출됩니다.`,`${!single?`<div class="notice small">제작진이나 장르가 바뀌면 상대방의 조건도 다시 확인합니다. 현재 추가 개런티 총 ${E.money(extra)}.</div>`:''}<div class="negotiation-list">${reports.map(r=>{const p=PERSON[r.person];return `<article class="negotiation-card ${r.status}"><div class="row">${avatar(p,true)}<div><h3>${esc(p.name)} <small>${ROLE_NAMES[p.role]}</small></h3><span class="tag ${r.status==='refused'?'orange':r.status==='counter'?'outline':'green'}">${r.status==='refused'?'섭외 거절':r.status==='counter'?'추가 조건':'참여 수락'}</span></div></div><p class="offer-message">${esc(r.message)}</p>${r.reasons.length?`<details ${single?'open':''}><summary>답장 사유 ${r.reasons.length}개</summary>${r.reasons.map(t=>`<p class="small muted mt-sm">${esc(t)}</p>`).join('')}</details>`:''}<div class="offer-price"><span>기본 ${E.money(r.fee)}</span>${r.extra?`<strong>추가 ${E.money(r.extra)} (${r.percent}%)</strong>`:''}<strong>총 ${E.money(r.total)}</strong></div>${!single&&r.status==='refused'?btn('이 인물 교체','replace-negotiation',`data-id="${r.person}"`,'ghost small-btn'):''}</article>`}).join('')}</div>`,`${btn(single?'다른 인물 찾아보기':'캐스팅으로 돌아가기','negotiation-back','','ghost')}${!refused?btn(single?'조건을 수락하고 선정':'추가 조건 수락','accept-negotiation','','primary'):''}`);
}
function confirmGreenlight(){
 E.assertCrewAvailable(game,ui.draft);
 if(!completeCast(ui.draft)||!ui.draft.genres.length)throw Error('장르와 모든 제작진을 먼저 선정해 주세요.');
 const unresolved=N.negotiationReport(game,ui.draft).some(r=>!r.confirmed||r.status==='refused');
 if(unresolved){ui.pendingSelection=null;open('negotiation');sound.play('notify');return;}
 mutate(()=>{const f=E.greenlight(game,ui.draft);ui.modal=null;ui.draft=null;ui.view='studio';window.scrollTo({top:0,behavior:'instant'});return f;},'제작을 시작했습니다. 상단에서 1주씩 진행하세요.');
}
function notificationsDialog(){const notifications=game?.notifications??[];return dialogFrame('제작사 알림함','홍보·주간 성과·OTT·인물 소식·흥행 이정표를 보존합니다.',`<div class="notification-history">${notifications.map(n=>`<article class="notification-record ${n.unread?'unread':''}"><small>${E.weekDate(n.week)}${n.rank?` · 박스오피스 ${n.rank}위`:''}</small><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p>${n.filmId||n.personId?btn(n.personId?'인물정보':'작품 확인','notification-open',`data-id="${n.id}"`,'ghost small-btn'):''}</article>`).join('')||'<div class="empty">아직 도착한 알림이 없습니다.</div>'}</div>`,`${btn('모두 읽음','notifications-read','','ghost')}${btn('닫기','close','','primary')}`);}
function renderPopups(){
 const host=$('notification-popups');if(!host)return;
 if(!game||ui.home||$('dialog').open||ui.advancing){host.hidden=true;return;}
 host.hidden=false;
 const pending=(game.notifications??[]).filter(n=>n.popup),visible=pending.slice(0,innerWidth<600||innerHeight<700?1:2);
 host.innerHTML=visible.map(n=>{const f=game.films.find(f=>f.id===n.filmId);return `<article class="push-card ${n.type}" data-popup="${n.id}"><button class="push-close icon-btn" data-action="dismiss-notification" data-id="${n.id}" aria-label="이 알림 닫기">${icon('close')}</button><div class="push-head"><span>${icon(n.type==='boxoffice'?'chart':'bell')} LAST TAKE</span><small>${n.rank?`${n.rank}위 · `:''}${n.week%4+1}주</small></div><div class="push-content">${f&&['boxoffice','record','ott'].includes(n.type)?`<div class="push-poster">${posterArt(f,f.poster??0)}</div>`:''}<div><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p></div></div>${n.filmId||n.personId?`<button class="text-btn" data-action="notification-open" data-id="${n.id}">${n.personId?'인물정보':n.action==='business'?'홍보 화면 열기':'작품 확인'} ${icon('arrow')}</button>`:''}</article>`}).join('')+(pending.length>visible.length?`<button class="push-more" data-action="notifications">${pending.length-visible.length}개 더 보기 · 알림함</button>`:'');
 for(const n of visible)if(!ui.popupTimers.has(n.id)){
   const expire=()=>{if(!game)return;const item=game.notifications.find(x=>x.id===n.id);if(!item)return;
     if(ui.popupHovered||$('dialog').open||ui.advancing||document.hidden){ui.popupTimers.set(n.id,setTimeout(expire,2000));return;}
     item.popup=false;ui.popupTimers.delete(n.id);persist();renderPopups();};
   ui.popupTimers.set(n.id,setTimeout(expire,12000));
 }
}
async function toggleFullscreen(){
 const root=document.documentElement;
 try{
  if(document.fullscreenElement){await document.exitFullscreen();}
  else if(document.webkitFullscreenElement){document.webkitExitFullscreen();}
  else if(root.classList.contains('focus-mode')){root.classList.remove('focus-mode');}
  else{
    const request=root.requestFullscreen??root.webkitRequestFullscreen;
    if(!request)throw Error('Fullscreen unavailable');
    await request.call(root);
  }
 }catch{
  root.classList.toggle('focus-mode');
  toast('이 브라우저에서는 전체화면 대신 집중화면을 사용합니다. 주소창은 브라우저가 관리합니다.');
 }
 render();
}
function handleNewAction(a,id,button){
 if(a==='home'){if(game)persist();ui.home=true;ui.modal=null;render();window.scrollTo(0,0);return true;}
 if(a==='resume'){ui.home=false;ui.modal=null;render();ui.modal=ui.draft?{type:'wizard'}:nextRequiredTask();renderDialog();return true;}
 if(a==='sound'){sound.toggle();render();return true;}
 if(a==='fullscreen'){toggleFullscreen();return true;}
 if(a==='notifications'){open('notifications');return true;}
 if(a==='notifications-read'){for(const n of game.notifications??[]){n.unread=false;n.popup=false;}persist();render();return true;}
 if(a==='dismiss-notification'){const n=game.notifications.find(n=>n.id===Number(id));if(n)n.popup=false;clearTimeout(ui.popupTimers.get(Number(id)));ui.popupTimers.delete(Number(id));persist();renderPopups();return true;}
 if(a==='notification-open'){
   const n=game.notifications.find(n=>n.id===Number(id));if(!n)return true;n.unread=false;n.popup=false;persist();
   const f=game.films.find(f=>f.id===n.filmId);if(!f)return true;
   open(n.action==='completion'&&!f.completionAcknowledged?'completion':n.action==='business'?'business':'film',f.id);return true;
 }
 if(a==='refresh-confirmed'){mutate(()=>{E.refreshPitches(game);ui.modal=null;ui.scriptGenre='all';ui.scriptPage=0;ui.draft=null;},'새 시나리오 6편을 받았습니다. 0.5억 원을 집행했습니다.');return true;}
 if(a==='script-page'){ui.scriptPage=(ui.scriptPage??0)+Number(button.dataset.delta);render();window.scrollTo({top:0,behavior:'instant'});return true;}
 if(a==='film-tab'){ui.filmTab=id;renderDialog();return true;}
 if(a==='business-tab'){ui.businessTab=id;ui.posterPage=0;renderDialog();return true;}
 if(a==='agency-page'){ui.agencyPage=(ui.agencyPage??0)+Number(button.dataset.delta);renderDialog();return true;}
 if(a==='select-agency'){ui.selectedAgency=ui.selectedAgency===id?null:id;renderDialog();return true;}
 if(a==='start-promotion'){mutate(()=>{X.beginPromotion(game,id,ui.selectedAgency,ui.promoTone);ui.modal=null;ui.selectedAgency=null;});sound.play('notify');return true;}
 if(a==='poster-page'){ui.posterPage=E.clamp((ui.posterPage??0)+Number(button.dataset.delta),0,1);renderDialog();const b=$('dialog').querySelector('.dialog-body');if(b)b.scrollTop=0;return true;}
 if(a==='poster-preview'){ui.posterChoices[id]=Number(button.dataset.index);renderDialog();return true;}
 if(a==='confirm-poster'){mutate(()=>X.selectPoster(game,id,ui.posterChoices[id]??game.films.find(f=>f.id===id).poster??0),'포스터를 적용했습니다.');return true;}
 if(a==='completion'){open('completion',id);return true;}
 if(a==='completion-later'||a==='completion-done'){acknowledgeCompletion(id,a==='completion-done');return true;}
 if(a==='negotiation-back'){
   const single=!!ui.pendingSelection;ui.pendingSelection=null;ui.modal={type:single?'picker':'wizard'};if(!single)ui.step=1;renderDialog();return true;
 }
 if(a==='accept-negotiation'){
   E.assertCrewAvailable(game,ui.pendingSelection??ui.draft);
   if(ui.pendingSelection){const d=ui.pendingSelection,r=N.castingOffer(game,d,ui.offerPerson);if(r.status==='refused')throw Error('거절한 인물은 선택할 수 없습니다.');d.castingAgreements??={};d.castingAgreements[r.person]={fingerprint:r.fingerprint,accepted:true,total:r.total,extra:r.extra};ui.draft=d;ui.pendingSelection=null;}
   else N.acceptOffers(game,ui.draft);
   ui.modal={type:'wizard'};renderDialog();toast('섭외 조건을 수락했습니다. 제작 확정 전까지 비용은 지출되지 않습니다.');return true;
 }
 if(a==='replace-negotiation'){
   const p=PERSON[id],d=ui.draft,index=p.role==='director'?0:d[p.role==='lead'?'leads':'supports'].indexOf(id);
   ui.picker={role:p.role,index,gender:'all',genre:'all',query:'',sort:'fit-desc',available:true,page:0,age:'all',status:'all'};ui.pendingSelection=null;open('picker');return true;
 }
 return false;
}
// Keep browser-native fullscreen exit, responsive card counts and filter disclosure state in sync.
document.addEventListener('fullscreenchange',()=>{render();});
document.addEventListener('webkitfullscreenchange',()=>{render();});
document.addEventListener('pointerdown',()=>sound.unlock(),{passive:true});
document.addEventListener('toggle',e=>{if(e.target.matches?.('details[data-filter-panel]')){ui.filtersOpen??={};ui.filtersOpen[e.target.dataset.filterPanel]=e.target.open;}},true);
$('notification-popups')?.addEventListener('pointerenter',()=>ui.popupHovered=true);
$('notification-popups')?.addEventListener('pointerleave',()=>ui.popupHovered=false);
let resizeCardsTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeCardsTimer);resizeCardsTimer=setTimeout(()=>{if(game&&!ui.home&&(['talents','scripts'].includes(ui.view)||ui.modal?.type==='picker')){if(ui.modal?.type==='picker')renderDialog();else render();}},160);});
features=createStudioFeatures({getGame:()=>game,ui,E,X,R,esc,btn,icon,tags,avatar,dialogFrame,pageHead,open,render,renderDialog,mutate,go,persist,toast,relationBadge,timelinePanel,filmCareerNotes,posterPicker,statusLabel});
updates=createStudioUpdates({getGame:()=>game,ui,E,X,R,esc,btn,icon,tags,avatar,dialogFrame,pageHead,open,render,renderDialog,mutate,go,persist,toast,features,personCard,statusLabel,startPlanning});
// Prevent accidental text/image selection without disabling form editing or pinch zoom.
const editableTarget=t=>t instanceof Element&&!!t.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
document.addEventListener('contextmenu',e=>{if(!editableTarget(e.target))e.preventDefault();});
document.addEventListener('selectstart',e=>{if(!editableTarget(e.target))e.preventDefault();});
document.addEventListener('dragstart',e=>{if(e.target instanceof HTMLImageElement)e.preventDefault();});
let spaceHeld=false,spaceHandled=false;
document.addEventListener('keydown',e=>{
 if(!(e.code==='Space'||e.key===' ')||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||e.isComposing||e.keyCode===229||editableTarget(e.target))return;
 if(e.repeat||spaceHeld){e.preventDefault();return;}
 let target=null;
 if(game&&!ui.home&&!ui.advancing){
  if(!ui.modal)target=document.querySelector('[data-action="advance"]');
  else if(ui.modal.type==='wizard'&&ui.step<2)target=document.querySelector('#dialog [data-action="wizard-next"]');
 }
 if(target&&!target.disabled){e.preventDefault();spaceHeld=true;spaceHandled=true;target.click();}
 else if(ui.advancing){e.preventDefault();spaceHeld=true;}
},true);
document.addEventListener('keyup',e=>{if(e.code==='Space'||e.key===' '){if(spaceHandled)e.preventDefault();spaceHeld=false;spaceHandled=false;}},true);
window.addEventListener('blur',()=>{spaceHeld=false;spaceHandled=false;});

if(game){X.scanPromotionAvailability(game);ui.modal=nextRequiredTask();persist();}

render();registerPageTools();
