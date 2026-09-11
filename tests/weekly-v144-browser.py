"""Regression check using the game's existing offline Chromium transport."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
import browser_support as support

parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'qa-output-v144')
output=parser.parse_args().output.resolve();output.mkdir(parents=True,exist_ok=True)
payload=support.fixture_payload();checks=[];errors=[]

def check(name,ok):
    assert ok,name
    checks.append(name)
    print('PASS',name,flush=True)

with sync_playwright() as p:
    browser=support.launch_browser(p)
    for width,height,motion in [(390,844,'no-preference'),(1366,768,'no-preference'),(844,390,'no-preference'),(390,844,'reduce')]:
        label=f'{width}x{height}-{motion}'
        page=browser.new_page(viewport={'width':width,'height':height},reduced_motion=motion)
        page.set_default_timeout(10000);page.on('pageerror',lambda error:errors.append(str(error)))
        support.load(page,payload)
        page.locator('#company-name').fill('게이지 제거 확인')
        page.locator('#found-form button[type=submit]').click()
        page.wait_for_selector('.shell')
        previous=page.evaluate("JSON.parse(localStorage.getItem('last-take-game-v1')).week")
        page.locator('[data-action="advance"]:visible').first.click()
        page.wait_for_selector('#week-transition:not([hidden])')
        snapshot=page.evaluate('''() => {
          const overlay=document.getElementById('week-transition');
          return {visible:!overlay.hidden,bar:overlay.querySelectorAll('.week-progress,[role="progressbar"]').length,
             animationCount:overlay.getAnimations({subtree:true}).length,
             bounds:JSON.parse(JSON.stringify(overlay.querySelector('.week-change-card').getBoundingClientRect())), viewportWidth:innerWidth,
             oldDate:overlay.querySelector('.week-change-card>p')?.textContent,
             newDate:overlay.querySelector('.week-change-card>strong')?.textContent,
             notice:overlay.querySelector('.week-change-card>small')?.textContent,
             busy:document.documentElement.getAttribute('aria-busy'),
             locked:[...document.querySelectorAll('[data-action="advance"]')].every(b=>b.disabled)};
        }''')
        check(label+' / transition visible with no gauge or animation',snapshot['visible'] and snapshot['bar']==0 and snapshot['animationCount']==0)
        check(label+' / dates and notice retained',bool(snapshot['oldDate']) and bool(snapshot['newDate']) and snapshot['oldDate']!=snapshot['newDate'] and '한 주씩' in snapshot['notice'])
        check(label+' / popup fits viewport width',snapshot['bounds']['left']>=0 and snapshot['bounds']['right']<=snapshot['viewportWidth'])
        check(label+' / duplicate advance locked',snapshot['busy']=='true' and snapshot['locked'])
        page.evaluate("document.querySelectorAll('[data-action=advance]').forEach(b=>{b.click();b.click()})")
        if motion=='no-preference' and (width,height) in [(390,844),(1366,768)]:
            page.screenshot(path=str(output/f'week-transition-{width}x{height}.png'))
        page.wait_for_function("document.getElementById('week-transition').hidden && !document.documentElement.hasAttribute('aria-busy')")
        current=page.evaluate("JSON.parse(localStorage.getItem('last-take-game-v1')).week")
        check(label+' / exactly one week saved',current==previous+1)
        check(label+' / controls restored',page.locator('[data-action="advance"]:visible').first.is_enabled())
        page.close()
    browser.close()
check('no JavaScript errors',not errors)
report={'version':'1.4.4','checks':checks,'passed':len(checks),'failed':0,'errors':errors,
        'transport':'existing offline blob import harness; actual game logic and CSS; simulated localStorage',
        'realMobileDevicesTested':False,'deployedAddressTested':False}
(output/'weekly-v144-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('TOTAL',len(checks),'PASSED',flush=True)
