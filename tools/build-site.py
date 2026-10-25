"""Inline the brand SVGs into site/index.html and build experiments/glyph-pit.html
(from experiments/glyph-pit.js + tools/glyph-pit.template.html).

Run from the repo root:  python3 tools/build-site.py
"""
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def svg(name):
    t = (ROOT / "assets" / name).read_text()
    for c in ("#E1DDD1", "#EAEAEA", "#F5F4F3"):
        t = t.replace(c, "currentColor")
    t = t.replace("#C31F0D", "var(--red)")
    t = re.sub(r"\s*\n\s*", " ", t).strip()
    return re.sub(r'<svg width="[\d.]+" height="[\d.]+"', '<svg aria-hidden="true" focusable="false"', t)

SVG = {k: svg(v) for k, v in {
    "qp": "glyph-qp.svg", "eq": "glyph-eq.svg", "bookmark": "bookmark.svg",
    "logo": "logo-lockup.svg", "lab": "lab-mark.svg"}.items()}
blob = json.dumps(SVG, ensure_ascii=False)

site = ROOT / "site" / "index.html"
html = site.read_text()
html = re.sub(r"const SVG = (/\*__SVG__\*/)?\{.*?\};\n", lambda m: "const SVG = /*__SVG__*/" + blob + ";\n", html, count=1, flags=re.S)
site.write_text(html)

pit = (ROOT / "experiments" / "glyph-pit.js").read_text()
tpl = (ROOT / "tools" / "glyph-pit.template.html").read_text()
from urllib.parse import quote
def data_uri(name):
    svg_text = (ROOT / "site" / "assets" / name).read_text()
    return "data:image/svg+xml;charset=utf-8," + quote(svg_text, safe="")
out = (tpl.replace("/*__GLYPH_PIT__*/", pit).replace("/*__SVG__*/{}", blob)
          .replace("/*__RUNNER__*/", data_uri("runner-cream.svg")).replace("/*__ROSE__*/", data_uri("rose-bloom.svg")))
(ROOT / "experiments" / "glyph-pit.html").write_text(out)
print("built site/index.html and experiments/glyph-pit.html")
