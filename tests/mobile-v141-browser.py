"""v1.4.1: actual application modules/CSS and real Chromium History API, offline transport.
No simulation or UI implementation is replaced. Only saved-fixture localStorage and module delivery
use the pre-existing browser_support harness, because network navigation is unavailable here.
"""
import argparse,json,subprocess,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import fixture_payload,load,launch_browser,ROOT
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'qa-output');args=parser.parse_args()
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
if not (out/'v14-warm.json').exists():subprocess.run(['node',str(ROOT/'tests/studio-v14-fixtures.js'),str(out)],check=True)
fresh=json.loads((out/'v14-fresh.json').read_text());warm=json.loads((out/'v14-warm.json').read_text());meta=json.loads((out/'v14-meta.json').read_text())
payload=fixture_payload();checks=[];layouts=[];errors=[];page=None

def check(label,ok,detail=None):
 checks.append({'check':label,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+label,flush=True)
 if not ok:raise AssertionError(f'{label}: {detail}')
def wait(p):p.wait_for_timeout(260)
def act(p,a,extra=''):
 return p.locator(f'[data-action="{a}"]{extra}').filter(visible=True).first

def click(p,a,extra=''):
 act(p,a,extra).click();wait(p)
def nav(p,view):click(p,'nav',f'[data-view="{view}"]')
def back(p):p.go_back();wait(p)
def forward(p):p.go_forward();wait(p)
def modal(p):return p.locator('#dialog').get_attribute('data-modal') if p.locator('#dialog[open]').count() else None
def view(p):return p.locator('#main').get_attribute('data-view')
def saved(p):return p.evaluate('localStorage.getItem("last-take-game-v1")')
def newpage(b,data,size=(390,844)):
 p=b.new_page(viewport={'width':size[0],'height':size[1]});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)));load(p,payload,data);return p

def layout(p):return p.evaluate('''() => {
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 const visible=e=>e.getClientRects().length&&getComputedStyle(e).display!=='none';
 const dock=document.querySelector('.mobile-dock'),mobile=visible(dock),main=document.querySelector('#main'),root=document.scrollingElement;
 const advance=[...document.querySelectorAll('[data-action="advance"]')].filter(visible);
 return {w:innerWidth,h:innerHeight,mobile,dock:box(dock),advance:advance.map(box),menu:mobile?[...document.querySelectorAll('.mobile-nav button')].map(box):[],rootX:root.scrollWidth-root.clientWidth,rootY:root.scrollHeight-root.clientHeight,mainY:main.scrollHeight-main.clientHeight,
 buttons:[...document.querySelectorAll('.catalog-screen .pagination button,.catalog-screen .script-buttons button')].filter(visible).map(box),cards:[...document.querySelectorAll('.catalog-results .person-card,.catalog-results .script-card')].map(e=>({...box(e),overflow:e.scrollHeight-e.clientHeight}))};
}''')
try:
 with sync_playwright() as pw:
  browser=launch_browser(pw)
  page=newpage(browser,warm)
  check('game loads with real source and no blank page',view(page)=='studio' and len(page.locator('body').inner_text())>100)
  original=saved(page)
  nav(page,'scripts');nav(page,'talents')
  page.locator('#people-query').fill(meta['name']);wait(page)
  click(page,'person',f'[data-id="{meta["person"]}"]')
  check('person profile opens from filtered catalog',modal(page)=='person')
  click(page,'film',f'[data-id="{meta["film"]}"]')
  check('film opens from the person work history',modal(page)=='film' and meta['title'] in page.locator('#dialog-title').inner_text())
  back(page);check('browser back restores the same person',modal(page)=='person' and meta['name'] in page.locator('#dialog').inner_text())
  click(page,'film',f'[data-id="{meta["film"]}"]');click(page,'film-tab','[data-id="history"]')
  click(page,'close');check('closing film after changing tabs restores the person, not another film tab',modal(page)=='person' and meta['name'] in page.locator('#dialog').inner_text())
  back(page);check('browser back closes profile and preserves name search',modal(page) is None and view(page)=='talents' and page.locator('#people-query').input_value()==meta['name'])
  back(page);check('browser back restores the previous catalog',view(page)=='scripts')
  forward(page);check('browser forward restores the character catalog and query',view(page)=='talents' and page.locator('#people-query').input_value()==meta['name'])
  forward(page);check('browser forward reopens the exact person',modal(page)=='person' and meta['name'] in page.locator('#dialog').inner_text())
  click(page,'close');check('in-game close and browser history stay aligned',modal(page) is None and view(page)=='talents')
  nav(page,'studio')
  page.locator('summary').filter(has_text='경쟁사 제작 소식').click();click(page,'market-forecast')
  check('release forecast button directly selects the schedule tab',view(page)=='market' and page.locator('[data-action="market-tab"].active').get_attribute('data-tab')=='schedule')
  back(page);check('back from release forecast returns to the studio',view(page)=='studio')
  nav(page,'market');click(page,'market-tab','[data-tab="schedule"]')
  click(page,'more');check('more opens above the current game page',modal(page)=='more' and view(page)=='market')
  footer=page.locator('#dialog .dialog-footer [data-action="close"]')
  check('more has a visible bottom close button',footer.is_visible() and footer.inner_text()=='닫기')
  page.screenshot(path=str(out/'more-mobile.png'))
  history_length=page.evaluate('history.length')
  for a in ['help','versions','help','versions']:
   click(page,a);check(a+' opens from more',modal(page)==a)
   page.locator('#dialog .dialog-footer [data-action="close"]').click();wait(page)
   check(a+' confirm returns to more, never home',modal(page)=='more' and view(page)=='market' and page.locator('.start-viewport').count()==0)
  check('repeated guide/version viewing does not accumulate closed screens',page.evaluate('history.length')<=history_length+1)
  click(page,'help');back(page);check('browser back from guide returns to more',modal(page)=='more')
  click(page,'versions');page.keyboard.press('Escape');wait(page);check('Escape closes version history to more',modal(page)=='more')
  click(page,'help');page.evaluate('document.getElementById("dialog").dispatchEvent(new Event("cancel",{cancelable:true}))');wait(page)
  check('native dialog cancel returns one level only',modal(page)=='more')
  page.locator('#dialog .dialog-footer [data-action="close"]').click();wait(page)
  check('more bottom close returns to the same boxoffice tab',modal(page) is None and view(page)=='market' and page.locator('[data-action="market-tab"].active').get_attribute('data-tab')=='schedule')
  check('navigation never changes saved weeks, money, contracts or records',saved(page)==original)
  # A state marker survives a real about:blank reload; the harness only redelivers resources.
  click(page,'more');click(page,'versions');state_before_reload=saved(page)
  page.reload();load(page,payload,json.loads(state_before_reload));wait(page)
  check('reload restores the current version-history screen',modal(page)=='versions' and view(page)=='market')
  back(page);check('after reload browser back still restores more',modal(page)=='more')
  click(page,'close');page.close()

  page=newpage(browser,fresh)
  sizes=[(320,480),(320,568),(360,640),(390,844),(412,915),(568,320),(667,375),(844,390),(768,1024),(900,700),(1024,768),(1366,768)]
  for w,h in sizes:
   page.set_viewport_size({'width':w,'height':h});wait(page)
   for v in ['talents','scripts']:
    nav(page,v);r=layout(page);layouts.append({'view':v,**r});label=f'{v} {w}x{h}'
    check(label+' has no page/catalog vertical or horizontal scrolling',max(r['rootX'],r['rootY'],r['mainY'])<=1,r)
    check(label+' has exactly one visible progress button',len(r['advance'])==1,r['advance'])
    edge=r['dock']['y'] if r['mobile'] else h
    check(label+' catalog actions are above the bottom controls',all(x['y']>=0 and x['bottom']<=edge+1 and x['right']<=w+1 for x in r['buttons']),r)
    check(label+' card text is not vertically clipped',all(c['overflow']<=1 for c in r['cards']),r['cards'])
    if r['mobile']:
     check(label+' progress button is within the bottom dock',r['advance'][0]['y']>=r['dock']['y']-1 and r['advance'][0]['bottom']<=h+1,r)
     check(label+' five menu buttons are equally spaced on one row',len(r['menu'])==5 and max(x['w'] for x in r['menu'])-min(x['w'] for x in r['menu'])<2 and max(x['y'] for x in r['menu'])-min(x['y'] for x in r['menu'])<2,r['menu'])
    else:check(label+' desktop progress remains in the header',r['advance'][0]['y']<100,r['advance'])
    if (w,h) in [(390,844),(568,320),(1366,768)]:page.screenshot(path=str(out/f'{v}-{w}x{h}.png'))
  page.set_viewport_size({'width':390,'height':844});nav(page,'studio');page.screenshot(path=str(out/'studio-mobile.png'))
  before=json.loads(saved(page));week=before.get('week',0)
  click(page,'advance');page.wait_for_timeout(1100)
  now=json.loads(saved(page));check('bottom progress advances exactly one week',now['week']==week+1)
  if modal(page):click(page,'close')
  nav(page,'scripts');back(page)
  check('back after weekly progress does not rewind the week',json.loads(saved(page))['week']==week+1)
  page.keyboard.press('Space');page.wait_for_timeout(1300)
  check('space uses the visible mobile progress button',json.loads(saved(page))['week']==week+2)
  page.close()

  page=newpage(browser,fresh)
  back(page);check('back at the saved studio reaches the in-game home',page.locator('.start-viewport').is_visible() and page.locator('[data-action="resume"]').count()==1)
  forward(page);check('forward restores studio without creating another company',view(page)=='studio' and json.loads(saved(page))['companies'][0]['name']==fresh['companies'][0]['name'])
  nav(page,'scripts');click(page,'pitch',':not([disabled])');click(page,'wizard-next')
  check('planning can advance to casting',modal(page)=='wizard' and page.locator('[data-action="cast-slot"]').count()>0)
  click(page,'cast-slot','[data-role="director"]');check('casting picker opens',modal(page)=='picker')
  back(page);check('browser back from picker restores the casting draft',modal(page)=='wizard' and page.locator('[data-action="cast-slot"]').count()>0)
  back(page);check('browser back restores the previous planning step',modal(page)=='wizard' and page.locator('[data-action="genre-toggle"]').count()>0)
  check('browsing draft steps spends no money',json.loads(saved(page))['companies'][0]['cash']==fresh['companies'][0]['cash'])
  page.close()
  check('no JavaScript runtime errors',not errors,errors)
  browser.close()
except Exception:
 if page:
  try:page.screenshot(path=str(out/'failure.png'))
  except Exception:pass
 traceback.print_exc();raise
finally:
 report={'version':'1.4.1','transport':'Offline genuine dist resources; actual Chromium History API and go_back/go_forward','checks':checks,'layouts':layouts,'pageErrors':errors}
 (out/'mobile-navigation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(f'Completed {sum(c["passed"] for c in checks)}/{len(checks)} checks; JS errors: {len(errors)}',flush=True)
