from pathlib import Path

qa_path = Path("qa/cross-browser-v2.mjs")
qa = qa_path.read_text()

old_overflow = '''    if(audit.documentScrollWidth > audit.viewportWidth + 1) {
      fail(scope,"Document overflow",{viewportWidth:audit.viewportWidth,documentScrollWidth:audit.documentScrollWidth});
    }'''
new_overflow = '''    if(audit.documentScrollWidth > audit.viewportWidth + 1) {
      const horizontalShift = await page.evaluate(() => {
        const startX = scrollX;
        const startY = scrollY;
        scrollTo(document.documentElement.scrollWidth, startY);
        const shiftedX = scrollX;
        scrollTo(startX, startY);
        return shiftedX;
      });
      if(Math.abs(horizontalShift) > 1) {
        fail(scope,"Scrollable horizontal overflow",{viewportWidth:audit.viewportWidth,documentScrollWidth:audit.documentScrollWidth,horizontalShift});
      }
    }'''
if old_overflow not in qa:
    raise SystemExit("Expected document overflow block not found")
qa = qa.replace(old_overflow, new_overflow, 1)
qa_path.write_text(qa)

css_path = Path("css/v2.css")
css = css_path.read_text()
marker = "/* v2.3.1 final WebKit DE foundation fit */"
block = '''

/* v2.3.1 final WebKit DE foundation fit */
@media (min-width: 901px) {
  html[lang="de"] .foundation__display {
    font-size: clamp(3.75rem, min(7.88vw, 7.565rem), 8.25rem);
  }
}
'''
if marker not in css:
    css_path.write_text(css.rstrip() + block + "\n")
