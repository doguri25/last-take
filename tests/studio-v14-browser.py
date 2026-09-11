"""v1.4.0: genuine dist code, viewport/catalog/interaction offline browser regression."""
import argparse,json,subprocess,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import fixture_payload,load,launch_browser,ROOT
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'qa-output');args=parser.parse_args()
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
subprocess.run(['node',str(ROOT/'tests/studio-v14-fixtures.js'),str(out)],check=True)
fresh=json.loads((out/'v14-fresh.json').read_text());warm=json.loads((out/'v14-warm.json').read_text());meta=json.loads((out/'v14-meta.json').read_text())
payload=fixture_payload();checks=[];layouts=[];errors=[]
def check(label,condition,detail=None):
 checks.append({'check':label,'passed':bool(condition),'detail':detail});print(('PASS ' if condition else 'FAIL ')+label,flush=True)
 if not condition:raise AssertionError(f'{label}: {detail}')
def report():
 (out/'studio-v14-browser-report.json').write_text(json.dumps({'version':'1.4.0','transport':'actual dist ES modules/CSS via offline blob import map','checks':checks,'layouts':layouts,'pageErrors':errors},ensure_ascii=False,indent=2))
def nav(page,view):
 page.locator(f'[data-action="nav"][data-view="{view}"]').filter(visible=True).first.click();page.wait_for_timeout(260)
def close(page):
 
 for _ in range(5):
  if not page.locator('#dialog[open]').count():return
  page.locator('#dialog .dialog-header [data-action="close"]').click();page.wait_for_timeout(100)
def state(page):return page.evaluate('JSON.parse(localStorage.getItem("last-take-game-v1"))')
def capture_layout(page):
 return page.evaluate('''() => {
 const root=document.scrollingElement,main=document.querySelector('#main'),host=document.querySelector('.catalog-results');
 const rect=n=>{let r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}};
 const cards=[...document.querySelectorAll('.catalog-results .person-card,.catalog-results .script-card')];
 const controls=[...document.querySelectorAll('.filter-inline input:not([type="checkbox"]),.filter-inline select,.filter-inline .check-label')];
 const buttons=[...document.querySelectorAll('.catalog-screen .pagination button,.catalog-screen .script-buttons button')];
 const controlRects=controls.map(rect);
 return {view:main.dataset.view,width:innerWidth,height:innerHeight,rootY:root.scrollHeight-root.clientHeight,mainY:main.scrollHeight-main.clientHeight,rootX:root.scrollWidth-root.clientWidth,host:rect(host),cards:cards.map(n=>({...rect(n),overflow:n.scrollHeight-n.clientHeight})),controls:controlRects,buttons:buttons.map(rect),sameRow:!controls.length||Math.max(...controlRects.map(r=>r.y+r.h/2))-Math.min(...controlRects.map(r=>r.y+r.h/2))<3};
 }''')
try:
 with sync_playwright() as p:
  b=launch_browser(p);page=b.new_page(viewport={'width':1366,'height':768});page.set_default_timeout(5000)
  page.on('pageerror',lambda e:errors.append(str(e)));load(page,payload,fresh)
  sizes=[(1366,768),(390,844),(568,320),(320,480),(320,568),(360,640),(375,667),(412,915),(667,375),(844,390),(768,1024),(1024,768),(1920,1080)]
  for w,h in sizes:
   page.set_viewport_size({'width':w,'height':h})
   for view in ['talents','scripts']:
    nav(page,view);r=capture_layout(page);layouts.append(r)
    label=f'{view} {w}x{h}'
    check(label+' — no vertical/horizontal catalog overflow',max(r['rootY'],r['mainY'],r['rootX'])<=1,r)
    check(label+' — cards and footer actions inside viewport',all(c['y']>=r['host']['y']-1 and c['bottom']<=r['host']['bottom']+1 and c['overflow']<=1 for c in r['cards']) and all(x['bottom']<=h+1 and x['y']>=0 and x['right']<=w+1 for x in r['buttons']),r)
    if view=='talents':check(label+' — filters visible on one row',len(r['controls'])==7 and r['sameRow'] and all(x['w']>0 and x['x']>=0 and x['right']<=w+1 for x in r['controls']),r['controls'])
    page.evaluate('window.scrollTo(0,300)');check(label+' — attempted window scroll stays at zero',page.evaluate('scrollY')==0)
    if (w,h) in [(1366,768),(390,844),(568,320)]:page.screenshot(path=str(out/f'{view}-{w}x{h}.png'))
  page.set_viewport_size({'width':390,'height':844});nav(page,'talents')
  check('all 21 specialist genre filters present',page.locator('#people-genre option').count()==22)
  first=page.locator('.catalog-results .person-card').first.get_attribute('data-id')
  page.locator('[data-action="people-page"][data-delta="1"]').click();page.wait_for_timeout(180)
  check('people next page reaches different IDs',page.locator('.person-card').first.get_attribute('data-id')!=first)
  page.locator('#people-gender').select_option('F');page.wait_for_timeout(160)
  check('female filter works without collapsing',page.locator('#people-gender').input_value()=='F' and all(x['gender']=='F' for x in fresh['roster'] if x['id'] in page.locator('.person-card').evaluate_all('(ns)=>ns.map(n=>n.dataset.id)')))
  page.locator('#people-query').fill('존재하지않는사람검사');page.wait_for_timeout(220)
  check('empty search state is accessible and does not overflow',page.locator('.catalog-results .empty').count()==1 and capture_layout(page)['mainY']<=1)
  page.locator('#people-query').fill('');page.locator('#people-gender').select_option('all');page.locator('#people-sort').select_option('skill-asc');page.wait_for_timeout(180)
  card_ids=page.locator('.person-card').evaluate_all('(ns)=>ns.map(n=>n.dataset.id)');skills=[next(x['skill'] for x in fresh['roster'] if x['id']==i) for i in card_ids]
  check('ability low-to-high sort works',skills==sorted(skills))
  nav(page,'scripts');check('script search has 21 genre filters',page.locator('#script-genre option').count()==22)
  titles=page.locator('.script-card h3').all_text_contents();page.locator('[data-action="script-page"][data-delta="1"]').click();page.wait_for_timeout(160)
  check('script pagination shows different proposals',page.locator('.script-card h3').all_text_contents()!=titles)
  title=page.locator('.script-card h3').first.inner_text();page.locator('#script-query').fill(title);page.wait_for_timeout(200)
  check('scenario title search works',page.locator('.script-card').count()>=1 and title in page.locator('.script-card h3').all_text_contents())
  page.locator('[data-action="script-info"]').first.click();check('full synopsis remains available despite compact cards',page.locator('#dialog-title').inner_text()==title and page.locator('#dialog .dialog-body').inner_text().__len__()>65);close(page)
  page.locator('#script-query').fill('');page.wait_for_timeout(180);page.locator('[data-action="licenses"]').first.click()
  check('only two source works are offered',page.locator('#dialog .rights-card').count()==2)
  original_titles=page.locator('#dialog .rights-card h3').all_text_contents();page.screenshot(path=str(out/'licenses-mobile.png'))
  page.locator('[data-action="rights-info"]').first.click();check('original dossier includes world and contract',all(t in page.locator('#dialog').inner_text() for t in ['원작의 세계','라이선스 조건','주요 등장인물']));close(page)
  # Enter a real draft and check every new genre can be selected and deselected.
  nav(page,'scripts');# Only enabled proposals may enter planning.
  page.locator('[data-action="pitch"]:not([disabled])').first.click();check('planning exposes all 21 genres',page.locator('.genre-options button').count()==21)
  old_selected=page.locator('.genre-option.selected').evaluate_all('(ns)=>ns.map(n=>n.dataset.id)')
  for genre in ['horror','crime','sports','documentary','war','disaster','western','legal']:
   control=page.locator(f'[data-action="genre-toggle"][data-id="{genre}"]');was=control.get_attribute('aria-pressed')=='true';control.click()
   check(genre+' selectable and reversible',control.get_attribute('aria-pressed')==str(not was).lower());control.click()
  close(page)
  # Retain normal scrolling outside the two catalogs.
  nav(page,'studio');check('normal game layout is not globally scroll-locked',not page.evaluate('document.documentElement.classList.contains("catalog-fit")'))
  # Warm fixture: actual twelve weeks of production and ability development.
  person_page=b.new_page(viewport={'width':390,'height':844});person_page.on('pageerror',lambda e:errors.append(str(e)));load(person_page,payload,warm);nav(person_page,'talents')
  person_page.locator(f'[data-action="people-role"][data-role="{meta["role"]}"]').click();person_page.locator('#people-query').fill(meta['name']);person_page.wait_for_timeout(180)
  person_page.locator(f'[data-action="person"][data-id="{meta["person"]}"]').click();check('active person profile has ability history entry',person_page.locator('[data-action="ability-history"]').count()==1)
  person_page.locator('[data-action="ability-history"]').click();check('ability history shows multiple genuine dated records',person_page.locator('.ability-records article').count()>1 and person_page.locator('.ability-chart').count()==1)
  person_page.screenshot(path=str(out/'ability-history-mobile.png'))
  person_page.locator('[data-action="ability-back"]').click();check('ability graph returns to the same person',meta['name'] in person_page.locator('#dialog').inner_text() and person_page.locator('[data-action="ability-history"]').get_attribute('data-id')==meta['person'])
  person_page.locator(f'#dialog [data-action="film"][data-id="{meta["film"]}"]').click();check('person film history still opens the right film',meta['title'] in person_page.locator('#dialog-title').inner_text())
  back=person_page.locator('#dialog [data-action="peek-back"]');
  if not back.count():back=person_page.locator('#dialog [data-action="detail-back"]')
  if not back.count():back=person_page.get_by_role('button',name='뒤로가기',exact=False)
  back.first.click();check('film back restores the same person profile',person_page.locator('[data-action="ability-history"]').get_attribute('data-id')==meta['person']);close(person_page)
  reload_page=b.new_page(viewport={'width':390,'height':844});reload_page.on('pageerror',lambda e:errors.append(str(e)));persisted=state(person_page);load(reload_page,payload,persisted)
  after=state(reload_page);oldp=next(x for x in persisted['roster'] if x['id']==meta['person']);newp=next(x for x in after['roster'] if x['id']==meta['person']);check('reopening a saved game preserves current abilities/history',oldp['abilityState']==newp['abilityState'])
  # Fresh game advanced using the actual button; no force/proxy/test patches.
  week_page=b.new_page(viewport={'width':1366,'height':768});week_page.on('pageerror',lambda e:errors.append(str(e)));load(week_page,payload,fresh)
  weekly=[]
  for w in range(1,5):
   week_page.locator('[data-action="advance"]').click();week_page.wait_for_timeout(1200);s=state(week_page);check(f'advance button completes exactly week {w}',s['week']==w)
   news=[n for n in s['notifications'] if n.get('key')==f'weekly-experience:{w}'];check(f'week {w} always has event or concise progress report',len(news)==1 and bool(news[0]['text']));weekly.extend(news)
  check('quiet-week progress summary is actually reached via normal gameplay',any(n['type']=='weekly-progress' for n in weekly),[n['type'] for n in weekly])
  s=state(week_page);rights=next(n for n in s['notifications'] if n.get('key')=='rights-window:1');check('four-week license refresh produces popup notice',rights['popup'] is True)
  week_page.screenshot(path=str(out/'weekly-notifications-desktop.png'))
  week_page.locator(f'[data-action="notification-open"][data-id="{rights["id"]}"]').filter(visible=True).first.click()
  check('rights notification links to the current two offers',week_page.locator('.rights-card').count()==2)
  check('offers really rotate after four weekly advances',week_page.locator('.rights-card h3').all_text_contents()!=original_titles)
  close(week_page);week_page.locator('[data-action="home"]').filter(visible=True).first.click();week_page.wait_for_timeout(300)
  check('save and return home still works',week_page.locator('[data-action="resume"]').count()>0)
  for w,h in [(1366,768),(390,844),(568,320)]:
   week_page.set_viewport_size({'width':w,'height':h});week_page.wait_for_timeout(260)
   check(f'proportional first screen still fits {w}x{h}',week_page.evaluate('document.scrollingElement.scrollHeight<=innerHeight+1'))
  check('no uncaught JavaScript errors',not errors,errors);b.close()
 report();print('COMPLETE',len(checks),'checks',len(layouts),'viewport cases',flush=True)
except Exception:
 report();traceback.print_exc();raise
