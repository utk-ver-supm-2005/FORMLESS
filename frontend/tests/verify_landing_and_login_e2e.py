import asyncio
import json
import os
import subprocess
import sys
import base64
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "chrome_py_profile")
ARTIFACT_DIR = r"C:\Users\poove\.gemini\antigravity-ide\brain\44cd34d9-3bb9-44f8-9539-9a055a99e2d1"
PORT = 9225

class CDP:
    def __init__(self, ws):
        self.ws = ws
        self.msg_id = 0

    async def call(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        while True:
            resp_raw = await self.ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("id") == self.msg_id:
                if "error" in resp:
                    raise RuntimeError(f"CDP error: {resp['error']}")
                return resp.get("result", {})

    async def eval(self, expr):
        res = await self.call("Runtime.evaluate", {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": True
        })
        val = res.get("result", {}).get("value")
        return val

    async def capture_screenshot(self, filename):
        res = await self.call("Page.captureScreenshot", {"format": "png"})
        raw = base64.b64decode(res["data"])
        out_path = os.path.join(ARTIFACT_DIR, filename)
        with open(out_path, "wb") as f:
            f.write(raw)
        print(f"  [Screenshot Captured] {filename} ({len(raw)} bytes)")
        return out_path

async def main():
    print("=" * 70)
    print("FORMLESS LANDING PAGE & LOGIN FLOW - COMPREHENSIVE E2E VERIFICATION")
    print("=" * 70)

    os.makedirs(USER_DATA_DIR, exist_ok=True)
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={USER_DATA_DIR}",
        "--disable-extensions",
        "--window-size=1440,900",
        "about:blank"
    ])

    try:
        ws_url = None
        for _ in range(25):
            await asyncio.sleep(0.3)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
                    targets = json.loads(r.read().decode("utf-8"))
                    for t in targets:
                        if t.get("type") == "page" and "webSocketDebuggerUrl" in t:
                            ws_url = t["webSocketDebuggerUrl"]
                            break
                    if ws_url:
                        break
            except Exception:
                pass

        assert ws_url, "Failed to connect to Chrome remote debugging port"
        print(f"  [Connected] Chrome CDP: {ws_url}")

        async with websockets.connect(ws_url, max_size=50 * 1024 * 1024) as ws:
            cdp = CDP(ws)
            await cdp.call("Page.enable")
            await cdp.call("Runtime.enable")
            await cdp.call("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            # --- PART 1: LANDING PAGE RENDERING & SCROLL EXPERIENCE ---
            print("\n[PART 1.1] Navigating to Landing Page (http://localhost:5173/)")
            nav_res = await cdp.call("Page.navigate", {"url": "http://localhost:5173/"})
            print(f"  [Navigate result]: {nav_res}")
            await asyncio.sleep(3.0)

            curr_href = await cdp.eval("window.location.href")
            print(f"  [Current URL]: {curr_href}")
            body_html = await cdp.eval("document.body.innerHTML")
            print(f"  [Body HTML Length]: {len(body_html or '')}")
            if len(body_html or '') < 500:
                print(f"  [Body HTML Snippet]: {body_html}")
            headline = await cdp.eval("document.querySelector('.hero-headline')?.textContent")
            print(f"  [Hero Content] Headline: '{headline}'")
            assert "Turn complex requirements" in (headline or ""), f"Hero headline failed to render. HTML: {body_html[:300]}"
            await cdp.capture_screenshot("e2e_01_landing_hero.png")

            print("\n[PART 1.2] Verifying Sticky Stage Pinning across Chapters 1-5")
            # Test scroll positions and sticky stage pinning
            checkpoints = [
                (0, "Hero Top", False),
                (800, "Chapter 1 - Initial Document", True),
                (1400, "Chapter 2 - Clause Highlighting", True),
                (2000, "Chapter 3 - Requirement Extraction", True),
                (2600, "Chapter 4 - Evidence Connection", True),
                (3000, "Chapter 5 - Stage Gate Clearance", True),
                (3600, "Pinned Scene Cleanly Releases", False),
            ]

            for scroll_y, label, expect_pinned in checkpoints:
                await cdp.eval(f"window.scrollTo(0, {scroll_y})")
                await asyncio.sleep(0.2)
                state = await cdp.eval("""(() => {
                    const stage = document.querySelector('.scroll-sticky-stage');
                    const rect = stage ? stage.getBoundingClientRect() : null;
                    const card = document.querySelector('.statutory-quote-card');
                    const guide = document.querySelector('.satellite-guide-card');
                    return {
                        scrollY: window.scrollY,
                        stageTop: rect ? Math.round(rect.top) : null,
                        stageHeight: rect ? Math.round(rect.height) : null,
                        hasCard: !!card,
                        hasGuide: !!guide,
                    };
                })()""")
                print(f"  Scroll {scroll_y:4d}px ({label:35s}) -> stageTop: {state['stageTop']}px, stageHeight: {state['stageHeight']}px")
                if expect_pinned:
                    assert state["stageTop"] == 0, f"Sticky stage broke at scrollY={scroll_y}, stageTop was {state['stageTop']}"
                elif scroll_y == 3600:
                    assert state["stageTop"] < 0, "Sticky stage failed to release after document scene"

            await cdp.eval("window.scrollTo(0, 1600)")
            await asyncio.sleep(0.2)
            await cdp.capture_screenshot("e2e_02_pinned_chapter2.png")

            await cdp.eval("window.scrollTo(0, 3100)")
            await asyncio.sleep(0.2)
            await cdp.capture_screenshot("e2e_03_pinned_chapter4.png")

            print("\n[PART 1.3] Verifying Narrative Sections Below Pinned Scene")
            narrative_sections = [
                ("problem", 4300, ".problem-section", "THE COMPLIANCE PARADOX"),
                ("workflow", 5300, ".workflow-section", "From raw statutory document to stage clearance"),
                ("advantages", 6300, ".advantages-section", "Built for institutional certainty"),
                ("preview", 7300, ".preview-section", "Experience the compliance transformation"),
                ("bottom-cta", 8100, ".landing-bottom-cta", "Ready to verify compliance"),
            ]

            for sec_id, y, selector, expected_snippet in narrative_sections:
                await cdp.eval(f"window.scrollTo(0, {y})")
                await asyncio.sleep(0.2)
                content = await cdp.eval(f"document.querySelector('{selector}')?.textContent")
                assert expected_snippet in (content or ""), f"Section {sec_id} missing expected content '{expected_snippet}'"
                print(f"  Section {sec_id:12s} at scrollY={y}px -> Verified ('{expected_snippet}')")

            await cdp.eval("window.scrollTo(0, 5300)")
            await asyncio.sleep(0.2)
            await cdp.capture_screenshot("e2e_04_workflow_pipeline.png")

            await cdp.eval("window.scrollTo(0, 8100)")
            await asyncio.sleep(0.2)
            await cdp.capture_screenshot("e2e_05_bottom_cta.png")

            print("\n[PART 1.4] Verifying Backward Scrolling Restoration")
            await cdp.eval("window.scrollTo(0, 1200)")
            await asyncio.sleep(0.25)
            stage_top_backward = await cdp.eval("document.querySelector('.scroll-sticky-stage')?.getBoundingClientRect().top")
            print(f"  Backward scroll to 1200px: stageTop = {stage_top_backward}px")
            assert stage_top_backward == 0, "Sticky stage failed to re-pin when scrolling backward"

            # --- PART 2: POLISHED LOGIN EXPERIENCE ---
            print("\n[PART 2.1] Testing Login Modal Trigger from Hero CTA")
            await cdp.eval("window.scrollTo(0, 0)")
            await asyncio.sleep(0.2)
            await cdp.eval("document.getElementById('hero-open-workspace').click()")
            await asyncio.sleep(0.4)

            modal_info = await cdp.eval("""(() => {
                const modal = document.querySelector('.login-modal-container');
                const title = document.getElementById('login-title');
                const desc = document.getElementById('login-description');
                const mode = document.querySelector('.login-mode-pill');
                const notice = document.querySelector('.login-demo-notice');
                return {
                    visible: !!modal,
                    title: title ? title.textContent.trim() : null,
                    desc: desc ? desc.textContent.trim() : null,
                    mode: mode ? mode.textContent.trim() : null,
                    notice: notice ? notice.textContent.trim() : null,
                };
            })()""")
            print(f"  Modal Open Verified: {modal_info['visible']}")
            print(f"    Headline: '{modal_info['title']}'")
            print(f"    Subcopy:  '{modal_info['desc']}'")
            print(f"    Mode:     '{modal_info['mode']}'")
            assert modal_info["title"] == "Welcome to FORMLESS", "Invalid modal title"
            assert "Continue to your workspace" in modal_info["desc"], "Invalid modal description"
            assert "DEMO ACCESS MODE" in modal_info["mode"], "Missing explicit demo access mode pill"
            await cdp.capture_screenshot("e2e_06_login_modal.png")

            print("\n[PART 2.2] Testing Email Validation (Honest Formatting)")
            # Invalid email test
            await cdp.eval("""(() => {
                const input = document.getElementById('login-email-input');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(input, 'invalid-format-test');
                input.dispatchEvent(new Event('input', { bubbles: true }));
                document.getElementById('login-continue-btn').click();
            })()""")
            await asyncio.sleep(0.3)

            error_text = await cdp.eval("document.querySelector('.login-error-alert')?.textContent")
            print(f"  Invalid Email Error: '{error_text}'")
            assert "Please enter a valid email address" in (error_text or ""), "Validation error not shown"
            await cdp.capture_screenshot("e2e_07_login_error.png")

            print("\n[PART 2.3] Testing Keyboard Accessibility (Escape Dismissal)")
            await cdp.call("Input.dispatchKeyEvent", {"type": "rawKeyDown", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
            await cdp.call("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
            await asyncio.sleep(0.4)

            modal_exists = await cdp.eval("!!document.querySelector('.login-modal-container')")
            print(f"  Modal after Escape key: exists = {modal_exists}")
            assert not modal_exists, "Escape key failed to dismiss modal"

            print("\n[PART 2.4] Testing Navigation CTA and Bottom CTA Entry Points")
            # Nav header CTA
            await cdp.eval("document.getElementById('nav-open-workspace').click()")
            await asyncio.sleep(0.3)
            assert await cdp.eval("!!document.querySelector('.login-modal-container')"), "Nav CTA failed to open modal"
            # Close with button
            await cdp.eval("document.querySelector('.login-close-btn').click()")
            await asyncio.sleep(0.3)
            assert not await cdp.eval("!!document.querySelector('.login-modal-container')"), "Close button failed"

            # Bottom CTA
            await cdp.eval("window.scrollTo(0, 8100)")
            await asyncio.sleep(0.2)
            await cdp.eval("document.getElementById('cta-open-workspace').click()")
            await asyncio.sleep(0.3)
            assert await cdp.eval("!!document.querySelector('.login-modal-container')"), "Bottom CTA failed to open modal"
            await cdp.eval("document.querySelector('.login-close-btn').click()")
            await asyncio.sleep(0.3)

            print("\n[PART 2.5] Testing Direct /login Route URL")
            await cdp.call("Page.navigate", {"url": "http://localhost:5173/login"})
            await asyncio.sleep(1.0)
            direct_page = await cdp.eval("""(() => {
                return {
                    path: window.location.pathname,
                    hasPageCard: !!document.querySelector('.login-page-card'),
                    hasLoginForm: !!document.querySelector('.login-form-wrapper'),
                    title: document.getElementById('login-title')?.textContent,
                    hasBackLink: !!document.querySelector('.login-page-back-link'),
                };
            })()""")
            print(f"  Direct /login -> path: {direct_page['path']}, hasCard: {direct_page['hasPageCard']}, title: '{direct_page['title']}'")
            assert direct_page["hasPageCard"], "Dedicated login page card not rendered on /login"
            assert direct_page["hasBackLink"], "Back link to landing page missing on /login"
            await cdp.capture_screenshot("e2e_08_direct_login_route.png")

            print("\n[PART 2.6] Testing Demo Workspace Entry and Session Persistence")
            # Enter valid institutional email and continue
            await cdp.eval("""(() => {
                const input = document.getElementById('login-email-input');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(input, 'reviewer@fssai.gov.in');
                input.dispatchEvent(new Event('input', { bubbles: true }));
                document.getElementById('login-continue-btn').click();
            })()""")
            await asyncio.sleep(1.0)

            ws_session = await cdp.eval("""(() => {
                return {
                    path: window.location.pathname,
                    mode: sessionStorage.getItem('formless_access_mode'),
                    user: sessionStorage.getItem('formless_demo_user'),
                    hasHeader: !!document.querySelector('.app-header'),
                    hasSummary: !!document.querySelector('.summary-card, .metric-bar, h1, h2'),
                };
            })()""")
            print(f"  Workspace Entry State: {ws_session}")
            assert ws_session["path"] == "/overview", f"Expected /overview but was {ws_session['path']}"
            assert ws_session["mode"] == "demo", "Demo mode not stored in session"
            assert ws_session["user"] == "reviewer@fssai.gov.in", "Demo user not stored in session"
            assert ws_session["hasHeader"], "Workspace header missing in /overview"
            await cdp.capture_screenshot("e2e_09_workspace_overview.png")

            print("\n[PART 2.7] Verifying Existing Workspace Routes")
            routes = [
                ("/requirements", "Requirements Matrix"),
                ("/readiness", "Readiness Map"),
                ("/action-plan", "Action Plan"),
            ]
            for r_path, r_label in routes:
                await cdp.call("Page.navigate", {"url": f"http://localhost:5173{r_path}"})
                await asyncio.sleep(1.2)
                page_info = await cdp.eval("""(() => {
                    return {
                        path: window.location.pathname,
                        heading: document.querySelector('h1, h2')?.textContent || '',
                        hasContent: document.body.innerText.length > 100
                    };
                })()""")
                page_info = page_info or {}
                print(f"  Route {r_path:15s} -> Path: {page_info.get('path')}, Heading: '{page_info.get('heading')}', Content: {page_info.get('hasContent')}")
                assert page_info.get("path") == r_path, f"Failed routing to {r_path}"
                assert page_info.get("hasContent"), f"Route {r_path} has empty content"

            await cdp.capture_screenshot("e2e_10_workspace_action_plan.png")

            print("\n" + "=" * 70)
            print("ALL LIVE E2E BROWSER VALIDATIONS PASSED WITH ZERO ERRORS!")
            print("=" * 70)

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()
        import shutil
        shutil.rmtree(USER_DATA_DIR, ignore_errors=True)

if __name__ == "__main__":
    asyncio.run(main())
