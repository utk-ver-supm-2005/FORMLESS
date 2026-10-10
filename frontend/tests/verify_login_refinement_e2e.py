import asyncio
import json
import os
import subprocess
import sys
import base64
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "chrome_login_profile")
ARTIFACT_DIR = r"C:\Users\poove\.gemini\antigravity-ide\brain\44cd34d9-3bb9-44f8-9539-9a055a99e2d1"
PORT = 9227

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
    print("FORMLESS LOGIN UI - FINAL REFINEMENT VERIFICATION")
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
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        # Wait for CDP endpoint
        ws_url = None
        for attempt in range(25):
            await asyncio.sleep(0.4)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as resp:
                    tabs = json.loads(resp.read().decode())
                    for t in tabs:
                        if t.get("type") == "page" and "webSocketDebuggerUrl" in t:
                            ws_url = t["webSocketDebuggerUrl"]
                            break
                    if ws_url:
                        break
            except Exception:
                pass

        if not ws_url:
            raise RuntimeError("Failed to attach to headless Chrome instance.")

        print(f"Connected to Chrome CDP: {ws_url}")

        async with websockets.connect(ws_url, max_size=50_000_000) as ws:
            cdp = CDP(ws)
            await cdp.call("Page.enable")
            await cdp.call("DOM.enable")

            # -------------------------------------------------------------
            # STEP 1: Navigate to Standalone /login Page
            # -------------------------------------------------------------
            print("\n[STEP 1] Navigating to http://localhost:5173/login ...")
            await cdp.call("Page.navigate", {"url": "http://localhost:5173/login"})
            await asyncio.sleep(1.5)

            current_url = await cdp.eval("window.location.href")
            print(f"  Current URL: {current_url}")
            assert "/login" in current_url, f"Expected /login, got {current_url}"

            login_page_rendered = await cdp.eval("!!document.querySelector('.login-page-card')")
            assert login_page_rendered, "LoginPageView card not rendered!"

            await cdp.capture_screenshot("login_refinement_01_page.png")

            # -------------------------------------------------------------
            # STEP 2: Verify Credentials Visibility and Copy Buttons
            # -------------------------------------------------------------
            print("\n[STEP 2] Verifying Visible Credentials and Copy Buttons...")
            credentials_info = await cdp.eval("""(() => {
                const panel = document.querySelector('.login-demo-panel');
                const heading = document.getElementById('demo-panel-title')?.textContent.trim();
                const desc = document.querySelector('.demo-panel-description')?.textContent.trim();
                const credValues = Array.from(document.querySelectorAll('.demo-cred-value')).map(el => el.textContent.trim());
                const copyBtns = Array.from(document.querySelectorAll('.demo-copy-btn')).length;

                return {
                    hasPanel: !!panel,
                    heading,
                    desc,
                    credValues,
                    copyBtnsCount: copyBtns,
                };
            })()""")

            print(f"  Demo Panel Heading: '{credentials_info['heading']}'")
            print(f"  Demo Description:   '{credentials_info['desc']}'")
            print(f"  Credentials Found:  {credentials_info['credValues']}")
            print(f"  Copy Buttons Count: {credentials_info['copyBtnsCount']}")

            assert credentials_info["heading"] == "Demo account", "Demo panel heading must be 'Demo account'"
            assert "canonical FSSAI compliance scenario" in credentials_info["desc"], "Description text mismatch"
            assert "formless_demo" in credentials_info["credValues"], "Username 'formless_demo' not clearly displayed"
            assert "FormlessDemo2026!" in credentials_info["credValues"], "Password 'FormlessDemo2026!' not clearly displayed"
            assert credentials_info["copyBtnsCount"] == 2, "Expected 2 copy buttons beside username and password"

            # Test Copy Feedback
            print("\n  Testing copy button interaction and visible feedback...")
            await cdp.eval("""(() => {
                const firstCopyBtn = document.querySelectorAll('.demo-copy-btn')[0];
                firstCopyBtn.click();
            })()""")
            await asyncio.sleep(0.3)

            copy_state = await cdp.eval("""(() => {
                const firstBtn = document.querySelectorAll('.demo-copy-btn')[0];
                return {
                    isCopiedClass: firstBtn.classList.contains('is-copied'),
                    feedbackText: firstBtn.querySelector('.copy-feedback')?.textContent.trim()
                };
            })()""")

            print(f"  First Copy Button Feedback State: {copy_state}")
            assert copy_state["isCopiedClass"], "Copy button missing 'is-copied' class after click"
            assert copy_state["feedbackText"] == "Copied!", "Copy button missing 'Copied!' feedback"
            await cdp.capture_screenshot("login_refinement_02_copied_state.png")

            # -------------------------------------------------------------
            # STEP 3: Verify Password Show/Hide Toggle
            # -------------------------------------------------------------
            print("\n[STEP 3] Verifying Password Field and Show/Hide Toggle...")
            pwd_state_before = await cdp.eval("document.getElementById('login-password-input')?.getAttribute('type')")
            print(f"  Initial password type: {pwd_state_before}")
            assert pwd_state_before == "password", "Password input initial type should be 'password'"

            # Click toggle
            await cdp.eval("document.querySelector('.login-password-toggle')?.click()")
            await asyncio.sleep(0.2)
            pwd_state_after = await cdp.eval("document.getElementById('login-password-input')?.getAttribute('type')")
            print(f"  Password type after toggle: {pwd_state_after}")
            assert pwd_state_after == "text", "Password input type should toggle to 'text'"

            # Click toggle back
            await cdp.eval("document.querySelector('.login-password-toggle')?.click()")
            await asyncio.sleep(0.2)
            pwd_state_final = await cdp.eval("document.getElementById('login-password-input')?.getAttribute('type')")
            assert pwd_state_final == "password", "Password input type should return to 'password'"

            # -------------------------------------------------------------
            # STEP 4: Verify Google Sign-In Behavior
            # -------------------------------------------------------------
            print("\n[STEP 4] Verifying 'Continue with Google' honest unavailable disclosure...")
            await cdp.eval("document.getElementById('login-google-btn')?.click()")
            await asyncio.sleep(0.3)

            google_notice = await cdp.eval("""(() => {
                const notice = document.querySelector('.login-oauth-notice');
                return {
                    visible: !!notice,
                    title: notice?.querySelector('.notice-title')?.textContent.trim(),
                    desc: notice?.querySelector('.notice-desc')?.textContent.trim()
                };
            })()""")

            print(f"  Google SSO Notice Displayed: {google_notice}")
            assert google_notice["visible"], "Google SSO notice not displayed"
            assert "Single Sign-On Notice" in (google_notice["title"] or ""), "Missing title in SSO notice"
            assert "not configured on this deployment" in (google_notice["desc"] or ""), "Missing honest unconfigured message in SSO notice"
            await cdp.capture_screenshot("login_refinement_03_google_notice.png")

            # -------------------------------------------------------------
            # STEP 5: Test Failed Authentication (Does NOT Redirect)
            # -------------------------------------------------------------
            print("\n[STEP 5] Testing Failed Authentication with Invalid Credentials...")
            await cdp.eval("""(() => {
                const userInput = document.getElementById('login-email-input');
                const passInput = document.getElementById('login-password-input');

                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(userInput, 'formless_demo');
                userInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(passInput, 'WrongPassword123!');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                document.getElementById('login-continue-btn').click();
            })()""")

            await asyncio.sleep(1.0)

            auth_fail_state = await cdp.eval("""(() => {
                const errorAlert = document.querySelector('.login-error-alert');
                return {
                    path: window.location.pathname,
                    hasError: !!errorAlert,
                    errorMsg: errorAlert ? errorAlert.textContent.trim() : null
                };
            })()""")

            print(f"  Failed Auth State: {auth_fail_state}")
            assert auth_fail_state["path"] == "/login", "Failed authentication should NOT redirect into workspace"
            assert auth_fail_state["hasError"], "Failed authentication must display error alert"
            assert "Invalid credentials" in auth_fail_state["errorMsg"], "Error message must indicate invalid credentials"
            await cdp.capture_screenshot("login_refinement_04_auth_failed.png")

            # -------------------------------------------------------------
            # STEP 6: Test Successful 1-Click Demo Login
            # -------------------------------------------------------------
            print("\n[STEP 6] Testing 'Sign in with Demo Account ->' (Backend Authentication)...")
            await cdp.eval("document.getElementById('login-demo-action-btn')?.click()")
            await asyncio.sleep(1.5)

            auth_success_state = await cdp.eval("""(() => {
                return {
                    path: window.location.pathname,
                    accessMode: sessionStorage.getItem('formless_access_mode'),
                    demoUser: sessionStorage.getItem('formless_demo_user'),
                    token: sessionStorage.getItem('formless_token'),
                    hasHeader: !!document.querySelector('.app-header'),
                    hasWorkspaceOverview: !!document.querySelector('.overview-grid, .overview-hero-card, .metric-bar')
                };
            })()""")

            print(f"  Successful Auth State: {auth_success_state}")
            assert auth_success_state["path"] == "/overview", f"Expected /overview, got {auth_success_state['path']}"
            assert auth_success_state["accessMode"] == "demo", "Demo access mode not set in sessionStorage"
            assert auth_success_state["demoUser"] == "formless_demo", "formless_demo user not set in sessionStorage"
            assert auth_success_state["token"] is not None, "Auth session token missing in sessionStorage"
            assert auth_success_state["hasHeader"], "Workspace header missing in /overview"
            await cdp.capture_screenshot("login_refinement_05_workspace_overview.png")

            # -------------------------------------------------------------
            # STEP 7: Verify Landing Page Modal Entry Point
            # -------------------------------------------------------------
            print("\n[STEP 7] Verifying Landing Page Modal Login Entry...")
            await cdp.call("Page.navigate", {"url": "http://localhost:5173/"})
            await asyncio.sleep(1.5)

            # Clear session
            await cdp.eval("sessionStorage.clear()")

            # Open modal via Hero button
            await cdp.eval("document.getElementById('hero-open-workspace')?.click()")
            await asyncio.sleep(0.5)

            modal_info = await cdp.eval("""(() => {
                const modal = document.querySelector('.login-modal-container');
                const demoHeading = modal?.querySelector('#demo-panel-title')?.textContent.trim();
                const creds = Array.from(modal?.querySelectorAll('.demo-cred-value') || []).map(e => e.textContent.trim());
                return {
                    isOpen: !!modal,
                    demoHeading,
                    creds
                };
            })()""")

            print(f"  Modal in Landing Page: {modal_info}")
            assert modal_info["isOpen"], "Login modal did not open from landing page CTA"
            assert modal_info["demoHeading"] == "Demo account", "Modal demo heading mismatch"
            assert "formless_demo" in modal_info["creds"], "Modal credentials missing"

            await cdp.capture_screenshot("login_refinement_06_landing_modal.png")

            # Submit via standard sign-in form with valid demo credentials
            print("\n[STEP 8] Testing Standard Sign-In Form with valid credentials in Modal...")
            await cdp.eval("""(() => {
                const userInput = document.getElementById('login-email-input');
                const passInput = document.getElementById('login-password-input');

                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(userInput, 'formless_demo');
                userInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(passInput, 'FormlessDemo2026!');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                document.getElementById('login-continue-btn').click();
            })()""")
            await asyncio.sleep(1.5)

            modal_auth_result = await cdp.eval("""(() => {
                return {
                    path: window.location.pathname,
                    accessMode: sessionStorage.getItem('formless_access_mode'),
                    demoUser: sessionStorage.getItem('formless_demo_user'),
                };
            })()""")

            print(f"  Modal Standard Sign In Result: {modal_auth_result}")
            assert modal_auth_result["path"] == "/overview", f"Expected /overview, got {modal_auth_result['path']}"
            assert modal_auth_result["demoUser"] == "formless_demo"

            await cdp.capture_screenshot("login_refinement_07_modal_success.png")

            print("\n" + "=" * 70)
            print("ALL LOGIN REFINEMENT VERIFICATION CHECKS PASSED PERFECTLY!")
            print("=" * 70)

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
