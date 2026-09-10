from pathlib import Path

css_path = Path("css/v2.css")
css = css_path.read_text(encoding="utf-8")

old_journey = "font-size: clamp(2.3rem, min(4.7vw, 4.512rem), 5rem);"
new_journey = "font-size: clamp(2.3rem, min(4.5vw, 4.32rem), 4.8rem);"
if old_journey in css:
    css = css.replace(old_journey, new_journey, 1)
elif new_journey not in css:
    raise SystemExit("journey heading font rule not found")

marker = "/* v2.1 wide-screen fluid cap: viewport-driven clamp values stop growing after 1536px. */"
locale_fix = '''/* v2.1 measured German long-word containment */
@media (min-width: 901px) {
  html[lang="de"] .work__closing > div {
    font-size: clamp(3.45rem, min(7.1vw, 6.816rem), 7.4rem);
  }
}

'''
if locale_fix not in css:
    if marker not in css:
        raise SystemExit("v2.1 marker not found")
    css = css.replace(marker, locale_fix + marker, 1)

# Keep the normal 48px page-padding ceiling; only content-dependent scale values need the wide cap.
css = css.replace(
    "--page-pad: clamp(1.25rem, min(3vw, 2.88rem), 3rem);",
    "--page-pad: clamp(1.25rem, 3vw, 3rem);",
    1,
)

css_path.write_text(css, encoding="utf-8")

qa_path = Path("qa/browser-qa.mjs")
qa = qa_path.read_text(encoding="utf-8")

old_headline = '''      return selectors.flatMap(selector => {
        const headline = document.querySelector(selector);
        if (!headline) return [];
        const available = headline.clientWidth;
        const directLines = [...headline.querySelectorAll(":scope > span")];
        const measuredNodes = directLines.length ? directLines : [headline];
        return measuredNodes
          .map((line, index) => ({
            selector,
            index,
            text: (line.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120),
            available,
            scrollWidth: line.scrollWidth,
            clientWidth: line.clientWidth
          }))
          .filter(line => line.scrollWidth > available + 2);
      });'''
new_headline = '''      return selectors.flatMap(selector => [...document.querySelectorAll(selector)].flatMap((headline, elementIndex) => {
        const available = headline.clientWidth;
        const directLines = [...headline.querySelectorAll(":scope > span")];
        const measuredNodes = directLines.length ? directLines : [headline];
        return measuredNodes
          .map((line, index) => ({
            selector,
            elementIndex,
            index,
            text: (line.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120),
            available,
            scrollWidth: line.scrollWidth,
            clientWidth: line.clientWidth
          }))
          .filter(line => line.scrollWidth > available + 2);
      }));'''
if old_headline in qa:
    qa = qa.replace(old_headline, new_headline, 1)
elif new_headline not in qa:
    raise SystemExit("headline measurement block not found")

old_clip = '''  const clippedViewportContainers = await page.evaluate(() => {
    const selectors = [".opening"];
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)]).map(el => ({
      selector: el.className || el.tagName,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      overflowX: getComputedStyle(el).overflowX,
      overflowY: getComputedStyle(el).overflowY
    })).filter(item => item.scrollWidth > item.clientWidth + 2 || item.scrollHeight > item.clientHeight + 2);
  });
  if (clippedViewportContainers.length) {
    recordFailure(scope, "Viewport-locked container would clip its content", clippedViewportContainers);
  }
'''
new_clip = '''  const clippedViewportContent = await page.evaluate(() => {
    const container = document.querySelector(".opening");
    if (!container) return [];
    const outer = container.getBoundingClientRect();
    const selectors = [".opening__eyebrow", ".opening__name-wrap", ".opening__bottom"];
    return selectors.flatMap(selector => [...container.querySelectorAll(selector)].map(el => {
      const box = el.getBoundingClientRect();
      return {
        selector,
        left: Math.round(box.left),
        right: Math.round(box.right),
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
        containerLeft: Math.round(outer.left),
        containerRight: Math.round(outer.right),
        containerTop: Math.round(outer.top),
        containerBottom: Math.round(outer.bottom)
      };
    })).filter(item =>
      item.left < item.containerLeft - 2 ||
      item.right > item.containerRight + 2 ||
      item.top < item.containerTop - 2 ||
      item.bottom > item.containerBottom + 2
    );
  });
  if (clippedViewportContent.length) {
    recordFailure(scope, "Viewport-locked opening content would be clipped", clippedViewportContent);
  }
'''
if old_clip in qa:
    qa = qa.replace(old_clip, new_clip, 1)
elif new_clip not in qa:
    raise SystemExit("opening clipping block not found")

qa_path.write_text(qa, encoding="utf-8")
