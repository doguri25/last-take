"""Exercise actual dist modules through the offline loader and native History API.
Run: python tests/navigation-v146-browser.py --output /path/to/qa
Requires Playwright and a local Chromium installation (no external service).
"""
import argparse
import json
import subprocess
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT, launch_browser, fixture_payload, load

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=ROOT / 'qa-output')
out = parser.parse_args().output.resolve()
out.mkdir(parents=True, exist_ok=True)
if not (out / 'v12-market.json').exists():
    subprocess.run(['node', str(ROOT / 'tests/studio-v12-fixtures.js'), str(out)], check=True)
fixture = json.loads((out / 'v12-market.json').read_text())
checks, errors = [], []

payload = fixture_payload()
page = None

def check(label, ok, detail=None):
    checks.append({'check': label, 'passed': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + label, flush=True)
    if not ok:
        raise AssertionError(f'{label}: {detail}')

def wait():
    page.wait_for_timeout(180)

def modal():
    return page.locator('#dialog').get_attribute('data-modal') if page.locator('#dialog').evaluate('(e)=>e.open') else None

def scope():
    return page.locator('#dialog') if modal() else page

def button(action, extra=''):
    return scope().locator(f'[data-action="{action}"]{extra}').filter(visible=True).first

def click(action, extra=''):
    target = button(action, extra)
    if touch:
        target.tap()
    else:
        target.click()
    wait()

def close():
    page.locator('#dialog > .dialog-header [data-action="close"]').click()
    wait()

def saved():
    return json.loads(page.evaluate('localStorage.getItem("last-take-game-v1")'))

def check_chart(label):
    slider = page.locator('#history-point')
    check(label + ': graph and selection control exist', page.locator('.history-chart').count() == 1 and slider.count() == 1)
    slider.focus()
    page.keyboard.press('Home')
    first = page.locator('#chart-readout').inner_text()
    x1 = page.locator('#chart-active-dot').get_attribute('cx')
    check(label + ': first point can be inspected', slider.input_value() == '0' and bool(first))
    page.keyboard.press('End')
    x2 = page.locator('#chart-active-dot').get_attribute('cx')
    check(label + ': last point and its coordinates still work', slider.input_value() == slider.get_attribute('max') and (slider.get_attribute('max') == '0' or x1 != x2))

try:
    with sync_playwright() as pw:
        browser = launch_browser(pw)
        for width, height, touch in [(390, 844, True), (844, 390, True), (1366, 768, False)]:
            label = f'{width}x{height}'
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch)
            page = context.new_page()
            page.set_default_timeout(6000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            load(page, payload, fixture)
            wait()
            baseline = saved()
            check(label + ': actual app starts on dashboard', page.locator('#main').get_attribute('data-view') == 'studio' and modal() is None)

            # Original failure: graph data used to leak into later detail history.
            click('nav', '[data-view="finance"]')
            click('finance-chart', '[data-id="cash"]')
            check_chart(label + ' finance')
            click('feature-back')
            check(label + ': finance graph back returns to finance', modal() is None and page.locator('#main').get_attribute('data-view') == 'finance')
            click('nav', '[data-view="market"]')
            click('company-info')
            company_id = page.evaluate('history.state.screen.modal.id')
            click('film-peek')
            check(label + ': company work opens a film after viewing graph', modal() == 'film')
            click('feature-back')
            check(label + ': film footer back returns to its company', modal() == 'company-info' and page.evaluate('history.state.screen.modal.id') == company_id)
            click('film-peek')
            close()
            check(label + ': film X also returns to its company', modal() == 'company-info')
            close()
            check(label + ': company close returns to box office', modal() is None and page.locator('#main').get_attribute('data-view') == 'market')

            click('film')
            film_id = page.evaluate('history.state.screen.modal.id')
            for metric in ['audience', 'gross', 'cumulative']:
                click('film-chart', f'[data-key="{metric}"]')
                check_chart(label + ' ' + metric)
                click('feature-back')
                check(label + ': graph back restores film (' + metric + ')', modal() == 'film' and page.evaluate('history.state.screen.modal.id') == film_id)

            # Nested profile -> film, both native browser directions, and reload.
            click('film-tab', '[data-id="crew"]')
            click('person-peek')
            person_id = page.evaluate('history.state.screen.modal.id')
            click('film', f'[data-id="{film_id}"]')
            check(label + ': person film history opens film detail', modal() == 'film')
            page.go_back()
            wait()
            check(label + ': browser back restores the same person', modal() == 'person' and page.evaluate('history.state.screen.modal.id') == person_id)
            page.go_forward()
            wait()
            check(label + ': browser forward restores the same film', modal() == 'film' and page.evaluate('history.state.screen.modal.id') == film_id)
            checkpoint = saved()
            page.reload(wait_until='load')
            load(page, payload, checkpoint)
            wait()
            check(label + ': reload restores film screen safely', modal() == 'film' and page.evaluate('history.state.screen.modal.id') == film_id)
            click('feature-back')
            check(label + ': footer back after reload returns to person', modal() == 'person' and page.evaluate('history.state.screen.modal.id') == person_id)
            close()
            check(label + ': nested profile X restores crew tab', modal() == 'film' and page.locator('[data-action="film-tab"].active').get_attribute('data-id') == 'crew')
            click('film-tab', '[data-id="overview"]')

            for action in ['critic-reviews', 'audience-reviews']:
                click(action)
                check(label + ': ' + action + ' opens after repeated graphs', modal() == action)
                click('feature-back')
                check(label + ': review back returns to film', modal() == 'film' and page.evaluate('history.state.screen.modal.id') == film_id)

            # Re-rendering a chart on history restore must recreate its functions.
            click('film-chart', '[data-key="gross"]')
            page.go_back()
            wait()
            check(label + ': browser back from chart restores film', modal() == 'film')
            page.go_forward()
            wait()
            check(label + ': browser forward restores chart', modal() == 'film-chart')
            check_chart(label + ' restored chart')
            click('feature-back')
            page.screenshot(path=str(out / f'film-back-fixed-{label}.png'))
            close()
            check(label + ': final close returns to box office', modal() is None and page.locator('#main').get_attribute('data-view') == 'market')
            check(label + ': history contains no graph runtime cache', page.evaluate('(history.state.screen.state.peekStack || []).every(frame => !Object.hasOwn(frame, "chart"))'))
            check(label + ': saved week, money, contracts and films are unchanged', all(saved()[key] == baseline[key] for key in ['week', 'month', 'companies', 'films']))
            check(label + ': no red error toast or dialog feedback', page.locator('.toast.error.visible, .dialog-feedback.error:not([hidden])').count() == 0)
            context.close()
        check('No JavaScript runtime errors', not errors, errors)
        browser.close()
except Exception:
    if page:
        try:
            page.screenshot(path=str(out / 'failure-v146.png'))
        except Exception:
            pass
    traceback.print_exc()
    raise
finally:
    report = {'version': '1.4.6', 'transport': 'Offline actual dist modules, native History API, in-memory storage fixture, Chromium', 'checks': checks, 'pageErrors': errors}
    (out / 'navigation-v146-browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f'Completed {sum(c["passed"] for c in checks)}/{len(checks)} checks; JS errors {len(errors)}', flush=True)
