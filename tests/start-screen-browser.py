import importlib.util,json
from pathlib import Path
from playwright.sync_api import sync_playwright
import browser_support as m
OUT=m.artifact_dir();payload=m.fixture_payload();rows=[];errors=[]
sizes=[(1920,1080),(1366,768),(1024,768),(768,1024),(390,844),(360,640),(320,568),(844,390),(667,375),(568,320)]
start_sizes=[(1920,1080),(1536,864),(1440,900),(1366,768),(1280,720),(1024,768),(1024,600),(800,600),(768,1024),(820,1180),(430,932),(414,896),(390,844),(393,852),(375,667),(360,640),(320,568),(320,480),(932,430),(844,390),(812,375),(740,360),(667,375),(568,320),(1024,400),(800,400),(360,400),(280,400)]
def act(page,n,x=''):return page.locator('[data-action="'+n+'"]'+x+':visible').first

def inspect(page,label,w,h,modal=False,start=False):
 row=page.evaluate('''({label,modal,start})=>{
 const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
 const root=document.documentElement,d=document.querySelector('dialog');
 const out={label,w:innerWidth,h:innerHeight,scrollW:root.scrollWidth,scrollH:root.scrollHeight,bodyH:document.body.scrollHeight};
 if(modal){out.dialog=rect(d);out.innerW=d.querySelector('.dialog-body').clientWidth;out.scrollInnerW=d.querySelector('.dialog-body').scrollWidth;out.innerH=d.querySelector('.dialog-body').clientHeight;out.scrollInnerH=d.querySelector('.dialog-body').scrollHeight;out.footer=rect(d.querySelector('.dialog-footer'));out.buttons=[...d.querySelectorAll('.dialog-footer button')].map(rect);}
 if(start){out.stage=rect(document.querySelector('.start-page'));out.footer=rect(document.querySelector('.start-bottom'));out.button=rect(document.querySelector('.setup-card .btn.primary'));}
 out.faces=document.querySelectorAll('img.face-ready').length;return out;
 }''',{'label':label,'modal':modal,'start':start})
 assert row['scrollW']<=w+1,('page horizontal overflow',row)
 if start:
  assert row['scrollH']<=h,('start scroll',row)
  for key in ['stage','footer','button']:
   r=row[key];assert r['x']>=-1 and r['y']>=-1 and r['right']<=w+1 and r['bottom']<=h+1,('start clipping',row)
 if modal:
  assert row['scrollInnerW']<=row['innerW']+1,('dialog horizontal overflow',row)
  assert row['footer']['bottom']<=h+1,('footer clipped',row)
  for r in row['buttons']:assert r['right']<=w+1 and r['x']>=-1 and r['bottom']<=h+1,('button clipping',row)
 rows.append(row)
 if (w,h) in [(1366,768),(390,844),(844,390)]:page.screenshot(path=str(OUT/(label+f'-{w}x{h}.png')))
 print('PASS',label,w,h,'scroll',row['scrollH'],flush=True)

def sweep(page,label,modal=False,start=False):
 for w,h in sizes:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(220);inspect(page,label,w,h,modal,start)

with sync_playwright() as p:
 b=m.launch_browser(p);page=b.new_page();page.set_default_timeout(5000);page.on('pageerror',lambda e:errors.append(str(e)));m.load(page,payload)
 for w,h in start_sizes:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(95);inspect(page,'start',w,h,start=True)
 page.close()
 page=b.new_page();page.set_default_timeout(5000);page.on('pageerror',lambda e:errors.append(str(e)));m.load(page,payload,json.loads((OUT/'fixture-week-18.json').read_text()))
 sweep(page,'studio')
 act(page,'nav','[data-view="talents"]').click();page.wait_for_timeout(1000);sweep(page,'people')
 act(page,'nav','[data-view="scripts"]').click();sweep(page,'scripts')
 # Open via main page film management; no test-only UI modifications.
 act(page,'nav','[data-view="studio"]').click();film=next(f for f in json.loads((OUT/'fixture-week-18.json').read_text())['films'] if f['company']=='c0');act(page,'business',f'[data-id="{film["id"]}"]').click();page.wait_for_selector('.agency-options');sweep(page,'marketing',modal=True);page.close()
 page=b.new_page();page.set_default_timeout(5000);page.on('pageerror',lambda e:errors.append(str(e)));m.load(page,payload,json.loads((OUT/'fixture-week-24.json').read_text()));page.wait_for_selector('.poster-grid');sweep(page,'completion',modal=True);page.close()
 assert not errors,errors;b.close()
(OUT/'layout-report.json').write_text(json.dumps({'screens':rows,'errors':errors},ensure_ascii=False,indent=2));print('ALL',len(rows),'VIEWPORT CHECKS PASSED')
