import asyncio
import json
import os
import subprocess
import urllib.request
import websockets
import base64

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "chrome_typography_profile")
ARTIFACT_DIR = r"C:\Users\poove\.gemini\antigravity-ide\brain\44cd34d9-3bb9-44f8-9539-9a055a99e2d1"
PORT = 9229

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
    print("FORMLESS HERO TYPOGRAPHY & RESPONSIVE VERIFICATION")
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

        if not ws_url:
            raise RuntimeError("Could not connect to headless Chrome")

        print(f"Connected to CDP: {ws_url}")

        async with websockets.connect(ws_url, max_size=50_000_000) as ws:
            cdp = CDP(ws)
            await cdp.call("Page.enable")
            await cdp.call("DOM.enable")

            # -------------------------------------------------------------
            # TEST 1: Desktop Viewport (1440 x 900)
            # -------------------------------------------------------------
            print("\n[DESKTOP TEST] Testing at 1440 x 900...")
            await cdp.call("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            await cdp.call("Page.navigate", {"url": "http://localhost:5173/"})
            await asyncio.sleep(2.0)

            desktop_info = await cdp.eval("""(() => {
                const eyebrowEl = document.querySelector('.hero-eyebrow');
                const eyebrowTextEl = document.querySelector('.eyebrow-text');
                const dotEl = document.querySelector('.eyebrow-dot');
                const headlineEl = document.querySelector('.hero-headline');
                const accentEl = document.querySelector('.headline-accent');

                const eyebrowStyle = eyebrowEl ? window.getComputedStyle(eyebrowEl) : null;
                const textStyle = eyebrowTextEl ? window.getComputedStyle(eyebrowTextEl) : null;
                const headlineStyle = headlineEl ? window.getComputedStyle(headlineEl) : null;
                const accentStyle = accentEl ? window.getComputedStyle(accentEl) : null;

                const headlineRect = headlineEl ? headlineEl.getBoundingClientRect() : null;
                const windowWidth = window.innerWidth;

                return {
                    eyebrowText: eyebrowTextEl ? eyebrowTextEl.textContent.trim() : null,
                    hasLeadingDot: !!dotEl,
                    dotVisible: dotEl ? (window.getComputedStyle(dotEl).display !== 'none') : false,
                    eyebrowBg: eyebrowStyle ? eyebrowStyle.backgroundColor : null,
                    eyebrowBorder: eyebrowStyle ? eyebrowStyle.borderWidth : null,
                    eyebrowColor: textStyle ? textStyle.color : null,
                    eyebrowLetterSpacing: textStyle ? textStyle.letterSpacing : null,
                    eyebrowMarginBottom: eyebrowStyle ? eyebrowStyle.marginBottom : null,

                    headlineFullText: headlineEl ? headlineEl.textContent.replace(/\\s+/g, ' ').trim() : null,
                    accentText: accentEl ? accentEl.textContent.trim() : null,
                    accentColor: accentStyle ? accentStyle.color : null,
                    headlineFontSize: headlineStyle ? headlineStyle.fontSize : null,
                    headlineWidth: headlineRect ? Math.round(headlineRect.width) : null,
                    windowWidth: windowWidth,
                    overflowsX: headlineRect ? (headlineRect.right > windowWidth) : false
                };
            })()""")

            print(f"  Eyebrow Label: '{desktop_info['eyebrowText']}'")
            print(f"  Has Leading Dot: {desktop_info['hasLeadingDot']} (visible: {desktop_info['dotVisible']})")
            print(f"  Eyebrow Background: {desktop_info['eyebrowBg']}, Border: {desktop_info['eyebrowBorder']}")
            print(f"  Eyebrow Color: {desktop_info['eyebrowColor']}, Letter Spacing: {desktop_info['eyebrowLetterSpacing']}")
            print(f"  Eyebrow Margin Bottom: {desktop_info['eyebrowMarginBottom']}")
            print(f"  Headline Full Text: '{desktop_info['headlineFullText']}'")
            print(f"  Accent Text: '{desktop_info['accentText']}', Accent Color: {desktop_info['accentColor']}")
            print(f"  Headline Font Size: {desktop_info['headlineFontSize']}, Width: {desktop_info['headlineWidth']}px")

            assert desktop_info["eyebrowText"] == "FORMLESS / INSTITUTIONAL WORKFLOWS", f"Eyebrow mismatch: {desktop_info['eyebrowText']}"
            assert not desktop_info["dotVisible"], "Eyebrow dot should not be visible"
            assert desktop_info["headlineFullText"] == "Turn complex requirements into clear next steps.", f"Headline mismatch: {desktop_info['headlineFullText']}"
            assert desktop_info["accentText"] == "into clear next steps.", f"Accent mismatch: {desktop_info['accentText']}"
            assert not desktop_info["overflowsX"], "Headline overflows horizontal viewport!"

            await cdp.capture_screenshot("hero_typography_desktop.png")

            # -------------------------------------------------------------
            # TEST 2: Tablet Viewport (768 x 1024)
            # -------------------------------------------------------------
            print("\n[TABLET TEST] Testing at 768 x 1024...")
            await cdp.call("Emulation.setDeviceMetricsOverride", {
                "width": 768,
                "height": 1024,
                "deviceScaleFactor": 1,
                "mobile": True
            })
            await asyncio.sleep(0.5)

            tablet_info = await cdp.eval("""(() => {
                const headlineEl = document.querySelector('.hero-headline');
                const rect = headlineEl ? headlineEl.getBoundingClientRect() : null;
                const windowWidth = window.innerWidth;
                const style = headlineEl ? window.getComputedStyle(headlineEl) : null;
                return {
                    fontSize: style ? style.fontSize : null,
                    width: rect ? Math.round(rect.width) : null,
                    overflowsX: rect ? (rect.right > windowWidth) : false,
                    text: headlineEl ? headlineEl.textContent.replace(/\\s+/g, ' ').trim() : null
                };
            })()""")

            print(f"  Tablet Headline: '{tablet_info['text']}'")
            print(f"  Tablet Font Size: {tablet_info['fontSize']}, Width: {tablet_info['width']}px, Overflows: {tablet_info['overflowsX']}")
            assert not tablet_info["overflowsX"], "Headline overflows on tablet width!"
            assert tablet_info["text"] == "Turn complex requirements into clear next steps."

            await cdp.capture_screenshot("hero_typography_tablet.png")

            # -------------------------------------------------------------
            # TEST 3: Mobile Viewport (390 x 844)
            # -------------------------------------------------------------
            print("\n[MOBILE TEST] Testing at 390 x 844 (iPhone 14/15 form factor)...")
            await cdp.call("Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            })
            await asyncio.sleep(0.5)

            mobile_info = await cdp.eval("""(() => {
                const headlineEl = document.querySelector('.hero-headline');
                const eyebrowEl = document.querySelector('.hero-eyebrow');
                const headlineRect = headlineEl ? headlineEl.getBoundingClientRect() : null;
                const eyebrowRect = eyebrowEl ? eyebrowEl.getBoundingClientRect() : null;
                const windowWidth = window.innerWidth;
                const headlineStyle = headlineEl ? window.getComputedStyle(headlineEl) : null;

                return {
                    headlineText: headlineEl ? headlineEl.textContent.replace(/\\s+/g, ' ').trim() : null,
                    eyebrowText: eyebrowEl ? eyebrowEl.textContent.trim() : null,
                    fontSize: headlineStyle ? headlineStyle.fontSize : null,
                    headlineWidth: headlineRect ? Math.round(headlineRect.width) : null,
                    headlineOverflowsX: headlineRect ? (headlineRect.right > windowWidth) : false,
                    eyebrowOverflowsX: eyebrowRect ? (eyebrowRect.right > windowWidth) : false,
                    windowWidth: windowWidth
                };
            })()""")

            print(f"  Mobile Eyebrow: '{mobile_info['eyebrowText']}', Overflows: {mobile_info['eyebrowOverflowsX']}")
            print(f"  Mobile Headline: '{mobile_info['headlineText']}'")
            print(f"  Mobile Font Size: {mobile_info['fontSize']}, Width: {mobile_info['headlineWidth']}px, Overflows: {mobile_info['headlineOverflowsX']}")

            assert mobile_info["eyebrowText"] == "FORMLESS / INSTITUTIONAL WORKFLOWS"
            assert mobile_info["headlineText"] == "Turn complex requirements into clear next steps."
            assert not mobile_info["headlineOverflowsX"], "Headline overflows on mobile width!"
            assert not mobile_info["eyebrowOverflowsX"], "Eyebrow overflows on mobile width!"

            await cdp.capture_screenshot("hero_typography_mobile.png")

            print("\n" + "=" * 70)
            print("DESKTOP, TABLET, AND MOBILE HERO TYPOGRAPHY CHECKS ALL PASSED!")
            print("=" * 70)

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
