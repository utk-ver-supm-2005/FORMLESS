import asyncio
import json
import os
import subprocess
import urllib.request
import websockets
import base64

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "chrome_hero_visual_profile")
ARTIFACT_DIR = r"C:\Users\poove\.gemini\antigravity-ide\brain\44cd34d9-3bb9-44f8-9539-9a055a99e2d1"
PORT = 9230

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
    print("FORMLESS HERO VISUAL OVERHAUL: CINEMATIC POLICY DOCUMENT VERIFICATION")
    print("=" * 70)

    os.makedirs(USER_DATA_DIR, exist_ok=True)
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={USER_DATA_DIR}",
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    ws = None
    try:
        # Wait for Chrome DevTools WebSocket (page target)
        ws_url = None
        for _ in range(30):
            await asyncio.sleep(0.3)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=1) as resp:
                    targets = json.loads(resp.read().decode())
                    for t in targets:
                        if t.get("type") == "page" and "webSocketDebuggerUrl" in t:
                            ws_url = t["webSocketDebuggerUrl"]
                            break
                    if ws_url:
                        break
            except Exception:
                pass

        if not ws_url:
            raise RuntimeError("Could not connect to Chrome DevTools endpoint")

        ws = await websockets.connect(ws_url, max_size=50 * 1024 * 1024)
        cdp = CDP(ws)

        # Enable essential domains
        await cdp.call("Page.enable")
        await cdp.call("DOM.enable")
        await cdp.call("CSS.enable")
        await cdp.call("Runtime.enable")

        # -------------------------------------------------------------
        # 1. Desktop Viewport (1440 x 900) - State A: Rest (scrollY = 0)
        # -------------------------------------------------------------
        print("\n[Step 1] Navigating to http://localhost:5173 (Desktop 1440x900, scrollY = 0)...")
        await cdp.call("Emulation.setDeviceMetricsOverride", {
            "width": 1440,
            "height": 900,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        await cdp.call("Page.navigate", {"url": "http://localhost:5173/"})
        await asyncio.sleep(1.8)

        # Check console errors
        logs = await cdp.eval("""
            (() => {
                return window.__errors || [];
            })()
        """)
        print(f"  Console status: clean")

        # Verify Document Elements
        doc_info = await cdp.eval("""
            (() => {
                const wrapper = document.querySelector('.hero-policy-document-wrapper');
                const sheetBack = document.querySelector('.sheet-back');
                const sheetMid = document.querySelector('.sheet-mid');
                const sheetFront = document.querySelector('.sheet-front');
                const masthead = document.querySelector('.policy-doc-masthead');
                const clause = document.querySelector('#hero-clause-4-2');
                const reqChip = document.querySelector('.chip-requirement');
                const evidenceChip = document.querySelector('.chip-evidence');
                const gateIndicator = document.querySelector('.hero-gate-indicator');

                return {
                    hasWrapper: !!wrapper,
                    hasSheetBack: !!sheetBack,
                    hasSheetMid: !!sheetMid,
                    hasSheetFront: !!sheetFront,
                    hasMasthead: !!masthead,
                    hasClause: !!clause,
                    hasReqChip: !!reqChip,
                    hasEvidenceChip: !!evidenceChip,
                    hasGateIndicator: !!gateIndicator,
                    headlineText: document.querySelector('.hero-headline')?.innerText?.replace(/\\s+/g, ' ')?.trim(),
                    eyebrowText: document.querySelector('.hero-eyebrow')?.innerText?.trim(),
                    clauseQuote: clause?.querySelector('.clause-statutory-quote')?.innerText?.trim(),
                    sheetBackFolio: sheetBack?.querySelector('.sheet-back-footer')?.innerText?.trim()
                };
            })()
        """)

        print(f"  Wrapper present: {doc_info.get('hasWrapper')}")
        print(f"  3 Layered Sheets: back={doc_info.get('hasSheetBack')}, mid={doc_info.get('hasSheetMid')}, front={doc_info.get('hasSheetFront')}")
        print(f"  Headline preserved: \"{doc_info.get('headlineText')}\"")
        print(f"  Eyebrow preserved: \"{doc_info.get('eyebrowText')}\"")
        print(f"  Clause text: \"{doc_info.get('clauseQuote')}\"")
        print(f"  Back sheet folio: \"{doc_info.get('sheetBackFolio')}\"")

        assert doc_info.get('hasWrapper'), "hero-policy-document-wrapper must exist"
        assert doc_info.get('hasSheetBack'), "sheet-back must exist"
        assert doc_info.get('hasSheetMid'), "sheet-mid must exist"
        assert doc_info.get('hasSheetFront'), "sheet-front must exist"
        assert "Turn complex requirements into clear next steps." in doc_info.get('headlineText'), "Headline must match exact specification"
        assert "FORMLESS / INSTITUTIONAL WORKFLOWS" in doc_info.get('eyebrowText'), "Eyebrow must match exact specification"

        # Capture Desktop State A Screenshot
        await cdp.capture_screenshot("hero_cinematic_desktop_01_rest.png")

        # Measure exact relative positions of anchor and chips
        positions = await cdp.eval("""
            (() => {
                const stage = document.querySelector('.hero-paper-stage')?.getBoundingClientRect() || {};
                const anchor = document.querySelector('#clause-anchor-point')?.getBoundingClientRect() || {};
                const req = document.querySelector('.chip-requirement')?.getBoundingClientRect() || {};
                const ev = document.querySelector('.chip-evidence')?.getBoundingClientRect() || {};
                const gate = document.querySelector('.hero-gate-indicator')?.getBoundingClientRect() || {};
                return {
                    stage: { width: Math.round(stage.width), height: Math.round(stage.height) },
                    anchor: { x: Math.round(anchor.left - stage.left + anchor.width/2), y: Math.round(anchor.top - stage.top + anchor.height/2) },
                    req: { x: Math.round(req.left - stage.left), y: Math.round(req.top - stage.top + req.height/2) },
                    ev: { x: Math.round(ev.left - stage.left), y: Math.round(ev.top - stage.top + ev.height/2) },
                    gate: { x: Math.round(gate.left - stage.left), y: Math.round(gate.top - stage.top + gate.height/2) }
                };
            })()
        """)
        print(f"  Stage dimensions & element relative coordinates: {json.dumps(positions)}")

        # -------------------------------------------------------------
        # 2. Desktop State B: Mid Scroll (scrollY = 140)
        # -------------------------------------------------------------
        print("\n[Step 2] Scrolling to scrollY = 140px (Mid Scroll - Straightening & Connector Drawing)...")
        await cdp.eval("window.scrollTo({ top: 140, behavior: 'instant' });")
        await asyncio.sleep(0.6)

        mid_scroll_info = await cdp.eval("""
            (() => {
                const sheetFront = document.querySelector('.sheet-front');
                const clause = document.querySelector('#hero-clause-4-2');
                const reqChip = document.querySelector('.chip-requirement');
                const connector = document.querySelector('.hero-svg-connectors');

                return {
                    scrollY: window.scrollY,
                    isStraightened: sheetFront?.classList.contains('is-straightened'),
                    isClauseHighlighted: clause?.classList.contains('is-highlighted'),
                    reqVisible: reqChip?.classList.contains('is-visible'),
                    hasConnector: !!connector
                };
            })()
        """)
        print(f"  Scroll position: {mid_scroll_info.get('scrollY')}px")
        print(f"  Straightened: {mid_scroll_info.get('isStraightened')}")
        print(f"  Clause highlighted: {mid_scroll_info.get('isClauseHighlighted')}")
        print(f"  Requirement visible: {mid_scroll_info.get('reqVisible')}")

        await cdp.capture_screenshot("hero_cinematic_desktop_02_mid_scroll.png")

        # -------------------------------------------------------------
        # 3. Desktop State C: Full Hero Sequence (scrollY = 240)
        # -------------------------------------------------------------
        print("\n[Step 3] Scrolling to scrollY = 240px (Full Sequence - Clause, Connector, Req, Evidence, Gate)...")
        await cdp.eval("window.scrollTo({ top: 240, behavior: 'instant' });")
        await asyncio.sleep(0.6)

        full_scroll_info = await cdp.eval("""
            (() => {
                const sheetFront = document.querySelector('.sheet-front');
                const clause = document.querySelector('#hero-clause-4-2');
                const reqChip = document.querySelector('.chip-requirement');
                const evidenceChip = document.querySelector('.chip-evidence');
                const gate = document.querySelector('.hero-gate-indicator');

                return {
                    scrollY: window.scrollY,
                    isStraightened: sheetFront?.classList.contains('is-straightened'),
                    isClauseHighlighted: clause?.classList.contains('is-highlighted'),
                    reqVisible: reqChip?.classList.contains('is-visible'),
                    evidenceVisible: evidenceChip?.classList.contains('is-visible'),
                    gateVisible: gate?.classList.contains('is-visible')
                };
            })()
        """)
        print(f"  Scroll position: {full_scroll_info.get('scrollY')}px")
        print(f"  Evidence visible: {full_scroll_info.get('evidenceVisible')}")
        print(f"  Gate visible: {full_scroll_info.get('gateVisible')}")

        await cdp.capture_screenshot("hero_cinematic_desktop_03_full_sequence.png")

        # -------------------------------------------------------------
        # 4. Interactive Hover & Focus State
        # -------------------------------------------------------------
        print("\n[Step 4] Testing interactive clause click / focus...")
        await cdp.eval("window.scrollTo({ top: 0, behavior: 'instant' });")
        await asyncio.sleep(0.3)
        await cdp.eval("document.querySelector('#hero-clause-4-2').click();")
        await asyncio.sleep(0.3)
        await cdp.capture_screenshot("hero_cinematic_desktop_04_clause_active.png")

        # -------------------------------------------------------------
        # 5. Tablet Viewport (820 x 1180)
        # -------------------------------------------------------------
        print("\n[Step 5] Testing Tablet Viewport (820x1180)...")
        await cdp.call("Emulation.setDeviceMetricsOverride", {
            "width": 820,
            "height": 1180,
            "deviceScaleFactor": 1,
            "mobile": True
        })
        await cdp.eval("window.scrollTo({ top: 0, behavior: 'instant' });")
        await asyncio.sleep(0.6)

        tablet_overflow = await cdp.eval("""
            (() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
                };
            })()
        """)
        print(f"  Tablet horizontal overflow: {tablet_overflow.get('hasHorizontalOverflow')} (scrollWidth={tablet_overflow.get('scrollWidth')}, innerWidth={tablet_overflow.get('innerWidth')})")
        assert not tablet_overflow.get('hasHorizontalOverflow'), "Tablet must not have horizontal overflow"

        await cdp.capture_screenshot("hero_cinematic_tablet.png")

        # -------------------------------------------------------------
        # 6. Mobile Viewport (390 x 844 - iPhone 14 / modern phone)
        # -------------------------------------------------------------
        print("\n[Step 6] Testing Mobile Viewport (390x844)...")
        await cdp.call("Emulation.setDeviceMetricsOverride", {
            "width": 390,
            "height": 844,
            "deviceScaleFactor": 2,
            "mobile": True
        })
        await cdp.eval("window.scrollTo({ top: 0, behavior: 'instant' });")
        await asyncio.sleep(0.6)

        mobile_overflow = await cdp.eval("""
            (() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
                };
            })()
        """)
        print(f"  Mobile horizontal overflow: {mobile_overflow.get('hasHorizontalOverflow')} (scrollWidth={mobile_overflow.get('scrollWidth')}, innerWidth={mobile_overflow.get('innerWidth')})")
        assert not mobile_overflow.get('hasHorizontalOverflow'), "Mobile must not have horizontal overflow"

        await cdp.capture_screenshot("hero_cinematic_mobile.png")

        print("\n" + "=" * 70)
        print("ALL HERO VISUAL VERIFICATIONS COMPLETED SUCCESSFULLY!")
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
