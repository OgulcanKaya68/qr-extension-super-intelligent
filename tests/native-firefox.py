"""Echter Firefox-Test mit lokalem Demoauftritt und separatem Wegwerfprofil.

Aufruf nach dem Firefox-Build:
    python3 tests/native-firefox.py --driver /pfad/zu/geckodriver

Benötigt macOS, Firefox und einen vorhandenen Mozilla-geckodriver. Installiert
nichts. Ergebnisse bleiben im ignorierten Ordner test-results/native-firefox.
Der Kopiertest ersetzt die Zwischenablage durch einen eigenen harmlosen Demo-QR.
Vorhandene Zwischenablageinhalte werden weder gelesen noch gespeichert.

Mozilla-Quellen:
https://firefox-source-docs.mozilla.org/testing/geckodriver/Usage.html#standalone
https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html#allow-system-access
https://bugzilla.mozilla.org/show_bug.cgi?id=2060476
https://raw.githubusercontent.com/mozilla/gecko-dev/master/widget/nsIClipboard.idl
"""

import argparse
import base64
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
from threading import Thread
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.error
import urllib.request
import zipfile


PROJECT = Path(__file__).resolve().parents[1]
ADDON_ID = "qr-extension-super-intelligent@ogulcankaya68"
COLORS = {"#183b31", "#d89a27", "#4169b1", "#e7dacc"}
LOGO = b'''<svg xmlns="http://www.w3.org/2000/svg" width="120" height="64" viewBox="0 0 120 64"><rect width="120" height="64" rx="12" fill="#183b31"/><path d="M15 20h28v8H24v5h19v18H15v-8h19v-4H15zM57 20h8v31h-8zm14 0h28v8H80v5h19v18H71v-8h19v-4H71z" fill="#e7dacc"/></svg>'''
PAGE = '''<!doctype html><html lang="de"><meta charset="utf-8">
<title>SI – lokale Testseite</title><style>
html,body{margin:0;background:#e7dacc;color:#183b31;font:18px system-ui}
header{padding:20px;background:#183b31}header img{display:block;width:120px;height:64px}
main{padding:22px;display:grid;grid-template-columns:repeat(2,220px);gap:16px}
section{height:90px;padding:16px;color:#183b31;background:#d89a27}
section:nth-child(2n){background:#4169b1;color:#e7dacc}
</style><header><a href="/" rel="home"><img src="/si-logo.svg" alt="SI Demo Logo" class="brand-logo"></a></header>
<main><section>Eigene SI Demo</section><section>Lokaler Test</section>
<section>Vier CSS-Farben</section><section>Keine fremde Marke</section></main></html>'''.encode()


class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        is_logo = self.path.split("?", 1)[0] == "/si-logo.svg"
        body = LOGO if is_logo else PAGE
        self.send_response(200)
        self.send_header("Content-Type", "image/svg+xml" if is_logo else "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        # Das Fixtureprotokoll würde nur redundante lokale Test-URLs enthalten.
        return


def free_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def wait_until(check, label, timeout=20):
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            value = check()
            if value:
                return value
        except (ConnectionError, OSError, urllib.error.URLError) as error:
            last_error = str(error)
        time.sleep(0.1)
    raise TimeoutError(f"Zeitüberschreitung: {label}" + (f"; letzter Fehler: {last_error}" if last_error else ""))


def port_open(port):
    with socket.socket() as client:
        return client.connect_ex(("127.0.0.1", port)) == 0


class FirefoxTest:
    def __init__(self, args, run):
        self.args, self.run = args, run
        self.profile = run / "profile"
        self.downloads = run / "downloads"
        self.profile.mkdir()
        self.downloads.mkdir()
        self.port, self.marionette_port = free_port(), free_port()
        while self.port == self.marionette_port:
            self.marionette_port = free_port()
        self.driver = None
        self.firefox_pid = None
        self.session = None
        self.log = None
        self.cleanup_errors = []

    def request(self, path, data=None, method=None):
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=json.dumps(data).encode() if data is not None else None,
            headers={"Content-Type": "application/json"}, method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                return json.load(response)["value"]
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise RuntimeError(f"WebDriver {path}: {detail}") from error

    def command(self, path, data=None):
        return self.request(f"/session/{self.session}{path}", data)

    def execute(self, script):
        return self.command("/execute/sync", {"script": script, "args": []})

    def popup(self, body):
        # Nur der Extension-Popup-Frame wird angesprochen, niemals die Testseite.
        frame_script = """(async()=>{try{const value=await(async()=>{BODY})();sendAsyncMessage('SI:NativeProof',{ok:true,value});}catch(error){sendAsyncMessage('SI:NativeProof',{ok:false,error:String(error)});}})();""".replace("BODY", body)
        script = """const done=arguments[arguments.length-1];
const browser=document.querySelector('browser.webextension-popup-browser');
if(!browser){done({ok:false,error:'Popup fehlt'});return;}
const mm=browser.messageManager;
const timer=setTimeout(()=>{mm.removeMessageListener('SI:NativeProof',listener);done({ok:false,error:'Popup-Antwort fehlt'});},15000);
function listener(message){clearTimeout(timer);mm.removeMessageListener('SI:NativeProof',listener);done(message.data);}
mm.addMessageListener('SI:NativeProof',listener);
mm.loadFrameScript('data:application/javascript,'+encodeURIComponent(SOURCE),false);""".replace("SOURCE", json.dumps(frame_script))
        result = self.command("/execute/async", {"script": script, "args": []})
        if not result.get("ok"):
            raise RuntimeError(result.get("error", "Popupprüfung fehlgeschlagen"))
        return result.get("value")

    def click(self, selector):
        element = self.command("/element", {"using": "css selector", "value": selector})
        key = element["element-6066-11e4-a52e-4f735466cecf"]
        self.command(f"/element/{key}/click", {})

    def start(self):
        self.profile.joinpath("user.js").write_text(
            f'user_pref("marionette.port",{self.marionette_port});\n'
            'user_pref("browser.shell.checkDefaultBrowser",false);\n', encoding="utf-8")
        self.log = (self.run / "geckodriver.log").open("w", encoding="utf-8")
        self.driver = subprocess.Popen([
            str(self.args.driver), "--host", "127.0.0.1", "--port", str(self.port),
            "--allow-system-access", "--connect-existing", "--marionette-port", str(self.marionette_port),
        ], stdout=self.log, stderr=subprocess.STDOUT)
        # LaunchServices umgeht den dokumentierten Direktstartfehler auf macOS 27.
        subprocess.run([
            "open", "-n", "-a", str(self.args.firefox_app), "--args", "-no-remote",
            "-headless", "-marionette", "-remote-allow-system-access",
            "-profile", str(self.profile), "about:blank",
        ], check=True)
        wait_until(lambda: port_open(self.port), "geckodriver-Port")
        wait_until(lambda: port_open(self.marionette_port), "isolierter Firefox-Prozess")
        session = self.request("/session", {"capabilities": {"alwaysMatch": {"browserName": "firefox"}}})
        self.session = session["sessionId"]
        capabilities = session["capabilities"]
        if Path(capabilities["moz:profile"]).resolve() != self.profile.resolve():
            raise RuntimeError("Firefox verwendet nicht das angeforderte Testprofil")
        self.firefox_pid = capabilities["moz:processID"]
        return capabilities

    def snapshot(self, name):
        script = """const done=arguments[arguments.length-1];
const b=document.querySelector('browser.webextension-popup-browser');const r=b.getBoundingClientRect();
b.browsingContext.currentWindowGlobal.drawSnapshot(new DOMRect(0,0,r.width,r.height),1,'rgb(255,255,255)').then(image=>{
const c=document.createElementNS('http://www.w3.org/1999/xhtml','canvas');c.width=r.width;c.height=r.height;
c.getContext('2d').drawImage(image,0,0);done({ok:true,png:c.toDataURL('image/png').split(',')[1]});
}).catch(error=>done({ok:false,error:String(error)}));"""
        result = self.command("/execute/async", {"script": script, "args": []})
        if not result["ok"]:
            raise RuntimeError(result["error"])
        (self.run / name).write_bytes(base64.b64decode(result["png"]))

    def close(self):
        if self.session:
            try:
                self.request(f"/session/{self.session}", method="DELETE")
            except (RuntimeError, OSError, urllib.error.URLError) as error:
                self.cleanup_errors.append(f"WebDriver-Sitzung: {error}")
        # --connect-existing lässt Firefox nach DELETE laufen. Nur eigene,
        # anhand des Testprofils identifizierte Prozesse werden beendet.
        pids = [self.firefox_pid] if self.firefox_pid else []
        if not pids:
            listing = subprocess.run(["ps", "-ax", "-o", "pid=,command="], capture_output=True, text=True, check=False)
            if listing.returncode:
                self.cleanup_errors.append("Eigener Firefox-Prozess konnte nicht ermittelt werden")
            else:
                binary = str(self.args.firefox_app / "Contents/MacOS/firefox")
                pids = [int(line.strip().split(None, 1)[0]) for line in listing.stdout.splitlines()
                        if binary in line and str(self.profile) in line]
        for pid in pids:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                print("Eigener Firefox-Testprozess war bereits beendet.")
            except OSError as error:
                self.cleanup_errors.append(f"Eigener Firefox-Prozess: {error}")
        if self.driver:
            self.driver.terminate()
            try:
                self.driver.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.driver.kill()
                self.driver.wait(timeout=5)
                self.cleanup_errors.append("Testtreiber musste zwangsweise beendet werden")
        if self.log:
            self.log.close()
        if port_open(self.marionette_port):
            try:
                wait_until(lambda: not port_open(self.marionette_port), "Firefox-Bereinigung", timeout=5)
            except TimeoutError as error:
                self.cleanup_errors.append(str(error))


def check(browser, target):
    archive = browser.run / "extension.xpi"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
        for path in sorted((PROJECT / "build/firefox").rglob("*")):
            if path.is_file():
                package.write(path, path.relative_to(PROJECT / "build/firefox"))
    assert browser.command("/moz/addon/install", {"path": str(archive), "temporary": True}) == ADDON_ID
    browser.command("/url", {"url": target})
    browser.command("/moz/context", {"context": "chrome"})
    browser.execute('Services.prefs.setStringPref("browser.download.dir",' + json.dumps(str(browser.downloads)) + ''');
Services.prefs.setIntPref("browser.download.folderList",2);
Services.prefs.setBoolPref("browser.download.useDownloadDir",true);
Services.prefs.setBoolPref("browser.download.always_ask_before_handling_new_types",false);''')
    browser.click("#unified-extensions-button")
    browser.click(f'toolbarbutton[data-extensionid="{ADDON_ID}"].unified-extensions-item-action-button')
    wait_until(lambda: browser.execute('return !!document.querySelector("browser.webextension-popup-browser")'), "Action-Popup")
    wait_until(lambda: browser.popup("return !content.document.querySelector('#download-png').disabled;"), "QR-Vorschau")
    wait_until(lambda: browser.popup("return content.document.querySelectorAll('#palette-list button').length===5;"), "vier Seitenfarben und Schwarz")
    proof = browser.popup("""const d=content.document;return {url:d.querySelector('#url').value,
swatches:[...d.querySelectorAll('#palette-list button')].map(x=>({color:x.dataset.color||x.title||x.getAttribute('aria-label'),css:x.style.backgroundColor})),
images:[...d.querySelectorAll('#qr-preview img')].map(x=>({width:x.naturalWidth,height:x.naturalHeight})),
title:d.querySelector('h1').innerText};""")
    assert proof["url"] == target, proof
    assert len(proof["swatches"]) == 5, proof
    assert {swatch["color"].lower() for swatch in proof["swatches"]} == COLORS | {"#000000"}, proof
    assert any(image["width"] == 1024 and image["height"] == 1024 for image in proof["images"]), proof
    browser.snapshot("popup-vor-logo.png")
    browser.popup("const d=content.document;d.querySelector('#logo-details').open=true;d.querySelector('#logo-from-page').click();return true;")
    wait_until(lambda: browser.popup("const d=content.document;return !d.querySelector('#logo-preview').hidden||!!d.querySelector('#logo-candidates button');"), "Seitenlogo oder Logoauswahl")
    browser.popup("const d=content.document;if(d.querySelector('#logo-preview').hidden)d.querySelector('#logo-candidates button').click();return true;")
    logo = wait_until(lambda: browser.popup("const d=content.document;const x=d.querySelector('#logo-preview');return !x.hidden&&x.complete&&x.naturalWidth>0&&!d.querySelector('#download-png').disabled?{width:x.naturalWidth,height:x.naturalHeight,message:d.querySelector('#logo-message').textContent}:false;"), "lokal übernommenes Seitenlogo")
    browser.snapshot("popup-mit-seitenlogo.png")
    browser.popup("content.document.querySelector('#copy-image').click();return true;")
    copied = wait_until(lambda: browser.popup("const x=content.document.querySelector('#status');return /kopiert|copied/i.test(x.textContent)&&!x.classList.contains('is-error')?x.textContent:false;"), "erfolgreicher Bild-Kopiervorgang")
    # Ausschließlich Formatinformation NACH dem Schreibvorgang, niemals Nutzerdaten.
    clipboard_png = browser.execute("return Services.clipboard.hasDataMatchingFlavors(['image/png'],Ci.nsIClipboard.kGlobalClipboard);")
    assert clipboard_png, "Die Zwischenablage enthält nach dem Kopieren kein PNG-Format"
    browser.popup("content.document.querySelector('#download-png').click();return true;")
    wait_until(lambda: list(browser.downloads.glob("*.png")), "PNG-Download")
    browser.popup("content.document.querySelector('#download-svg').click();return true;")
    wait_until(lambda: list(browser.downloads.glob("*.svg")), "SVG-Download")
    downloads = [{"name": path.name, "bytes": path.stat().st_size} for path in sorted(browser.downloads.iterdir())]
    assert len(downloads) == 2 and all(item["bytes"] > 100 for item in downloads), downloads
    browser.snapshot("popup-nach-export.png")
    return {"automaticUrl": proof, "pageLogo": logo, "clipboard": {"pngFormat": clipboard_png, "status": copied, "previousContentsRead": False}, "downloads": downloads, "targetUrl": target}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--driver", type=Path, required=True, help="Pfad zu vorhandenem Mozilla-geckodriver")
    parser.add_argument("--firefox-app", type=Path, default=Path("/Applications/Firefox.app"))
    args = parser.parse_args()
    args.driver = args.driver.resolve()
    args.firefox_app = args.firefox_app.resolve()
    if sys.platform != "darwin":
        parser.error("Dieser native Test verwendet macOS LaunchServices")
    if not args.driver.is_file() or not (PROJECT / "build/firefox/manifest.json").is_file():
        parser.error("geckodriver oder Firefox-Build fehlt; zuerst Build erstellen")
    parent = PROJECT / "test-results/native-firefox"
    parent.mkdir(parents=True, exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix="run-", dir=parent))
    fixture = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    fixture_thread = Thread(target=fixture.serve_forever, daemon=True)
    fixture_thread.start()
    target = f"http://127.0.0.1:{fixture.server_port}/projekt/unterseite?demo=si&test=1#abschnitt"
    browser = FirefoxTest(args, run)
    result = {"passed": False, "artifacts": run.relative_to(PROJECT).as_posix()}
    print("Der Kopiertest schreibt ausschließlich den eigenen lokalen Demo-QR in die Zwischenablage.", flush=True)
    try:
        capabilities = browser.start()
        result.update({"browser": capabilities["browserVersion"], "driver": capabilities["moz:geckodriverVersion"]})
        result["checks"] = check(browser, target)
        result["passed"] = True
    except Exception as error:
        result["error"] = str(error).replace(str(run), "<testlauf>")
        print(f"Native Firefox-Prüfung fehlgeschlagen: {result['error']}", file=sys.stderr)
        if browser.session:
            try:
                browser.snapshot("popup-bei-fehler.png")
            except (RuntimeError, OSError, urllib.error.URLError) as snapshot_error:
                result["failureScreenshotError"] = str(snapshot_error).replace(str(run), "<testlauf>")
    finally:
        browser.close()
        fixture.shutdown()
        fixture.server_close()
        fixture_thread.join(timeout=5)
        result["cleanupErrors"] = browser.cleanup_errors
        if browser.cleanup_errors:
            result["passed"] = False
        (run / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"passed": result["passed"], "result": (run / "result.json").relative_to(PROJECT).as_posix()}, ensure_ascii=False))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
