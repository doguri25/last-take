"""Actual dist modules via offline blob loader. The labeled memory IndexedDB
adapter verifies UI transactions, not real disk persistence or cross-device sharing."""
import json, subprocess, traceback, argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,fixture_payload,load,launch_browser
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'qa-output-v15');args=parser.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
subprocess.run(['node',str(ROOT/'tests/studio-v15-fixtures.js'),str(out)],check=True)
payload=fixture_payload();meta=json.loads((out/'v15-meta.json').read_text());checks=[];errors=[];page=None
memory=(ROOT/'tests/vault-memory-double.js').read_text().replace('export function','function')+'\nwindow.__vaultTest=installMemoryIndexedDB(window);'
def check(label,value,detail=None):
 checks.append({'check':label,'passed':bool(value),'detail':detail});print(('PASS ' if value else 'FAIL ')+label,flush=True)
 if not value:raise AssertionError(f'{label} {detail}')
def wait(ms=180):page.wait_for_timeout(ms)
def state():return json.loads(page.evaluate('localStorage.getItem("last-take-game-v1")'))
def modal():return page.locator('#dialog').get_attribute('data-modal') if page.locator('#dialog').evaluate('(d)=>d.open') else None
def click(action,extra=''):
 if not modal():
  for _ in range(4):
   dismiss=page.locator('#notification-popups .push-close').filter(visible=True)
   if dismiss.count()==0:break
   dismiss.first.click();wait(100)
 scope=page.locator('#dialog') if modal() else page
 scope.locator(f'[data-action="{action}"]{extra}').filter(visible=True).first.click();wait()
def close():page.locator('#dialog > .dialog-header [data-action="close"]').click();wait()
def confirm():click('growth-confirm');wait(180)
def desk():
 for _ in range(8):
  if not modal():break
  close()
 check('nested dialogs return to game without leaving home',modal() is None and page.locator('#main').count()>0)
def shot(name):page.screenshot(path=str(out/(name+'.png')))
def fixture(browser,name='base',w=390,h=844,storage=True):
 global page
 page=browser.new_page(viewport={'width':w,'height':h},has_touch=w<1000)
 page.set_default_timeout(7000);page.on('pageerror',lambda e:errors.append(str(e)))
 if storage:page.evaluate(memory)
 load(page,payload,json.loads((out/f'v15-{name}.json').read_text()));wait()
 return page
try:
 with sync_playwright() as pw:
  browser=launch_browser(pw)
  # Favorites, reusable team, draft archive, investor preview.
  fixture(browser)
  check('saved game starts on studio with no automatic wizard',modal() is None and page.locator('#main').get_attribute('data-view')=='studio')
  click('nav','[data-view="talents"]');check('favorite pins coexist with person cards',page.locator('.growth-favorite-pin').count()>0)
  pid=page.locator('.growth-favorite-pin').first.get_attribute('data-id');before=state()['studioGrowth']['favorites'];click('growth-favorite',f'[data-id="{pid}"]')
  check('favorite touch toggles only the selected ID',((pid in state()['studioGrowth']['favorites'])!=(pid in before)))
  click('growth-favorites');check('favorites use the existing modal',modal()=='growth-favorites')
  click('person-peek');check('favorite profile opens',modal()=='person');close();check('profile X returns to favorites',modal()=='growth-favorites');close()
  click('nav','[data-view="studio"]');click('growth-teams');check('saved team shows seven profile links',page.locator('.growth-team-members [data-action="person-peek"]').count()==7)
  money=state()['companies'][0]['cash'];click('growth-team-load');check('load team returns to casting wizard',modal()=='wizard');check('team load has no fee',state()['companies'][0]['cash']==money)
  click('growth-draft-save');check('manual draft and automatic draft are separate',len(state()['studioGrowth']['drafts'])==2)
  click('growth-investment');check('three investment offers shown',page.locator('[data-action="growth-investor-select"][data-id]').count()==4)
  click('growth-investor-select','[data-id="seed"]');check('selecting financing does not debit or lend money',state()['companies'][0]['cash']==money and state()['companies'][0]['debt']==0)
  shot('investment-mobile');close();check('investor back returns to wizard',modal()=='wizard');close();check('wizard close returns to prior game screen, not home',modal() in (None,'growth-teams') and page.locator('#main').get_attribute('data-view')=='studio');
  if modal():close()
  click('growth-drafts');click('growth-draft-load','[data-id="auto-draft"]');check('draft load asks before replacing',modal()=='growth-confirm');close();check('cancel stays in archive',modal()=='growth-drafts');click('growth-draft-load','[data-id="auto-draft"]');confirm();check('draft confirmed restores wizard',modal()=='wizard');desk()
  # Facilities quote, cancel, signed debit, duplicate availability.
  click('growth-facilities');click('growth-facility','[data-id="editing"][data-mode="lease"]');check('facility quote is non-mutating',state()['companies'][0]['cash']==money);close();check('facility cancel restores facility menu',modal()=='growth-facilities')
  click('growth-facility','[data-id="editing"][data-mode="lease"]');confirm();check('lease charges setup exactly once',state()['companies'][0]['cash']==round(money-.4,2));check('lease recorded',state()['studioGrowth']['facilities']['editing']['mode']=='lease');shot('facilities-mobile');close()
  # Real app save manager using declared memory API double.
  click('more');click('growth-storage');check('save manager opened from More',modal()=='growth-storage');click('growth-slot-save','[data-id="manual-1"]');confirm();wait(300);check('manual slot committed through transaction adapter','manual-1' in page.evaluate('[...__vaultTest.rows.keys()]'))
  storedCash=page.evaluate('__vaultTest.rows.get("manual-1").cash');check('manual snapshot captures current balance',storedCash==state()['companies'][0]['cash'])
  page.evaluate('__vaultTest.failNextWrite=true');click('growth-slot-save','[data-id="manual-1"]');confirm();check('aborted storage transaction reports failure',page.locator('.toast').filter(has_text='저장하지 못했습니다').count()>0);check('aborted write preserves old slot',page.evaluate('__vaultTest.rows.get("manual-1").cash')==storedCash);close()
  with page.expect_download() as event:click('growth-export')
  path=out/'exported-save.json';event.value.save_as(path);envelope=json.loads(path.read_text());check('JSON download contains versioned checksum and game',envelope['format']=='LASTTAKE-SAVE' and bool(envelope['checksum']) and envelope['appVersion']=='1.5.0')
  snapshot=json.dumps(state(),sort_keys=True)
  with page.expect_file_chooser() as event:click('growth-import')
  event.value.set_files({'name':'bad.json','mimeType':'application/json','buffer':b'{broken'});wait(400);check('corrupt file leaves current state unchanged',json.dumps(state(),sort_keys=True)==snapshot)
  with page.expect_file_chooser() as event:click('growth-import')
  event.value.set_files(str(path));wait(400);check('valid import opens confirmation not immediate replacement',modal()=='growth-confirm');close();check('cancel import returns to storage',modal()=='growth-storage');check('cancel import leaves game unchanged',json.dumps(state(),sort_keys=True)==snapshot)
  click('growth-slot-load','[data-id="manual-1"]');wait(300);confirm();wait(300);check('restoring slot always opens dashboard',modal() is None and page.locator('#main').get_attribute('data-view')=='studio');check('old game gets safety backup before replacement',page.evaluate('__vaultTest.rows.has("safety")'));shot('studio-mobile');page.close()
  # Screening feedback and follow-up confirmation.
  fixture(browser,'feedback');click('film',f'[data-id="{meta["film"]}"]');click('growth-screening');check('screening provides three cohort scores',page.locator('.growth-review-head').count()==3);shot('screening-mobile')
  cash=state()['companies'][0]['cash'];click('growth-screening-decide','[data-choice="recut"]');check('screening choice preview does not debit',state()['companies'][0]['cash']==cash);close();check('cancel screening action retains pending choice',next(f for f in state()['films'] if f['id']==meta['film'])['screening']['status']=='decision')
  click('growth-screening-decide','[data-choice="keep"]');confirm();f=next(f for f in state()['films'] if f['id']==meta['film']);check('keep original completed without fee',f['screening']['status']=='done' and state()['companies'][0]['cash']==cash);close();check('screening back returns to movie',modal()=='film');page.close()
  # New screenings still charge only after confirm.
  fixture(browser,'ready');click('film',f'[data-id="{meta["film"]}"]');click('growth-screening');cash=state()['companies'][0]['cash'];click('growth-screening-start');close();check('cancel new screening spends nothing',state()['companies'][0]['cash']==cash);click('growth-screening-start');confirm();f=next(f for f in state()['films'] if f['id']==meta['film']);check('screening start charges .35 once',state()['companies'][0]['cash']==round(cash-.35,2) and f['screening']['status']=='running');page.close()
  # Foreign contracts, producer net and separate reporting.
  fixture(browser,'ready');click('film',f'[data-id="{meta["film"]}"]');click('growth-foreign');check('five independent territory cards',page.locator('[data-action="growth-foreign-sign"][data-mode="fixed"]').count()==5);cash=state()['companies'][0]['cash'];click('growth-foreign-sign','[data-territory="east"][data-mode="fixed"]');check('foreign quote spends nothing',state()['companies'][0]['cash']==cash);close();click('growth-foreign-sign','[data-territory="east"][data-mode="fixed"]');confirm();f=next(f for f in state()['films'] if f['id']==meta['film']);check('signed regional buyout records exactly one deal',len(f['foreignDeals'])==1);check('foreign amount does not inflate domestic admission',f['audience']==0 and f['gross']==0 and f['runs']==[]);check('region can no longer be sold again',page.locator('[data-action="growth-foreign-sign"][data-territory="east"]').count()==0);shot('foreign-offers-mobile');page.close()
  fixture(browser,'overseas');click('nav','[data-view="market"]');click('growth-foreign-report');check('overseas results chart and ledger exist',page.locator('.growth-chart').count()==1 and page.locator('.growth-ledger article').count()==3);shot('foreign-results-mobile');page.close()
  # Series types from an actually publicly released movie.
  fixture(browser,'released');click('more');click('nav','[data-view="portfolio"]');click('growth-series');click('growth-series',f'[data-id="{meta["film"]}"]');check('four franchise options shown',page.locator('[data-action="growth-series-pitch"]').count()==4);shot('series-mobile');cash=state()['companies'][0]['cash'];click('growth-series-pitch','[data-series="spinoff"]');confirm();check('confirmed spinoff opens planning rather than debiting',modal()=='wizard' and state()['companies'][0]['cash']==cash);check('new script stores parent and series type',any(p.get('seriesPlan',{}).get('type')=='spinoff' for p in state()['pitches']));page.close()
  # Festival window, fee and premiere withdrawal.
  fixture(browser,'festival');click('film',f'[data-id="{meta["film"]}"]');click('growth-festivals');check('festival menu presents all four programs',page.locator('[data-action="growth-festival-submit"]').count()==4);cash=state()['companies'][0]['cash'];click('growth-festival-submit','[data-festival="spring"]');close();check('cancel festival entry costs nothing',state()['companies'][0]['cash']==cash);click('growth-festival-submit','[data-festival="spring"]');confirm();check('festival submission fee charged once',state()['companies'][0]['cash']==round(cash-.25,2));shot('festival-mobile');click('growth-festival-withdraw');confirm();f=next(f for f in state()['films'] if f['id']==meta['film']);check('withdrawal releases premiere without refund',f['festivalEntries'][0]['status']=='withdrawn' and state()['companies'][0]['cash']==round(cash-.25,2));page.close()
  # Responsive modal sizing for all major newly added UI panels.
  for w,h in [(360,640),(390,844),(568,320),(844,390),(768,1024),(1366,768)]:
   fixture(browser,'ready',w,h);click('growth-facilities')
   rect=page.locator('#dialog').bounding_box();check(f'{w}x{h}: facilities dialog within viewport',rect['x']>=-1 and rect['x']+rect['width']<=w+1 and rect['y']>=-1 and rect['y']+rect['height']<=h+1,rect)
   footer=page.locator('#dialog > .dialog-footer').bounding_box();check(f'{w}x{h}: bottom modal action is reachable',footer is not None and footer['y']+footer['height']<=h+1)
   check(f'{w}x{h}: no document horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   if w==1366:shot('facilities-desktop')
   close();click('film',f'[data-id="{meta["film"]}"]');click('growth-foreign');check(f'{w}x{h}: foreign quote scroll stays inside dialog',page.locator('#dialog > .dialog-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'));close();check(f'{w}x{h}: detail back works without clone error',modal()=='film');page.close()
  check('no uncaught JavaScript errors in new feature flows',len(errors)==0,errors)
  browser.close()
except Exception as e:
 errors.append('TEST FAILURE: '+str(e));traceback.print_exc()
 if page:
  try:page.screenshot(path=str(out/'v15-failure.png'));(out/'v15-failure.txt').write_text(page.locator('body').inner_text())
  except:pass
finally:
 (out/'browser-v15-report.json').write_text(json.dumps({'checks':checks,'errors':errors,'storage':'Explicit memory IndexedDB API adapter; native disk persistence not tested','environment':'offline Chromium, actual dist JS/CSS via blob URLs'},ensure_ascii=False,indent=2))
if errors:raise SystemExit(1)
