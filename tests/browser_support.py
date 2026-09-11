"""Offline test transport: actual dist modules via blob URLs, no logic patches."""
import base64,json,re,shutil,os,argparse,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def fixture_payload():
 dist=ROOT/'dist';modules={}
 for path in dist.glob('*.js'):
  source=re.sub(r"(from\s+['\"])\./([^'\"]+)(['\"])",lambda m:m[1]+'lasttake/'+m[2].split('?')[0]+m[3],path.read_text())
  source=source.replace('new URL(`./assets/portraits-${gender}.png`,import.meta.url).href',"window.__fixtureAssets['portraits-'+gender+'.png']")
  modules['lasttake/'+path.name]=source
 html=re.sub(r'<link\b[^>]*>|<script\b[^>]*>[\s\S]*?</script>','',(dist/'index.html').read_text())
 return {'html':html,'css':'\n'.join((dist/n).read_text() for n in ['style.css','portrait.css','start-screen.css','experience.css','studio-v12.css','studio-v13.css','studio-v14.css','mobile-v141.css','mobile-v142.css']),'modules':modules,'assets':{p.name:base64.b64encode(p.read_bytes()).decode() for p in (dist/'assets').glob('*.png')}}

def load(page,payload,saved=None):
 page.set_content(payload['html'])
 page.evaluate(r'''async ({payload,saved}) => {
  const storage=new Map(saved===null?[]:[['last-take-game-v1',JSON.stringify(saved)]]);
  Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()}});
  window.__fixtureAssets={};
  for (const [n,b] of Object.entries(payload.assets)) {const bytes=Uint8Array.from(atob(b),c=>c.charCodeAt(0));window.__fixtureAssets[n]=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));}
  const style=document.createElement('style');style.textContent=payload.css.replace(/\.\/assets\/([^'"\)\s]+)/g,(all,n)=>window.__fixtureAssets[n]||all);document.head.append(style);
  const imports={};for (const [n,s] of Object.entries(payload.modules))imports[n]=URL.createObjectURL(new Blob([s],{type:'text/javascript'}));
  const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
  window.__fixtureModules=imports;
  await import(imports['lasttake/app.js']);
 }''',{'payload':payload,'saved':saved})
 page.wait_for_selector('.shell' if saved else '[data-start-ready="true"]')
 page.wait_for_timeout(200)


def artifact_dir():
 parser=argparse.ArgumentParser(description='Last Take offline Chromium regression checks')
 parser.add_argument('--output',type=Path,default=ROOT/'qa-output')
 out=parser.parse_args().output.resolve();out.mkdir(parents=True,exist_ok=True)
 subprocess.run(['node',str(ROOT/'tests/make-browser-fixtures.js'),str(out)],check=True)
 return out

def launch_browser(playwright):
 options={'headless':True,'args':['--no-sandbox']}
 executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
 if executable:options['executable_path']=executable
 return playwright.chromium.launch(**options)
