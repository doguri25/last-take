import sys,importlib.util,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
import browser_support as m
OUT=m.artifact_dir();payload=m.fixture_payload();checks=[];errors=[]
def state(page):return page.evaluate("JSON.parse(localStorage.getItem('last-take-game-v1'))")
def action(page,name,extra=''):return page.locator(f'[data-action="{name}"]'+extra).first

def newpage(b,fixture=None,w=1366,h=768):
 page=b.new_page(viewport={'width':w,'height':h});page.set_default_timeout(6000);page.on('pageerror',lambda e:errors.append(str(e)))
 saved=json.loads((OUT/fixture).read_text()) if fixture else None;m.load(page,payload,saved);return page

def shot(page,name):page.screenshot(path=str(OUT/(name+'.png')))
def check(name,expr=True):assert expr,name;checks.append(name);print('PASS',name,flush=True)

with sync_playwright() as p:
 b=m.launch_browser(p)
 page=newpage(b,'fixture-fresh.json');meta=json.loads((OUT/'fixture-meta.json').read_text());initial=state(page)
 action(page,'home').click();page.wait_for_selector('.resume-card');check('home preserves saved studio',state(page)['companies'][0]['cash']==150)
 shot(page,'home-resume');action(page,'resume').click();page.wait_for_selector('.shell');check('resume returns to studio')
 action(page,'sound').click();check('sound off preference persists',page.evaluate("localStorage.getItem('last-take-sound')")=='off');action(page,'sound').click();check('sound on preference persists',page.evaluate("localStorage.getItem('last-take-sound')")=='on')
 action(page,'fullscreen').click();page.wait_for_timeout(350);check('fullscreen activates or provides explicit focus fallback',page.evaluate("!!document.fullscreenElement||document.documentElement.classList.contains('focus-mode')"));action(page,'fullscreen').click();page.wait_for_timeout(200)
 action(page,'nav','[data-view="scripts"]').click();action(page,'pitch',f'[data-id="{meta["pitch"]}"]').click();page.wait_for_selector('dialog[open]');
 action(page,'genre-toggle',f'[data-id="{meta["genre"]}"]').click();check('clicking original genre deselects',page.locator('.genre-option.selected').count()==0)
 action(page,'wizard-next').click();check('empty genre is blocked with visible dialog feedback',page.locator('.dialog-feedback').is_visible());
 action(page,'genre-toggle',f'[data-id="{meta["genre"]}"]').click();action(page,'scale','[data-id="small"]').click();shot(page,'planning-desktop')
 action(page,'wizard-next').click();action(page,'recommend').click();shot(page,'casting-desktop');action(page,'wizard-next').click();action(page,'greenlight').click();page.wait_for_selector('.negotiation-list');shot(page,'negotiation-desktop');check('final casting negotiation modal appears before any debit',state(page)['companies'][0]['cash']==150)
 action(page,'accept-negotiation').click();action(page,'greenlight').click();page.wait_for_selector('.film-card');saved=state(page);own=[f for f in saved['films'] if f['company']=='c0'];check('accepted casting conditions are saved and production starts',len(own)==1 and own[0]['negotiations'])
 shot(page,'studio-production-desktop')
 old=saved['week'];start=time.monotonic();action(page,'advance').click();page.wait_for_selector('#week-transition:not([hidden])');shot(page,'week-transition');
 # Repeated synthetic clicks while locked must not mutate time again.
 page.evaluate("document.querySelector('[data-action=advance]').click();document.querySelector('[data-action=advance]').click()")
 page.wait_for_selector('#week-transition[hidden]',state='attached');check('weekly transition is perceptible and repeated clicks advance once',state(page)['week']==old+1 and time.monotonic()-start>=.7)
 action(page,'nav','[data-view="scripts"]').click();cash=state(page)['companies'][0]['cash'];action(page,'refresh-pitches').click();action(page,'refresh-confirmed').click();check('paid script reload works in actual UI',state(page)['companies'][0]['cash']==round(cash-.5,2));page.close()

 page=newpage(b,'fixture-week-17.json');action(page,'advance').click();page.wait_for_selector('#week-transition[hidden]',state='attached');page.wait_for_selector('.push-card');shot(page,'promotion-available-desktop');check('promotion availability creates bottom-right popup', '홍보' in page.locator('.push-card').inner_text())
 action(page,'notification-open').click();page.wait_for_selector('.agency-options');check('promotional agency screen shows six candidates',page.locator('.agency-option').count()==6);check('promotion start disabled without agency',action(page,'start-promotion').is_disabled())
 page.locator('.agency-option').nth(0).click();first=page.locator('.agency-option.selected').get_attribute('data-id');page.locator('.agency-option').nth(1).click();second=page.locator('.agency-option.selected').get_attribute('data-id');check('only one agency remains selected',page.locator('.agency-option.selected').count()==1 and first!=second);shot(page,'marketing-desktop');
 cash=state(page)['companies'][0]['cash'];action(page,'start-promotion').click();saved=state(page);film=next(f for f in saved['films'] if f['company']=='c0');check('campaign starts and charges once',film['activePromotion']['agency']==second and saved['companies'][0]['cash']<cash);check('start result arrives in bottom-right popup',page.locator('.push-card').count()>0)
 action(page,'advance').click();page.wait_for_selector('#week-transition[hidden]',state='attached');page.wait_for_selector('.push-card');shot(page,'marketing-result-desktop');saved=state(page);film=next(f for f in saved['films'] if f['company']=='c0');check('campaign completes next week with result popup',film['activePromotion'] is None and len(film['promotions'])==1 and '홍보 결과' in page.locator('#notification-popups').inner_text());page.close()

 page=newpage(b,'fixture-week-23.json');action(page,'advance').click();page.wait_for_selector('dialog[data-modal="completion"][open]');check('production completion automatically opens poster modal',page.locator('.poster-option').count()==6);shot(page,'completion-desktop');
 if not action(page,'poster-preview','[data-index="9"]').count():action(page,'poster-page','[data-delta="1"]').click()
 action(page,'poster-preview','[data-index="9"]').click();action(page,'completion-done').click();saved=state(page);film=next(f for f in saved['films'] if f['company']=='c0');check('chosen poster and completion acknowledgement persist',film['poster']==9 and film['completionAcknowledged']);check('completion modal closes after acknowledgement',not page.locator('dialog').is_visible());
 action(page,'film',f'[data-id="{film["id"]}"]').click();page.wait_for_selector('.film-overview');shot(page,'film-detail-desktop');action(page,'release').click();page.wait_for_selector('dialog',state='hidden');action(page,'advance').click();page.wait_for_selector('#week-transition[hidden]',state='attached');page.wait_for_selector('.push-card.boxoffice');shot(page,'boxoffice-popup-desktop');check('box office report includes title and poster',page.locator('.push-card.boxoffice .movie-poster').count()>0 and film['title'] in page.locator('.push-card.boxoffice').inner_text());
 action(page,'nav','[data-view="market"]').click();page.wait_for_selector('.boxoffice-row');shot(page,'boxoffice-desktop');check('box office list displays posters with film names',page.locator('.boxoffice-row .movie-poster').count()==page.locator('.boxoffice-row').count());
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(350);shot(page,'boxoffice-mobile');check('mobile box office has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.close()
 check('no browser JavaScript errors',not errors);b.close()
(OUT/'browser-flow-report.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
print('ALL',len(checks),'PASSED')
