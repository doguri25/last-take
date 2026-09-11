"""Real shipped modules via offline import maps, with deterministic saved fixtures."""
import json,sys,argparse,traceback,subprocess
from pathlib import Path
import browser_support as m
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,default=m.ROOT/'qa-output');args=ap.parse_args();OUT=args.output;OUT.mkdir(parents=True,exist_ok=True)
subprocess.run(['node',str(m.ROOT/'tests/studio-v13-fixtures.js'),str(OUT)],check=True)
meta=json.loads((OUT/'v13-meta.json').read_text());fid=meta['film'];pid=meta['person'];payload=m.fixture_payload();checks=[];errors=[]
def check(name,value=True):
 assert value,name
 checks.append(name);print('PASS',name,flush=True)
def state(page):return page.evaluate("JSON.parse(localStorage.getItem('last-take-game-v1'))")
def own(page):return next(f for f in state(page)['films'] if f['id']==fid)
def action(page,a,extra=''):
 selector=f'[data-action="{a}"]'+extra
 inside=page.locator('dialog[open] '+selector)
 return inside.first if inside.count() else page.locator(selector).first
def nav(page,key):
 sel=f'[data-action="nav"][data-view="{key}"]'
 for b in page.locator(sel).all():
  if b.is_visible():b.click();return
 action(page,'more').click();page.locator('dialog[open] '+sel).first.click()
def dismiss(page):
 for _ in range(20):
  b=page.locator('#notification-popups [data-action="dismiss-notification"]')
  if not b.count():break
  b.first.click()
def newpage(browser,fixture,w=1366,h=768):
 page=browser.new_page(viewport={'width':w,'height':h});page.set_default_timeout(4000);page.on('pageerror',lambda e:errors.append(str(e)));m.load(page,payload,json.loads((OUT/(fixture+'.json')).read_text()));return page
def fit(page):
 return page.evaluate('''()=>{const d=document.querySelector('dialog[open]');return document.documentElement.scrollWidth<=innerWidth+1&&(!d||d.scrollWidth<=d.clientWidth+1)}''')
def shot(page,name):page.screenshot(path=str(OUT/(name+'.png')))
try:
 with sync_playwright() as p:
  b=m.launch_browser(p)
  for w,h,label in [(1366,768,'desktop'),(390,844,'mobile')]:
   page=newpage(b,'v13-profile',w,h);nav(page,'portfolio');action(page,'film',f'[data-id="{fid}"]').click()
   check(label+' poster is in fixed movie header left of title',page.locator('.film-heading-poster').is_visible() and page.evaluate('''()=>{const a=document.querySelector('.film-heading-poster').getBoundingClientRect(),b=document.querySelector('.film-heading-copy').getBoundingClientRect();return a.right<=b.left&&a.y>=0&&a.bottom<innerHeight}'''))
   shot(page,'film-header-'+label);action(page,'person-peek',f'[data-id="{pid}"]').click();page.locator('#compat-query').fill('김');check(label+' person profile opens',page.locator('#dialog').get_attribute('data-modal')=='person')
   action(page,'film',f'[data-id="{fid}"]').click();check(label+' work history opens movie',page.locator('#dialog').get_attribute('data-modal')=='film');action(page,'feature-back').click();check(label+' Back from history returns to same person and retains query',meta['personName'] in page.locator('#dialog').inner_text() and page.locator('#compat-query').input_value()=='김')
   page.keyboard.press('Escape');check(label+' nested profile returns to originating film',page.locator('#dialog').get_attribute('data-modal')=='film');action(page,'film-tab','[data-id="history"]').click();check(label+' header poster remains on history tab',page.locator('.film-heading-poster').is_visible());check(label+' movie modal has no horizontal overflow',fit(page));page.close()

   page=newpage(b,'v13-edit',w,h);action(page,'studio-stat','[data-id="active"]').click();check(label+' active metric lists player production',meta['title'] in page.locator('#dialog').inner_text());action(page,'film-peek',f'[data-id="{fid}"]').click();action(page,'runtime-edit').click();check(label+' post-production editor opens',page.locator('#dialog').get_attribute('data-modal')=='runtime-edit');check(label+' four runtime choices',page.locator('[data-action="edit-target"]').count()==4)
   cash=state(page)['companies'][0]['cash'];action(page,'edit-target',f'[data-minutes="{meta["conflictTarget"]}"]').click();check(label+' edit preview shows no invalid numeric output','undefined' not in page.locator('#dialog').inner_text() and 'NaN' not in page.locator('#dialog').inner_text());action(page,'runtime-propose').click();check(label+' director conflict proposes without payment',own(page)['pendingEdit']['conflict'] and state(page)['companies'][0]['cash']==cash)
   shot(page,'director-editing-'+label);check(label+' conflict includes cancel, negotiate and override',page.locator('[data-action="runtime-resolve"]').count()==3);check(label+' editor fits horizontally',fit(page));action(page,'runtime-resolve','[data-mode="cancel"]').click();check(label+' cancel keeps runtime and funds',own(page)['runtime']==120 and state(page)['companies'][0]['cash']==cash)
   dismiss(page);action(page,'edit-target',f'[data-minutes="{meta["agreeTarget"]}"]').click();action(page,'runtime-propose').click();q=own(page)['pendingEdit'];check(label+' director agrees to alternate proposal',not q['conflict']);action(page,'runtime-resolve','[data-mode="agree"]').click();check(label+' confirmed edit applies cost once',own(page)['runtime']==q['to'] and round(cash-state(page)['companies'][0]['cash'],2)==q['cost']);check(label+' applied edit cannot be repeated',page.locator('[data-action="runtime-propose"]').count()==0);page.close()

   page=newpage(b,'v13-news',w,h);page.locator('.studio-inbox summary').click();action(page,'news-detail').click();check(label+' news opens detailed proposals',page.locator('.news-pitch').count()==6);check(label+' news detail fits viewport',fit(page));action(page,'news-plan').click();check(label+' news proposal links to production planning',page.locator('#dialog').get_attribute('data-modal')=='wizard');action(page,'runtime-select','[data-id="180"]').click();check(label+' planning selects 180 minutes',page.locator('[data-action="runtime-select"][data-id="180"]').get_attribute('aria-pressed')=='true');check(label+' planning shows fewer screenings','하루 3회' in page.locator('#dialog').inner_text());page.keyboard.press('Escape');nav(page,'scripts');action(page,'licenses').click();check(label+' original license catalog includes rich summaries',page.locator('.rights-card').count()==8 and '원작 정보' in page.locator('#dialog').inner_text());action(page,'rights-info').click();check(label+' source dossier includes author, story, cast and contract','주요 등장인물' in page.locator('#dialog').inner_text() and '라이선스 조건' in page.locator('#dialog').inner_text());shot(page,'source-dossier-'+label);check(label+' source dossier fits horizontally',fit(page));action(page,'license').click();check(label+' licensed planning retains original information button',page.locator('#dialog [data-action="rights-info"]').count()==1);action(page,'runtime-select','[data-id="150"]').click();action(page,'rights-info').click();action(page,'feature-back').click();check(label+' returning from source preserves runtime selection',page.locator('[data-action="runtime-select"][data-id="150"]').get_attribute('aria-pressed')=='true');page.close()

   page=newpage(b,'v13-retired',w,h);nav(page,'retired');check(label+' retirement menu has retired people',page.locator('.retired-grid .person-card').count()>0);page.locator('#retired-query').fill(meta['personName']);check(label+' retired name search finds archived career',page.locator('.retired-grid .person-card').count()==1);action(page,'person',f'[data-id="{pid}"]').click();check(label+' retired profile still has film history','작품 히스토리' in page.locator('#dialog').inner_text() and '은퇴' in page.locator('#dialog').inner_text());action(page,'film',f'[data-id="{fid}"]').click();action(page,'feature-back').click();check(label+' retired history Back restores person',meta['personName'] in page.locator('#dialog').inner_text() and page.locator('#dialog').get_attribute('data-modal')=='person');page.keyboard.press('Escape');check(label+' retired filter survives modal navigation',page.locator('#retired-query').input_value()==meta['personName']);check(label+' retirement grid fits viewport',fit(page));shot(page,'retired-'+label);page.close()

   page=newpage(b,'v13-tax',w,h);nav(page,'finance');check(label+' monthly metric includes tax','세금 포함' in page.locator('[data-action="finance-chart"][data-id="fixed"]').inner_text());action(page,'tax-details').click();check(label+' tax modal gives separate costs and progressive rates','법인지방소득세' in page.locator('#dialog').inner_text() and '2.2%' in page.locator('#dialog').inner_text());check(label+' tax modal labels game reserve not real monthly filing','실제 세법의 월 납부 제도가 아닙니다' in page.locator('#dialog').inner_text());check(label+' one monthly tax record','월별 적립 내역 · 1건' in page.locator('#dialog').inner_text());check(label+' tax modal fits viewport',fit(page));shot(page,'tax-detail-'+label);page.close()

   page=newpage(b,'v13-ready',w,h)
   for key,expected in [('ready',meta['title']),('audience','아직 해당하는 기록'),('trophies','작품상')]:
    action(page,'studio-stat',f'[data-id="{key}"]').click();check(label+' '+key+' KPI opens related details',expected in page.locator('#dialog').inner_text());action(page,'feature-back').click()
   page.close()
  check('No JavaScript errors in all v1.3 browser flows',not errors);b.close()
 result={'result':'PASS','checks':checks,'count':len(checks),'errors':errors}
except Exception as e:
 traceback.print_exc();result={'result':'FAIL','checks':checks,'count':len(checks),'errors':errors,'failure':str(e)}
finally:
 (OUT/'studio-v13-browser-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'result':result['result'],'checks':len(checks),'errors':errors},ensure_ascii=False),flush=True)
if result['result']!='PASS':sys.exit(1)
