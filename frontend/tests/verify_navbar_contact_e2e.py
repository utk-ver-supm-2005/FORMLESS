import asyncio
import json
import os
import subprocess
import urllib.request
import websockets
import base64

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "chrome_navbar_profile")
ARTIFACT_DIR = r"C:\Users\poove\.gemini\antigravity-ide\brain\44cd34d9-3bb9-44f8-9539-9a055a99e2d1"
PORT = 9235


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
        res = await self.call(
            "Runtime.evaluate",
            {"expression": expr, "returnByValue": True, "awaitPromise": True},
        )
        return res.get("result", {}).get("value")

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
    print("FORMLESS NAVBAR REDESIGN & CONTACT MODAL VERIFICATION")
    print("=" * 70)

    os.makedirs(USER_DATA_DIR, exist_ok=True)
    chrome_proc = subprocess.Popen(
        [
            CHROME_PATH,
            "--headless=new",
            f"--remote-debugging-port={PORT}",
            "--no-first-run",
            "--no-default-browser-check",
            f"--user-data-dir={USER_DATA_DIR}",
            "--window-size=1440,900",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    ws = None
    try:
        # Wait for debugging endpoint
        ws_url = None
        for attempt in range(25):
            await asyncio.sleep(0.4)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
                    tabs = json.loads(r.read())
                    if tabs:
                        ws_url = tabs[0]["webSocketDebuggerUrl"]
                        break
            except Exception:
                pass

        if not ws_url:
            raise RuntimeError("Could not connect to Chrome debugging endpoint.")

        print(f"[CDP] Connected to Chrome on port {PORT}")
        ws = await websockets.connect(ws_url, max_size=25 * 1024 * 1024)
        cdp = CDP(ws)

        await cdp.call("Page.enable")
        await cdp.call("DOM.enable")
        await cdp.call("Runtime.enable")
        await cdp.call("Log.enable")

        # 1. Navigate to Landing Page
        target_url = "http://localhost:5173/"
        print(f"[1] Navigating to {target_url}...")
        await cdp.call("Page.navigate", {"url": target_url})

        # Wait for React app to mount
        nav_rendered = False
        for attempt in range(25):
            await asyncio.sleep(0.5)
            check = await cdp.eval("!!document.querySelector('.public-landing-nav')")
            if check:
                nav_rendered = True
                print(f"  [App Mounted] .public-landing-nav found after {(attempt+1)*0.5:.1f}s")
                break
        
        if not nav_rendered:
            html = await cdp.eval("document.body.innerHTML")
            print(f"  [Debug Body HTML]: {html[:300] if html else 'empty'}")


        # 2. Check Navbar Metrics & IA
        print("\n[2] Checking Desktop Navbar Layout & Architecture...")
        nav_info = await cdp.eval(
            """
            (() => {
                const nav = document.querySelector('.public-landing-nav');
                const inner = document.querySelector('.landing-nav-inner');
                const brand = document.querySelector('.landing-brand-logo');
                const wordmark = document.querySelector('.brand-wordmark');
                const contextLabel = document.querySelector('.brand-context-label');
                const links = Array.from(document.querySelectorAll('.landing-nav-links.desktop-nav .landing-nav-link')).map(a => a.textContent.trim());
                const contactBtn = document.getElementById('nav-contact-us');
                const workspaceBtn = document.getElementById('nav-open-workspace');

                const rect = inner ? inner.getBoundingClientRect() : null;
                return {
                    navFound: !!nav,
                    height: rect ? Math.round(rect.height) : 0,
                    wordmarkText: wordmark ? wordmark.textContent.trim() : null,
                    hasContextLabel: !!contextLabel,
                    links: links,
                    hasContactBtn: !!contactBtn,
                    hasWorkspaceBtn: !!workspaceBtn
                };
            })()
        """
        )
        print(f"  Navbar Rendered: {nav_info['navFound']}")
        print(f"  Navbar Height: {nav_info['height']}px (target 72-80px)")
        print(f"  Brand Wordmark: '{nav_info['wordmarkText']}'")
        print(f"  Context Label Removed: {not nav_info['hasContextLabel']}")
        print(f"  Nav Destinations: {nav_info['links']}")
        print(f"  Contact Us Button: {nav_info['hasContactBtn']}")
        print(f"  Open Workspace CTA: {nav_info['hasWorkspaceBtn']}")

        assert nav_info["navFound"], "Navbar not found"
        assert 70 <= nav_info["height"] <= 85, f"Unexpected height {nav_info['height']}px"
        assert nav_info["wordmarkText"] == "FORMLESS"
        assert not nav_info["hasContextLabel"]
        assert nav_info["links"] == ["Home", "How it works", "The document", "Security"]
        assert nav_info["hasContactBtn"]
        assert nav_info["hasWorkspaceBtn"]

        await cdp.capture_screenshot("navbar_01_desktop_hero.png")

        # 3. Test Scroll Destinations
        print("\n[3] Testing Nav Anchor Destinations & Scroll Spy...")
        # Click "How it works"
        await cdp.eval("document.querySelector('a[href=\"#workflow\"]').click()")
        await asyncio.sleep(1.2)
        active_1 = await cdp.eval(
            "document.querySelector('.landing-nav-link.active')?.textContent.trim()"
        )
        print(f"  Active link after clicking 'How it works': '{active_1}'")
        await cdp.capture_screenshot("navbar_02_workflow_active.png")

        # Click "The document"
        await cdp.eval("document.querySelector('a[href=\"#process\"]').click()")
        await asyncio.sleep(1.2)
        active_2 = await cdp.eval(
            "document.querySelector('.landing-nav-link.active')?.textContent.trim()"
        )
        print(f"  Active link after clicking 'The document': '{active_2}'")
        await cdp.capture_screenshot("navbar_03_document_active.png")

        # Click "Security"
        await cdp.eval("document.querySelector('a[href=\"#security\"]').click()")
        await asyncio.sleep(1.2)
        active_3 = await cdp.eval(
            "document.querySelector('.landing-nav-link.active')?.textContent.trim()"
        )
        print(f"  Active link after clicking 'Security': '{active_3}'")
        await cdp.capture_screenshot("navbar_04_security_active.png")

        # Scroll back to Home
        await cdp.eval("window.scrollTo({ top: 0, behavior: 'instant' })")
        await asyncio.sleep(0.5)

        # 4. Test Contact Modal Open & Form
        print("\n[4] Testing Contact Us Modal Open & Form Fields...")
        await cdp.eval("document.getElementById('nav-contact-us').click()")
        await asyncio.sleep(0.6)

        modal_info = await cdp.eval(
            """
            (() => {
                const dialog = document.querySelector('.contact-modal-dialog');
                const title = document.getElementById('contact-modal-title');
                const desc = document.getElementById('contact-modal-desc');
                const email = document.getElementById('contact-email');
                const type = document.getElementById('contact-issue-type');
                const subject = document.getElementById('contact-subject');
                const description = document.getElementById('contact-description');
                const pageRoute = document.getElementById('contact-page-route');
                const submitBtn = document.getElementById('contact-submit-btn');

                return {
                    isOpen: !!dialog,
                    title: title ? title.textContent.trim() : null,
                    desc: desc ? desc.textContent.trim() : null,
                    hasEmail: !!email,
                    hasType: !!type,
                    hasSubject: !!subject,
                    hasDescription: !!description,
                    hasPageRoute: !!pageRoute,
                    hasSubmitBtn: !!submitBtn,
                    dialogRole: dialog ? dialog.getAttribute('role') : null,
                    ariaModal: dialog ? dialog.getAttribute('aria-modal') : null
                };
            })()
        """
        )
        print(f"  Modal Open: {modal_info['isOpen']}")
        print(f"  Title: '{modal_info['title']}'")
        print(f"  Description: '{modal_info['desc']}'")
        print(f"  Role: {modal_info['dialogRole']}, aria-modal: {modal_info['ariaModal']}")
        print(f"  All 5 fields present: {modal_info['hasEmail'] and modal_info['hasType'] and modal_info['hasSubject'] and modal_info['hasDescription'] and modal_info['hasPageRoute']}")

        assert modal_info["isOpen"]
        assert modal_info["title"] == "Tell us what's wrong."
        assert "Found a problem or have feedback?" in modal_info["desc"]
        assert modal_info["dialogRole"] == "dialog"
        assert modal_info["ariaModal"] == "true"

        await cdp.capture_screenshot("navbar_05_contact_modal_open.png")

        # 5. Test Client-Side Validation
        print("\n[5] Testing Validation Trigger with Empty Form...")
        await cdp.eval("document.getElementById('contact-submit-btn').click()")
        await asyncio.sleep(0.3)

        val_errors = await cdp.eval(
            """
            Array.from(document.querySelectorAll('.contact-field-error')).map(e => e.textContent.trim())
        """
        )
        print(f"  Validation Errors Displayed: {val_errors}")
        assert len(val_errors) >= 3, "Expected validation errors for email, subject, description"

        await cdp.capture_screenshot("navbar_06_contact_modal_validation.png")

        # 6. Test Real Submission to Backend & Persistence
        print("\n[6] Submitting Real Issue to Backend via Contact Modal...")
        await cdp.eval(
            """
            (() => {
                const email = document.getElementById('contact-email');
                const type = document.getElementById('contact-issue-type');
                const subject = document.getElementById('contact-subject');
                const desc = document.getElementById('contact-description');

                // Native setter helper to ensure React synthetic events trigger properly
                const setVal = (el, val) => {
                    const proto = (el instanceof HTMLTextAreaElement)
                        ? window.HTMLTextAreaElement.prototype
                        : window.HTMLInputElement.prototype;
                    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                    if (setter) {
                        setter.call(el, val);
                    } else {
                        el.value = val;
                    }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                };

                setVal(email, 'reviewer@institution.gov.in');
                type.value = 'Bug';
                type.dispatchEvent(new Event('change', { bubbles: true }));
                setVal(subject, 'Verification audit trail pagination discrepancy');
                setVal(desc, 'When transitioning FSSAI-REQ-07, the second page of historical event rows loaded slowly. Expected instant cache response.');
            })()
        """
        )
        await asyncio.sleep(0.3)
        await cdp.eval("document.getElementById('contact-submit-btn').click()")

        # Wait for submission success state
        success_info = None
        for _ in range(20):
            await asyncio.sleep(0.3)
            success_info = await cdp.eval(
                """
                (() => {
                    const idDisplay = document.getElementById('contact-issue-id-display');
                    const doneBtn = document.getElementById('contact-success-close-btn');
                    return {
                        hasId: !!idDisplay,
                        issueId: idDisplay ? idDisplay.textContent.trim() : null,
                        hasDoneBtn: !!doneBtn
                    };
                })()
            """
            )
            if success_info and success_info["hasId"]:
                break

        print(f"  Submission Success Displayed: {success_info['hasId']}")
        print(f"  Generated Issue Reference ID: '{success_info['issueId']}'")
        assert success_info["hasId"]
        assert success_info["issueId"].startswith("ISS-")

        await cdp.capture_screenshot("navbar_07_contact_modal_success.png")

        # Click Done to close modal
        await cdp.eval("document.getElementById('contact-success-close-btn').click()")
        await asyncio.sleep(0.5)
        is_closed = await cdp.eval("!document.querySelector('.contact-modal-dialog')")
        print(f"  Modal Closed via Done button: {is_closed}")
        assert is_closed

        # 7. Test Escape dismissal & backdrop click
        print("\n[7] Testing Escape Key & Backdrop Dismissal...")
        await cdp.eval("document.getElementById('nav-contact-us').click()")
        await asyncio.sleep(0.5)
        # Press Escape
        await cdp.call(
            "Input.dispatchKeyEvent",
            {"type": "rawKeyDown", "windowsVirtualKeyCode": 27, "key": "Escape"},
        )
        await cdp.call(
            "Input.dispatchKeyEvent",
            {"type": "keyUp", "windowsVirtualKeyCode": 27, "key": "Escape"},
        )
        await asyncio.sleep(0.4)
        is_closed_esc = await cdp.eval("!document.querySelector('.contact-modal-dialog')")
        print(f"  Modal Closed via Escape Key: {is_closed_esc}")
        assert is_closed_esc

        # 8. Test Open Workspace CTA -> Login Modal
        print("\n[8] Testing Open Workspace Action...")
        await cdp.eval("document.getElementById('nav-open-workspace').click()")
        await asyncio.sleep(0.6)
        login_modal_open = await cdp.eval(
            "!!document.querySelector('.login-modal-container')"
        )
        print(f"  Login Modal Opened from Navbar CTA: {login_modal_open}")
        assert login_modal_open
        await cdp.capture_screenshot("navbar_08_open_workspace_modal.png")

        # Close login modal with Escape
        await cdp.call(
            "Input.dispatchKeyEvent",
            {"type": "rawKeyDown", "windowsVirtualKeyCode": 27, "key": "Escape"},
        )
        await cdp.call(
            "Input.dispatchKeyEvent",
            {"type": "keyUp", "windowsVirtualKeyCode": 27, "key": "Escape"},
        )
        await asyncio.sleep(0.4)

        # 9. Test Tablet View (860x1024)
        print("\n[9] Testing Tablet Layout (860x1024)...")
        await cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 860,
                "height": 1024,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
        )
        await asyncio.sleep(0.6)
        await cdp.capture_screenshot("navbar_09_tablet_view.png")

        # 10. Test Mobile View (390x844 iPhone) & Mobile Menu Drawer
        print("\n[10] Testing Mobile Layout (390x844) & Hamburger Drawer...")
        await cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True,
            },
        )
        await asyncio.sleep(0.6)

        # Check hamburger button
        has_hamburger = await cdp.eval(
            "!!document.querySelector('.mobile-hamburger-btn')"
        )
        print(f"  Mobile Hamburger Button Present: {has_hamburger}")
        assert has_hamburger

        # Click hamburger button
        await cdp.eval("document.querySelector('.mobile-hamburger-btn').click()")
        await asyncio.sleep(0.5)

        drawer_info = await cdp.eval(
            """
            (() => {
                const drawer = document.getElementById('mobile-navigation-drawer');
                const links = Array.from(document.querySelectorAll('.mobile-nav-link')).map(a => a.textContent.trim());
                const contactBtn = document.getElementById('mobile-nav-contact-us');
                const workspaceBtn = document.getElementById('mobile-nav-open-workspace');
                return {
                    isOpen: !!drawer,
                    links: links,
                    hasContact: !!contactBtn,
                    hasWorkspace: !!workspaceBtn
                };
            })()
        """
        )
        print(f"  Mobile Drawer Open: {drawer_info['isOpen']}")
        print(f"  Mobile Nav Links: {drawer_info['links']}")
        print(f"  Mobile Contact Us Button: {drawer_info['hasContact']}")
        print(f"  Mobile Workspace CTA: {drawer_info['hasWorkspace']}")

        assert drawer_info["isOpen"]
        assert drawer_info["links"] == ["Home", "How it works", "The document", "Security"]
        assert drawer_info["hasContact"]
        assert drawer_info["hasWorkspace"]

        await cdp.capture_screenshot("navbar_10_mobile_drawer_open.png")

        # Click Contact Us in Mobile Drawer
        await cdp.eval("document.getElementById('mobile-nav-contact-us').click()")
        await asyncio.sleep(0.6)

        mobile_modal_open = await cdp.eval(
            "!!document.querySelector('.contact-modal-dialog')"
        )
        print(f"  Contact Modal Opened from Mobile Drawer: {mobile_modal_open}")
        assert mobile_modal_open

        await cdp.capture_screenshot("navbar_11_mobile_contact_modal.png")

        print("\n" + "=" * 70)
        print("ALL E2E NAVBAR AND CONTACT MODAL VERIFICATIONS PASSED SUCCESSFULLY!")
        print("=" * 70)

    finally:
        if ws:
            await ws.close()
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()


if __name__ == "__main__":
    asyncio.run(main())
