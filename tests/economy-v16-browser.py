"""Offline Chromium with actual modules; localStorage uses the existing in-memory transport.
Real-origin localhost navigation is blocked by the managed browser. JSON restoration is tested, not disk persistence.
"""
import json, subprocess, argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT, launch_browser
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'qa-output-v16');out=p.parse_args().output.resolve();out.mkdir(parents=True,exist_ok=True)
subprocess.run(['node',str(ROOT/'tests/economy-v16-fixtures.js'),str(out)],check=True)
from browser_support import fixture_payload, load
payload=fixture_payload()
checks=[];errors=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(f'{name}: {detail}')
agent='agent-browser unavailable; localhost navigation blocked by managed Chromium; offline Playwright transport used'
try:
 with sync_playwright() as pw:
  browser=launch_browser(pw)
  # Each setting starts from a clean memory store; the actual game modules are loaded.
  for value,capital in [('very-easy',220),('easy',180),('normal',150),('hard',125),('very-hard',100)]:
   context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   load(page,payload);page.wait_for_selector('#difficulty')
   check(f'{value}: initial default is normal',page.locator('#difficulty').input_value()=='normal')
   before=page.locator('#difficulty').element_handle()
   page.select_option('#difficulty',value);check(f'{value}: selector DOM retained',before.evaluate('(e)=>e===document.getElementById("difficulty")'))
   check(f'{value}: capital preview',{str(capital)+'억 원'}=={page.locator('#difficulty-capital').inner_text()})
   if value=='normal':page.screenshot(path=str(out/'start-390x844.png'))
   page.locator('#company-name').fill('난이도 '+value);page.locator('#found-form button[type=submit]').click();page.wait_for_selector('.content[data-view=studio]')
   saved=page.evaluate('JSON.parse(localStorage.getItem("last-take-game-v1"))')
   check(f'{value}: founding selection saved',saved['difficulty']==value and saved['companies'][0]['cash']==capital)
   # Reconstruct from exported JSON in a new page; this is not a disk-persistence test.
   page.close();page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));load(page,payload,saved)
   check(f'{value}: JSON restoration preserves difficulty/cash',saved['difficulty']==value and saved['companies'][0]['cash']==capital)
   page.locator('.mobile-nav [data-action=more]').click();page.wait_for_selector('[data-modal=more]');page.locator('#dialog [data-action=home]').click();page.wait_for_selector('.resume-card');check(f'{value}: resume card displays difficulty',page.locator('.resume-card').inner_text().find({'very-easy':'매우 쉬움','easy':'쉬움','normal':'보통','hard':'어려움','very-hard':'매우 어려움'}[value])>=0)
   page.locator('[data-action=resume]').click();page.wait_for_selector('.content[data-view=studio]')
   check(f'{value}: resumes dashboard without dialog',not page.locator('#dialog').evaluate('(e)=>e.open'))
   context.close()
  # Geometry at common portrait, landscape, desktop dimensions.
  context=browser.new_context();page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  for w,h in [(320,568),(390,844),(430,932),(568,320),(844,390),(1366,768)]:
   page.set_viewport_size({'width':w,'height':h});page.close();page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_viewport_size({'width':w,'height':h});load(page,payload);page.wait_for_timeout(160)
   dims=page.evaluate('({scroll:document.scrollingElement.scrollHeight,view:innerHeight,width:document.scrollingElement.scrollWidth,vw:innerWidth,button:document.querySelector("#found-form button[type=submit]").getBoundingClientRect().bottom})')
   check(f'start {w}x{h}: fits screen with new selector',dims['scroll']<=dims['view']+1 and dims['width']<=dims['vw']+1 and dims['button']<=h+1,dims)
  page.close();page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_viewport_size({'width':390,'height':844});fixture=json.loads((out/'v16-film.json').read_text());meta=json.loads((out/'v16-film-meta.json').read_text())
  load(page,payload,fixture)
  page.locator('.mobile-nav [data-view=market]').click();page.wait_for_selector('.content[data-view=market]');page.locator('[data-action=film][data-id="'+meta['id']+'"]:visible').first.click();page.wait_for_selector('#dialog[open]');check('movie has settlement button',page.locator('#dialog [data-action=economy-details]').count()==1)
  page.locator('#dialog [data-action=economy-details]').click();page.wait_for_selector('[data-modal=economy-details]');text=page.locator('#dialog').inner_text();check('cinema deductions and cost recovery shown','극장 배분' in text and '투자 원금 회수' in text and '배급수수료' in text)
  page.screenshot(path=str(out/'settlement-390x844.png'));page.locator('#dialog [data-action=close],#dialog [data-action=feature-back]').last.click();page.wait_for_timeout(250);check('settlement back returns to movie',page.locator('#dialog').get_attribute('data-modal')=='film')
  page.locator('#dialog [data-action=close],#dialog [data-action=feature-back]').last.click();page.wait_for_timeout(250)
  if page.locator('#dialog').evaluate('(e)=>e.open'):page.locator('#dialog [data-action=close],#dialog [data-action=feature-back]').last.click();page.wait_for_timeout(250)
  # Navigate through the visible mobile More menu.
  page.locator('.mobile-nav [data-action=more]').click();page.wait_for_selector('[data-modal=more]');page.locator('#dialog [data-action=nav][data-view=finance]').click();page.wait_for_selector('.content[data-view=finance]')
  check('finance shows current difficulty and model shortcut','보통' in page.locator('.economy-toolbar').inner_text());page.locator('.economy-toolbar [data-action=economy-details]').click();page.wait_for_selector('[data-modal=economy-details]');check('all five levels documented',page.locator('.economy-difficulty-list>div').count()==5);page.screenshot(path=str(out/'model-390x844.png'))
  page.locator('#dialog [data-action=close],#dialog [data-action=feature-back]').last.click();page.wait_for_timeout(250);check('model back returns to finance',page.locator('.content').get_attribute('data-view')=='finance' and not page.locator('#dialog').evaluate('(e)=>e.open'))
  page.screenshot(path=str(out/'finance-390x844.png'))
  context.close();browser.close()
 check('no uncaught JavaScript errors',len(errors)==0,errors)
finally:
 (out/'browser-results.json').write_text(json.dumps({'transport':'offline modules; simulated localStorage and JSON restore; no disk durability claim','agentBrowser':agent,'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
