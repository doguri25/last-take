"""v1.4.2 focused UI regression, using the actual modules/styles via the offline test transport."""
import json,subprocess,argparse,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import fixture_payload,load,launch_browser,ROOT
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'qa-output');out=parser.parse_args().output.resolve();out.mkdir(parents=True,exist_ok=True)
if not (out/'v14-fresh.json').exists():subprocess.run(['node',str(ROOT/'tests/studio-v14-fixtures.js'),str(out)],check=True)
fresh=json.loads((out/'v14-fresh.json').read_text());payload=fixture_payload();checks=[];errors=[];page=None
sizes=[(320,568),(360,640),(390,844),(412,915),(568,320),(844,390),(768,1024),(1366,768)]
def check(label,ok,detail=None):
 checks.append({'check':label,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+label,flush=True)
 if not ok:raise AssertionError(f'{label}: {detail}')
def wait(p):p.wait_for_timeout(230)
def click(p,a,extra=''):p.locator(f'[data-action="{a}"]{extra}').filter(visible=True).first.click();wait(p)
def nav(p,v):click(p,'nav',f'[data-view="{v}"]')
def newpage(b,data=None,size=(390,844)):
 p=b.new_page(viewport={'width':size[0],'height':size[1]});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)));load(p,payload,data);return p
def money(p):return json.loads(p.evaluate('localStorage.getItem("last-take-game-v1")'))['companies'][0]['cash']
def quote(p):return p.locator('.format-cost').all_inner_texts()
try:
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for w,h in sizes:
   page=newpage(b,size=(w,h));check(f'start {w}x{h} preserves literal word spacing',page.locator('.start-intro h1').text_content()=='당신의 영화사가 시작되는 순간.')
   check(f'start {w}x{h} still has no page scrolling',page.evaluate('document.scrollingElement.scrollHeight<=innerHeight+1'))
   page.close()
  page=newpage(b,fresh)
  for w,h in sizes:
   page.set_viewport_size({'width':w,'height':h});wait(page);nav(page,'scripts')
   mobile=page.evaluate("matchMedia('(max-width:900px), (max-height:500px) and (orientation:landscape)').matches")
   if mobile:
    check(f'scripts {w}x{h} shows all proposals without page buttons',page.locator('.script-card').count()==len(fresh['pitches']) and page.locator('.scripts-screen .pagination').count()==0)
    check(f'scripts {w}x{h} scrolls only vertically',page.evaluate('document.scrollingElement.scrollHeight>innerHeight && document.scrollingElement.scrollWidth<=innerWidth+1'))
    page.evaluate('scrollTo(0,document.scrollingElement.scrollHeight)');wait(page)
    r=page.locator('.script-buttons').last.bounding_box();dock=page.locator('.mobile-dock').bounding_box();check(f'scripts {w}x{h} final actions clear the dock',r['y']>=0 and r['y']+r['height']<=dock['y']+1)
    page.locator('.script-buttons [data-action="script-info"]').last.click();wait(page);check(f'scripts {w}x{h} last proposal details open',page.locator('#dialog[open]').count()==1)
    click(page,'close');check(f'scripts {w}x{h} close stays in the script list',page.locator('#main').get_attribute('data-view')=='scripts')
   else:check(f'scripts {w}x{h} retains desktop pages',page.locator('.scripts-screen .pagination').count()==1 and page.evaluate('document.scrollingElement.scrollHeight<=innerHeight+1'))
   nav(page,'talents');check(f'people {w}x{h} retains the fixed-height catalog',page.evaluate('document.documentElement.classList.contains("catalog-fit") && document.scrollingElement.scrollHeight<=innerHeight+1'))
   nav(page,'scripts');click(page,'pitch',':not([disabled])')
   while page.locator('[data-action="genre-toggle"].selected').count():click(page,'genre-toggle','.selected')
   for g in ['drama','comedy','romance']:click(page,'genre-toggle',f'[data-id="{g}"]')
   page.locator('.subgenre-grid').scroll_into_view_if_needed();wait(page)
   boxes=page.locator('.subgenre-grid select').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,right:r.right}})')
   check(f'genres {w}x{h} keeps three usable controls on one row',len(boxes)==3 and max(x['y'] for x in boxes)-min(x['y'] for x in boxes)<2 and all(x['x']>=0 and x['right']<=w+1 and x['w']>=60 for x in boxes),boxes)
   select=page.locator('.subgenre-grid select').first;value=select.locator('option').nth(1).get_attribute('value');select.select_option(value);wait(page)
   check(f'genres {w}x{h} selected subgenre survives rendering',page.locator('.subgenre-grid select').first.input_value()==value)
   if (w,h) in [(390,844),(568,320)]:page.locator('.subgenre-grid').scroll_into_view_if_needed();page.screenshot(path=str(out/f'genre-three-{w}x{h}.png'))
   click(page,'close')
  page.set_viewport_size({'width':390,'height':844});wait(page);nav(page,'scripts');click(page,'pitch',':not([disabled])');cash=money(page)
  for fmt in ['3d','imax']:
   page.locator(f'input[data-field="format-toggle"][value="{fmt}"]').check();wait(page)
  old=quote(page);click(page,'runtime-select','[data-id="180"]');new=quote(page)
  values=lambda xs:[float(x.replace('+','').replace('억','').replace(',','')) for x in xs]
  check('every technical quote increases for a longer runtime',all(n>o for o,n in zip(values(old),values(new))),{'old':old,'new':new})
  config=page.evaluate('''()=>({genres:[...document.querySelectorAll('[data-action="genre-toggle"].selected')].map(e=>e.dataset.id),scale:document.querySelector('[data-action="scale"].selected').dataset.id,runtime:Number(document.querySelector('[data-action="runtime-select"].selected').dataset.id),formats:[...document.querySelectorAll('[data-field="format-toggle"]:checked')].map(e=>e.value)})''')
  expected=page.evaluate('''async d=>{const C=await import(window.__fixtureModules['lasttake/cinema.js']),E=await import(window.__fixtureModules['lasttake/engine.js']);return C.formatCostBreakdown(d,C.formatProductionBase(d),C.FORMATS.map(f=>f.id)).map(r=>'+'+E.money(r.cost));}''',config)
  check('all displayed format quotes match the shared production estimator',new==expected,{'shown':new,'expected':expected})
  check('selecting technical formats and runtime spends no cash',money(page)==cash)
  page.locator('.format-section').scroll_into_view_if_needed();page.screenshot(path=str(out/'technical-quotes-mobile.png'))
  click(page,'close');nav(page,'studio');click(page,'home');check('save and home has the corrected heading',page.locator('h1').text_content()=='당신의 영화사가 시작되는 순간.')
  check('save and home preserves the current balance',money(page)==cash);click(page,'resume');check('resume returns to the studio',page.locator('#main').get_attribute('data-view')=='studio')
  check('all local portrait images hydrate without failures',page.evaluate('document.querySelectorAll("[data-face-ready=failed]").length===0'))
  check('no JavaScript runtime errors',not errors,errors);b.close()
except Exception:
 if page:
  try:page.screenshot(path=str(out/'v142-failure.png'))
  except Exception:pass
 traceback.print_exc();raise
finally:
 report={'version':'1.4.2','transport':'Actual dist modules/CSS via offline blob delivery, no game-logic patches','checks':checks,'pageErrors':errors,'viewportSizes':len(sizes)}
 (out/'mobile-v142-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(f'{sum(x["passed"] for x in checks)}/{len(checks)} checks passed',flush=True)
