from pathlib import Path

path = Path("qa/browser-qa.mjs")
text = path.read_text(encoding="utf-8")

old = '''const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "landscape", width: 844, height: 390, hasTouch: true },
  { name: "mobile", width: 360, height: 800, isMobile: true, hasTouch: true }
];'''

new = '''const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "macbook14", width: 1512, height: 982 },
  { name: "macbook16", width: 1728, height: 1117 },
  { name: "macbook16Browser", width: 1728, height: 960 },
  { name: "fullHd", width: 1920, height: 1080 },
  { name: "qhd", width: 2560, height: 1440 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "landscape", width: 844, height: 390, hasTouch: true },
  { name: "mobile", width: 360, height: 800, isMobile: true, hasTouch: true }
];'''

if old not in text:
    raise SystemExit("viewport block not found")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
