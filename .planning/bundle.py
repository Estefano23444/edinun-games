#!/usr/bin/env python3
"""Re-empaquetar los .jsx editables en el bloque <script type=\"text/babel\">
de index.html y EDINUN GAMES.html.

Mantiene los dos HTML idénticos. Pensado para correrse manualmente tras
editar cualquier .jsx (logo, characters, screens, game-screens, app).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSX_FILES = ["logo.jsx", "characters.jsx", "screens.jsx", "game-screens.jsx", "app.jsx"]
HTML_FILES = ["index.html", "EDINUN GAMES.html"]

bundle = "\n".join((ROOT / f).read_text(encoding="utf-8") for f in JSX_FILES)

# Marcador exacto: <script type="text/babel" data-presets="react"> ... </script>
pattern = re.compile(
    r'(<script type="text/babel" data-presets="react">)(.*?)(</script>)',
    re.DOTALL,
)

for html in HTML_FILES:
    p = ROOT / html
    src = p.read_text(encoding="utf-8")
    if not pattern.search(src):
        raise SystemExit(f"No se encontró el bloque <script babel> en {html}")
    new = pattern.sub(lambda m: f"{m.group(1)}\n{bundle}\n{m.group(3)}", src, count=1)
    p.write_text(new, encoding="utf-8")
    print(f"  OK {html} actualizado ({len(new)} bytes)")

print("Bundle listo.")
