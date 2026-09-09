#!/usr/bin/env python3
"""Build tools/ship-playground.html - the modular-ship drydock.

The playground is a single self-contained page, so the part catalogue and
the preset fleet are INLINED into it. That means the shipped .html is a
build product; the sources are

    tools/ship-playground.shell.html   markup, styles, the whole viewer
    tools/gen-ship-parts.py            the part catalogue  (__PARTS_JSON__)
                                       + the shared rules  (__META_JSON__)
    tools/gen-ship-presets.py          the test ships      (__FLEET_JSON__)

Edit the shell (or either generator) and re-run this; never hand-edit the
built ship-playground.html - the next build overwrites it.

Run from tenebris-rs/:
    python tools/build-ship-playground.py [--out PATH]
"""

import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SHELL = os.path.join(HERE, "ship-playground.shell.html")
OUT = os.path.join(HERE, "ship-playground.html")


def generate(script, out_path, *extra):
    """Run one of the tools/gen-*.py generators into a JSON file."""
    subprocess.run([sys.executable, os.path.join(HERE, script),
                    "--json", out_path, *extra],
                   cwd=os.path.dirname(HERE), check=True,
                   stdout=subprocess.DEVNULL)
    with open(out_path) as f:
        return f.read()


def main():
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else OUT
    with tempfile.TemporaryDirectory() as tmp:
        meta_path = os.path.join(tmp, "meta.json")
        parts = generate("gen-ship-parts.py", os.path.join(tmp, "parts.json"),
                         "--meta", meta_path)
        fleet = generate("gen-ship-presets.py", os.path.join(tmp, "fleet.json"))
        meta = open(meta_path).read()

    # sanity: both must parse, and the fleet may only name parts that exist
    catalogue = {p["id"] for p in json.loads(parts)}
    for ship in json.loads(fleet):
        for part in ship["graph"]:
            if part["part"] not in catalogue:
                raise SystemExit("preset %s wants unknown part %r"
                                 % (ship["name"], part["part"]))

    html = open(SHELL, encoding="utf-8").read()
    for token, payload in (("__PARTS_JSON__", parts), ("__FLEET_JSON__", fleet),
                          ("__META_JSON__", meta)):
        if token not in html:
            raise SystemExit("shell is missing %s" % token)
        html = html.replace(token, payload.strip())

    open(out, "w", encoding="utf-8").write(html)
    print("wrote %s  %.1f MB  (%d parts, %d ships)"
          % (out, len(html) / 1e6, len(catalogue), len(json.loads(fleet))))


if __name__ == "__main__":
    main()
