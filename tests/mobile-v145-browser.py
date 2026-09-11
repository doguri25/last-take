"""v1.4.5 focused browser checks on actual app modules/styles; no UI logic mocks.
Uses the existing offline Chromium loader. Run with --output <directory>.
"""
import argparse,copy,json,subprocess,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import fixture_payload,load,launch_browser,ROOT
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'qa-output');out=parser.parse_args().output.resolve();out.mkdir(parents=True,exist_ok=True)
if not (out/'v12-market.json').exists():subprocess.run(['node',str(ROOT/'tests/studio-v12-fixtures.js'),str(out)],check=True)
market=json.loads((out/'v12-market.json').read_text());ott=json.loads((out/'v12-ott.json').read_text());ready=json.loads((out/'v12-ready.json').read_text());meta=json.loads((out/'v12-meta.json').read_text())
if not (out/'fresh.json').exists():
 subprocess.run(['node','--input-type=module','-e',"import * as E from './dist/engine.js';import fs from 'node:fs';fs.writeFileSync(process.argv[1],JSON.stringify(E.createGame('수정 확인 영화사',270)))",str(out/'fresh.json')],cwd=ROOT,check=True)
fresh=json.loads((out/'fresh.json').read_text());payload=fixture_payload();checks=[];errors=[];page=None

def check(label,ok,detail=None):
 checks.append({'check':label,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+label,flush=True)
 if not ok:raise AssertionError(f'{label}: {detail}')
def wait(p):p.wait_for_timeout(220)
def act(p,a,extra=''):return p.locator(f'[data-action="{a}"]{extra}').filter(visible=True).first
def click(p,a,extra=''):act(p,a,extra).click();wait(p)
def close(p):p.locator('#dialog > .dialog-header [data-action="close"]').click();wait(p)
def nav(p,v):click(p,'nav',f'[data-view="{v}"]')
def modal(p):return p.locator('#dialog').get_attribute('data-modal') if p.locator('#dialog[open]').count() else None
def view(p):return p.locator('#main').get_attribute('data-view')
def saved(p):return json.loads(p.evaluate('localStorage.getItem("last-take-game-v1")'))
def unread(s):return sum(bool(n['unread']) for n in s['notifications'])
def notice(p,n):return p.locator(f'[data-notification-id="{n}"]')
def newpage(browser,data,size=(390,844)):
 p=browser.new_page(viewport={'width':size[0],'height':size[1]},has_touch=True);p.set_default_timeout(8000);p.on('pageerror',lambda e:errors.append(str(e)));load(p,payload,data);return p

def review_layout(p):return p.locator('.review-card').evaluate_all('''cards=>cards.map(card=>{
 const header=card.querySelector('header'),name=card.querySelector('.reviewer-name'),identity=card.querySelector('.reviewer-identity'),score=header.querySelector('b');
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.left,right:r.right,width:r.width,height:r.height}};
 const text=name.firstChild,person=text.textContent.split(' · ').at(-1),r=document.createRange();r.setStart(text,text.textContent.length-person.length);r.setEnd(text,text.textContent.length);
 return {name:name.textContent,card:box(card),header:box(header),identity:box(identity),score:box(score),nameLines:[...new Set([...r.getClientRects()].map(b=>Math.round(b.top)))].length,clipped:name.scrollWidth>name.clientWidth+1,display:getComputedStyle(card).display};
})''')
try:
 with sync_playwright() as pw:
  browser=launch_browser(pw)
  page=newpage(browser,market)
  nav(page,'market');click(page,'critic-reviews')
  for w,h in [(320,568),(360,640),(390,844),(568,320),(844,390),(1366,768)]:
   page.set_viewport_size({'width':w,'height':h});wait(page);rows=review_layout(page)
   check(f'critic names remain horizontal and scores do not overlap at {w}x{h}',all(r['nameLines']==1 and not r['clipped'] and r['identity']['right']<=r['score']['x']+1 and r['header']['width']>170 for r in rows),rows)
   check(f'critic dialog has no horizontal overflow at {w}x{h}',page.locator('#dialog .dialog-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
  page.set_viewport_size({'width':390,'height':844});wait(page);page.screenshot(path=str(out/'critic-reviews-mobile.png'))
  click(page,'review-page','[data-delta="1"]');check('remaining critic names remain horizontal',all(r['nameLines']==1 and not r['clipped'] for r in review_layout(page)))
  close(page);check('closing critic details returns to boxoffice',modal(page) is None and view(page)=='market')
  click(page,'audience-reviews')
  for w,h in [(320,568),(390,844),(568,320),(1366,768)]:
   page.set_viewport_size({'width':w,'height':h});wait(page);rows=review_layout(page)
   check(f'audience names and scores fit at {w}x{h}',all(r['nameLines']==1 and not r['clipped'] and r['identity']['right']<=r['score']['x']+1 for r in rows),rows)
  page.set_viewport_size({'width':390,'height':844});wait(page);page.screenshot(path=str(out/'audience-reviews-mobile.png'))
  for _ in range(2):
   click(page,'review-page','[data-delta="1"]');check('remaining audience page names fit',all(r['nameLines']==1 and not r['clipped'] for r in review_layout(page)))
  page.close()
  # The same layout serves OTT viewer names, including secondary review pages.
  page=newpage(browser,ott);nav(page,'studio');click(page,'more');click(page,'nav','[data-view="ott"]');click(page,'audience-reviews')
  check('OTT viewer names remain horizontal',all(r['nameLines']==1 and not r['clipped'] for r in review_layout(page)))
  page.close()
  # Reading an inbox item is not an implicit click-through or automatic read-all.
  data=copy.deepcopy(market);person=next(f for f in data['films'] if f['id']==meta['filmId'])['leads'][0]
  data['notifications']=[{'id':1000+i,'key':f'qa:{i}','week':data['week'],'type':'info','title':f'제작 소식 {i+1}','text':'작품의 제작 상황을 확인했습니다. 제목이나 이 본문을 터치하면 읽음으로 표시합니다.','filmId':None,'action':None,'unread':True,'popup':False} for i in range(16)]
  data['notificationCounter']=1016;data['notifications'][1].update(filmId=meta['filmId'],action='film');data['notifications'][2].update(personId=person,action='person')
  page=newpage(browser,data);initial=saved(page);click(page,'notifications');count=unread(initial)
  check('opening the inbox does not mark unseen messages as read',unread(saved(page))==count)
  notice(page,1000).locator('.notification-text').tap();wait(page)
  state=saved(page);check('tapping message text marks only that message read and remains in inbox',modal(page)=='notifications' and not state['notifications'][0]['unread'] and unread(state)==count-1)
  check('row read label and header badge update immediately',notice(page,1000).locator('.notification-read-state').inner_text()=='읽음' and 'unread' not in (notice(page,1000).get_attribute('class') or '') and page.locator('.notification-control').get_attribute('aria-label')==f'알림함 {count-1}개')
  check('read message and destination data are retained',len(state['notifications'])==len(initial['notifications']) and state['notifications'][0]['text']==initial['notifications'][0]['text'])
  notice(page,1000).locator('.notification-title').tap();wait(page);check('repeated taps never remove or recount a message',unread(saved(page))==count-1)
  # Reading deep in the list must not move the scroll or replace the focused row.
  notice(page,1008).locator('.notification-message').scroll_into_view_if_needed();wait(page)
  scroll=page.locator('#dialog .dialog-body').evaluate('(e)=>e.scrollTop')
  notice(page,1008).locator('.notification-title').tap();wait(page)
  check('reading mid-inbox preserves scroll',abs(page.locator('#dialog .dialog-body').evaluate('(e)=>e.scrollTop')-scroll)<=1)
  notice(page,1009).locator('.notification-message').focus();page.keyboard.press('Enter');wait(page)
  check('Enter reads a focused notification',not next(n for n in saved(page)['notifications'] if n['id']==1009)['unread'])
  week=saved(page)['week'];notice(page,1010).locator('.notification-message').focus();page.keyboard.press('Space');wait(page)
  check('Space reads a notification without advancing a week',not next(n for n in saved(page)['notifications'] if n['id']==1010)['unread'] and saved(page)['week']==week)
  page.screenshot(path=str(out/'inbox-read-mobile.png'))
  notice(page,1001).locator('[data-action="notification-open"]').click();wait(page)
  check('opening the related film also marks its message read',modal(page)=='film' and not next(n for n in saved(page)['notifications'] if n['id']==1001)['unread'])
  close(page);check('film close returns to the inbox with read state preserved',modal(page)=='notifications' and 'unread' not in (notice(page,1001).get_attribute('class') or ''))
  notice(page,1002).locator('[data-action="notification-open"]').click();wait(page)
  check('opening a person routes correctly and reads the same message',modal(page)=='person' and not next(n for n in saved(page)['notifications'] if n['id']==1002)['unread'])
  close(page);check('person close returns to the inbox',modal(page)=='notifications')
  before_all=page.locator('#dialog .dialog-body').evaluate('(e)=>e.scrollTop');click(page,'notifications-read')
  check('read-all clears every unread badge without leaving inbox',modal(page)=='notifications' and unread(saved(page))==0 and page.locator('.notification-count').count()==0 and page.locator('.notification-record.unread').count()==0)
  check('read-all also preserves inbox scroll',abs(page.locator('#dialog .dialog-body').evaluate('(e)=>e.scrollTop')-before_all)<=1)
  latest=saved(page);check('reading does not change money, time, contracts or films',all(latest[k]==initial[k] for k in ['week','month','companies','films']))
  close(page);click(page,'notifications');check('read flags survive closing and reopening inbox',page.locator('.notification-record.unread').count()==0)
  latest=saved(page);page.close();page=newpage(browser,latest);click(page,'notifications');check('read flags survive serialized save reload',page.locator('.notification-record.unread').count()==0 and unread(saved(page))==0)
  page.close()
  # Recreate the original failure with an unfinished casting draft and a non-studio view.
  page=newpage(browser,fresh);baseline=saved(page);nav(page,'scripts');click(page,'pitch',':not([disabled])');page.locator('#film-title').fill('이어가기 확인 작품');click(page,'wizard-next')
  close(page);nav(page,'talents');click(page,'home');check('save-and-home keeps the saved company',page.locator('[data-action="resume"]').is_visible())
  click(page,'resume');check('resume with a draft always opens dashboard without a modal',view(page)=='studio' and modal(page) is None and page.locator('.start-viewport').count()==0)
  page.screenshot(path=str(out/'resumed-dashboard-mobile.png'))
  check('unfinished draft remains reachable from dashboard',act(page,'resume-draft').is_visible())
  click(page,'resume-draft');check('draft opens only after explicit action',modal(page)=='wizard',{'modal':modal(page),'view':view(page)})
  if not page.locator('#film-title').count():click(page,'wizard-back')
  check('the unfinished draft title was preserved',page.locator('#film-title').input_value()=='이어가기 확인 작품')
  close(page);check('closing reopened draft returns to dashboard, never home',modal(page) is None and view(page)=='studio' and page.locator('.start-viewport').count()==0)
  for v in ['market','scripts','talents']:
   nav(page,v);click(page,'home');click(page,'resume');check(f'resume from {v} always lands on dashboard',view(page)=='studio' and modal(page) is None)
  page.go_back();wait(page);check('browser back from resumed dashboard goes to home',page.locator('.start-viewport').count()==1)
  page.go_forward();wait(page);check('browser forward restores dashboard without reopening the draft',view(page)=='studio' and modal(page) is None)
  click(page,'more');click(page,'help');close(page);check('guide close still returns to more menu',modal(page)=='more');close(page);check('more closes back to resumed dashboard',modal(page) is None and view(page)=='studio')
  latest=saved(page);check('resume does not alter saved simulation data',all(latest[k]==baseline[k] for k in ['week','month','companies','films']))
  page.close()
  # No draft: repeated home/resume and other page histories must still resolve to studio.
  page=newpage(browser,fresh);nav(page,'market');click(page,'home');click(page,'resume');check('resume with no draft also lands on dashboard',view(page)=='studio' and modal(page) is None)
  page.close()
  # Pending completion is deferred, not lost or bypassed by resuming.
  data=copy.deepcopy(ready);film=next(f for f in data['films'] if f['id']==meta['filmId']);film['completionAcknowledged']=False
  page=newpage(browser,data);check('pending completion fixture opens its required task initially',modal(page)=='completion')
  page.go_back();wait(page);click(page,'home');click(page,'resume');check('resume with a pending completion still shows dashboard only',modal(page) is None and view(page)=='studio')
  before=saved(page);check('pending completion was not silently acknowledged',not next(f for f in before['films'] if f['id']==meta['filmId'])['completionAcknowledged'])
  click(page,'advance');check('next-week action still prompts the required completion without advancing',modal(page)=='completion' and saved(page)['week']==before['week'])
  page.close();check('no JavaScript runtime errors',not errors,errors);browser.close()
except Exception:
 if page:
  try:page.screenshot(path=str(out/'failure-v145.png'))
  except Exception:pass
 traceback.print_exc();raise
finally:
 report={'version':'1.4.5','transport':'Offline actual dist modules, Chromium touch and History API','checks':checks,'pageErrors':errors}
 (out/'mobile-v145-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(f'Completed {sum(c["passed"] for c in checks)}/{len(checks)} checks; JS errors {len(errors)}',flush=True)
