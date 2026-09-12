from pathlib import Path

qa_path = Path("qa/cross-browser-v2.mjs")
qa = qa_path.read_text()

old_overflow = '''      if(Math.abs(horizontalShift) > 1) {
        fail(scope,"Scrollable horizontal overflow",{viewportWidth:audit.viewportWidth,documentScrollWidth:audit.documentScrollWidth,horizontalShift});
      }'''
new_overflow = '''      if(Math.abs(horizontalShift) > 1) {
        const diagnostics = await page.evaluate(() => {
          const vw = innerWidth;
          const offenders = [...document.querySelectorAll("body *")].map((el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return {
              tag: el.tagName,
              id: el.id || "",
              className: typeof el.className === "string" ? el.className : "",
              left: Math.round(r.left * 10) / 10,
              right: Math.round(r.right * 10) / 10,
              width: Math.round(r.width * 10) / 10,
              clientWidth: el.clientWidth,
              scrollWidth: el.scrollWidth,
              overflowX: s.overflowX,
              position: s.position,
              text: (el.textContent || "").trim().replace(/\\s+/g," ").slice(0,90)
            };
          }).filter((x) => x.right > vw + 1 || x.left < -1 || x.scrollWidth > x.clientWidth + 2)
            .sort((a,b) => Math.max(b.right-vw,b.scrollWidth-b.clientWidth) - Math.max(a.right-vw,a.scrollWidth-a.clientWidth))
            .slice(0,20);

          const style = document.createElement("style");
          style.textContent = "*::before,*::after{content:none!important}";
          document.head.appendChild(style);
          const withoutPseudoScrollWidth = document.documentElement.scrollWidth;
          style.remove();

          return { offenders, withoutPseudoScrollWidth };
        });
        fail(scope,"Scrollable horizontal overflow",{viewportWidth:audit.viewportWidth,documentScrollWidth:audit.documentScrollWidth,horizontalShift,...diagnostics});
      }'''
if old_overflow not in qa:
    raise SystemExit("Expected scrollable overflow block not found")
qa = qa.replace(old_overflow, new_overflow, 1)
qa_path.write_text(qa)

css_path = Path("css/v2.css")
css = css_path.read_text()
old_css = '''/* v2.3.1 final WebKit DE foundation fit */
@media (min-width: 901px) {
  html[lang="de"] .foundation__display {
    font-size: clamp(3.75rem, min(7.88vw, 7.565rem), 8.25rem);
  }
}'''
new_css = '''/* v2.3.1 final WebKit DE foundation fit */
@media (min-width: 901px) {
  html[lang="de"] .foundation__display {
    font-size: clamp(3.7rem, min(7.7vw, 7.392rem), 8.1rem);
  }
}'''
if old_css not in css:
    raise SystemExit("Expected WebKit foundation calibration not found")
css_path.write_text(css.replace(old_css, new_css, 1))
