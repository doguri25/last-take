"""Actual dist modules/CSS via offline blobs; native History API and DOM are unmodified.
The container disallows HTTP navigation and has no agent-browser; installed Chromium is used.
"""
import json, subprocess, argparse, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import fixture_payload, load, launch_browser, ROOT
parser=argparse.ArgumentParser();parser.add_argument('--casting-only',action='store_true');parser.add_argument('--output',type=Path,default=ROOT/'qa-output');args=parser.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
meta=json.loads(subprocess.check_output(['node','--input-type=module','-e',r'''
import * as E from './dist/engine.js';import * as N from './dist/casting.js';
for(let seed=1;seed<100;seed++){
 const s=E.createGame('모먼트 필름',seed),script=s.pitches.find(p=>!E.busyFilm(s,p.writer));
 const d=E.recommend(s,{script,title:script.title,genres:[script.genre],scale:'small',runtime:120,formats:[],leads:[],supports:[],requireNegotiation:true,castingAgreements:{}});
 const reports=N.negotiationReport(s,d);
 if(reports.some(r=>r.status==='counter')&&!reports.some(r=>r.status==='refused')){console.log(JSON.stringify({s,d,reports}));break;}
}
'''],cwd=ROOT,text=True))
APP_VERSION=json.loads((ROOT/'package.json').read_text())['version']
payload=fixture_payload();checks=[];errors=[];p=None

def check(label,passed,detail=None):
 checks.append({'check':label,'passed':bool(passed),'detail':detail});print(('PASS ' if passed else 'FAIL ')+label,flush=True)
 if not passed:
  if p:p.screenshot(path=str(out/'failure.png'))
  raise AssertionError(f'{label}: {detail}')
def wait():p.wait_for_timeout(260)
def click(a,extra=''):
 p.locator(f'[data-action="{a}"]{extra}').filter(visible=True).first.click();wait()
def header_close():p.locator('.dialog-header [data-action="close"]').click();wait()
def page(b,saved=None,size=(390,844),touch=True):
 q=b.new_page(viewport={'width':size[0],'height':size[1]},is_mobile=touch,has_touch=touch)
 q.set_default_timeout(7000);q.on('pageerror',lambda e:errors.append(str(e)));load(q,payload,saved);return q

def planning():
 click('nav','[data-view="scripts"]');click('pitch',f'[data-id="{meta["d"]["script"]["id"]}"]')
def saved():return p.evaluate('localStorage.getItem("last-take-game-v1")')
def ids():return p.locator('.negotiation-card').evaluate_all('(es)=>es.map(e=>e.dataset.personId)')
def current_modal():return p.locator('#dialog').get_attribute('data-modal')
def candidate(old,d,want='allowed',clean=True):
 return p.evaluate('''async ({old,d,want,clean})=>{
 const E=await import(window.__fixtureModules['lasttake/engine.js']),N=await import(window.__fixtureModules['lasttake/casting.js']),s=E.migrateSave(JSON.parse(localStorage.getItem('last-take-game-v1')));
 const slot=N.replacementSlot(d,old);
 for(const x of E.people(s).filter(x=>x.role===slot.role&&E.eligible(s,x,d.genres)&&!E.busyFilm(s,x.id)&&!E.crewIds(d).includes(x.id))){
  const n=N.castingReplacement(s,d,old,x.id),report=N.negotiationReport(s,n),reply=report.find(r=>r.person===x.id);
  if((want==='allowed'?reply.status!=='refused':reply.status===want)&&(!clean||report.every(r=>r.status!=='refused')))
   return {id:x.id,name:x.name,draft:n,reply,report,total:E.estimate(n,s).total,prices:report.map(r=>({id:r.person,status:r.status,total:E.money(r.total),reasons:r.reasons}))};
 }
 throw Error('No matching candidate in fixture');
 }''',{'old':old,'d':d,'want':want,'clean':clean})
def choose(c):
 p.locator('#picker-query').fill(c['name']);wait()
 loc=p.locator(f'[data-action="choose-person"][data-id="{c["id"]}"]')
 for _ in range(10):
  if loc.count():break
  p.locator('[data-action="people-page"][data-delta="1"]').click();wait()
 loc.click();wait()
def assert_full(expected,label):
 check(label+' returns to all seven terms',current_modal()=='negotiation' and len(ids())==7,ids())
 for row in expected['prices']:
  card=p.locator(f'.negotiation-card[data-person-id="{row["id"]}"]')
  check(label+' recomputes '+row['id'],card.count()==1 and row['status'] in card.get_attribute('class') and card.locator('.offer-price strong').last.inner_text()=='총 '+row['total'])

try:
 with sync_playwright() as pw:
  b=launch_browser(pw)
  p=page(b);check('initial page loads with current version '+APP_VERSION,p.locator('[data-action="versions"]').inner_text().startswith('v'+APP_VERSION));p.screenshot(path=str(out/'start-mobile.png'));p.close()
  for size in ([] if args.casting_only else [(320,568),(390,844),(568,320),(1366,768)]):
   touch=size[0]<900;p=page(b,meta['s'],size,touch);planning()
   while p.locator('[data-action="genre-toggle"].selected').count():click('genre-toggle','.selected')
   for g in ['drama','comedy','family']:click('genre-toggle',f'[data-id="{g}"]')
   p.locator('.subgenre-grid').scroll_into_view_if_needed();wait()
   p.evaluate('''()=>{window.__nativeSelects=[...document.querySelectorAll('.subgenre-grid select')];window.__selectMutations=0;window.__selectFocus=0;
   window.__observer=new MutationObserver(rs=>{for(const r of rs)for(const n of [...r.addedNodes,...r.removedNodes])if(n.nodeType===1&&(n.matches?.('select[data-field="subgenre"]')||n.querySelector?.('select[data-field="subgenre"]')))window.__selectMutations++;});
   window.__observer.observe(document.getElementById('dialog'),{subtree:true,childList:true});
   document.getElementById('dialog').addEventListener('focusin',e=>{if(e.target.matches('select[data-field="subgenre"]'))window.__selectFocus++;});}''')
   values=[]
   for i in range(3):
    el=p.locator('.subgenre-grid select').nth(i);el.focus();p.evaluate('window.__selectFocus=0');value=el.locator('option').nth(1).get_attribute('value');values.append(value)
    before=p.locator('.dialog-body').evaluate('(e)=>e.scrollTop');el.select_option(value);wait()
    state=p.evaluate('''()=>({same:window.__nativeSelects.every(e=>e.isConnected&&document.getElementById(e.id)===e),count:document.querySelectorAll('select[data-field="subgenre"]').length,mutations:window.__selectMutations,focus:window.__selectFocus,active:document.activeElement.tagName,scroll:document.querySelector('.dialog-body').scrollTop})''')
    check(f'{size} subgenre {i+1} retains native node and only three controls',state['same'] and state['count']==3 and state['mutations']==0,state)
    check(f'{size} subgenre {i+1} never refocuses another selector',state['focus']==0 and (not touch or state['active']!='SELECT'),state)
    check(f'{size} subgenre {i+1} preserves scroll',abs(state['scroll']-before)<=3,{'before':before,'after':state['scroll']})
   note=p.locator('[data-subgenre-effect]').inner_text();expected=p.evaluate('''async ()=>{const R=await import(window.__fixtureModules['lasttake/relationships.js']);const es=[...document.querySelectorAll('.subgenre-grid select')];return R.subgenreEffect({genres:es.map(e=>e.dataset.genre),subgenres:Object.fromEntries(es.map(e=>[e.dataset.genre,e.value]))});}''')
   check(f'{size} subgenre explanation updates to current combination',f'품질 {"+" if expected>=0 else ""}{expected}' in note)
   rects=p.locator('.subgenre-grid select').evaluate_all('(es)=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right}})')
   check(f'{size} still shows all three selectors on one row',max(r['y'] for r in rects)-min(r['y'] for r in rects)<2 and all(r['x']>=0 and r['right']<=size[0]+1 for r in rects))
   p.set_viewport_size({'width':size[0],'height':size[1]-50});wait()
   check(f'{size} viewport resize does not rebuild a live wizard select',p.evaluate('window.__nativeSelects.every(e=>e.isConnected)'))
   p.set_viewport_size({'width':size[0],'height':size[1]});wait();p.evaluate('window.__observer.disconnect()')
   if size==(390,844):p.screenshot(path=str(out/'subgenre-mobile.png'))
   click('wizard-next');click('wizard-back');check(f'{size} selection survives next/back',p.locator('.subgenre-grid select').evaluate_all('(es)=>es.map(e=>e.value)')==values)
   p.close()
  p=page(b,meta['s']);planning();click('scale','[data-id="small"]');click('wizard-next');click('recommend');click('wizard-next');click('review-negotiations')
  d=meta['d'];initial=saved();original=ids()
  check('every accepted or counteroffer member has a replacement button',len(original)==7 and p.locator('[data-action="replace-negotiation"]').count()==7)
  check('final report includes accepted and additional-fee states',p.locator('.negotiation-card.accepted').count()>0 and p.locator('.negotiation-card.counter').count()>0)
  p.screenshot(path=str(out/'final-offers-mobile.png'))
  # Candidate inspection/cancellation must be a transaction, including browser back.
  old=d['director'];c=candidate(old,d)
  click('replace-negotiation',f'[data-id="{old}"]');check('picker explicitly returns to final terms','최종 섭외 조건' in p.locator('.dialog-footer').inner_text())
  choose(c);check('replacement preview opens a single reply',len(ids())==1 and ids()[0]==c['id']);check('candidate inspection does not spend money',saved()==initial)
  header_close();check('preview close returns to same replacement picker',current_modal()=='picker')
  header_close();check('picker cancel preserves all original members',ids()==original and current_modal()=='negotiation')
  click('replace-negotiation',f'[data-id="{old}"]');p.evaluate('history.back()');wait();check('native browser back returns to original final report',ids()==original)
  # Preview a genuinely refused candidate. They must not displace the original.
  bad=candidate(old,d,'refused',False);click('replace-negotiation',f'[data-id="{old}"]');choose(bad)
  check('refused candidate cannot be accepted',p.locator('.negotiation-card.refused').count()==1 and p.locator('[data-action="accept-negotiation"]').count()==0)
  click('negotiation-back');header_close();check('refusal preserves original team and money',ids()==original and saved()==initial,{'ids':ids(),'original':original,'fundsUnchanged':saved()==initial})
  # Exercise each of the seven role positions, returning directly to recomputed full reports.
  for old in [d['director'],*d['leads'],*d['supports']]:
   c=candidate(old,d);click('replace-negotiation',f'[data-id="{old}"]');choose(c)
   check('candidate '+old+' previews without payment',saved()==initial)
   click('accept-negotiation');d=c['draft'];assert_full(c,'replacement '+old)
   check('replacement '+old+' summary is visible',p.locator('.replacement-notice').count()==1 and c['name'] in p.locator('.replacement-notice').inner_text())
   check('replacement '+old+' clears old person and still offers seven replace buttons',old not in ids() and p.locator('[data-action="replace-negotiation"]').count()==7)
   check('replacement '+old+' has not altered game funds or time',saved()==initial)
  p.screenshot(path=str(out/'recomputed-offers-mobile.png'))
  current=ids();header_close();check('closing recomputed final terms returns to production confirmation',current_modal()=='wizard' and p.locator('[data-action="greenlight"]').count()==1)
  click('review-negotiations');check('reopened final conditions preserve replacements',ids()==current)
  click('accept-negotiation');check('accepting final new terms does not spend cash',saved()==initial)
  check('final acceptance returns to confirmation rather than home',current_modal()=='wizard' and p.locator('[data-action="greenlight"]').count()==1)
  total=p.evaluate('''async d=>{const E=await import(window.__fixtureModules['lasttake/engine.js']);return E.estimate(d,E.migrateSave(JSON.parse(localStorage.getItem('last-take-game-v1')))).total;}''',d)
  click('greenlight');after=json.loads(saved());before=json.loads(initial);new=[f for f in after['films'] if f['company']=='c0' and f['script']['id']==d['script']['id']]
  check('exactly one replacement-based movie is started',len(new)==1 and new[0]['director']==d['director'] and new[0]['leads']==d['leads'] and new[0]['supports']==d['supports'])
  check('the recalculated production price is charged only once',round(before['companies'][0]['cash']-after['companies'][0]['cash'],2)==total and len(after['ledger'])==len(before['ledger'])+1)
  p.evaluate('history.back()');wait();check('back after production cannot revive a stale draft or duplicate payment',not p.locator('#dialog[open][data-modal="wizard"]').count() and json.loads(saved())['companies'][0]['cash']==after['companies'][0]['cash'] and len(json.loads(saved())['films'])==len(after['films']))
  click('more');click('help');header_close();check('existing mobile guide close still returns to More',current_modal()=='more')
  header_close();check('closing More stays inside the game',p.locator('.shell').count()==1 and p.locator('#dialog[open]').count()==0)
  check('no JavaScript errors',not errors,errors)
  b.close()
except Exception:
 if p:
  try:p.screenshot(path=str(out/'failure.png'))
  except Exception:pass
 traceback.print_exc();raise
finally:
 (out/'mobile-v143-report.json').write_text(json.dumps({'version':'1.4.3','transport':'offline actual dist modules and CSS; native DOM and History API','checks':checks,'pageErrors':errors,'sizes':[[320,568],[390,844],[568,320],[1366,768]],'realMobileDevicesTested':False},ensure_ascii=False,indent=2))
 print(f'{sum(x["passed"] for x in checks)}/{len(checks)} passed',flush=True)
