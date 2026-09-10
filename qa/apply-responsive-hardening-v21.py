from pathlib import Path
import re

# 1) Freeze viewport-driven clamp growth once the capped 1440px content canvas +
#    two 48px gutters has reached its maximum effective width (1536px viewport).
css_path = Path("css/v2.css")
css = css_path.read_text(encoding="utf-8")
marker = "/* v2.1 wide-screen fluid cap: viewport-driven clamp values stop growing after 1536px. */"
if marker not in css:
    pattern = re.compile(r"clamp\(([^,\n]+),\s*([0-9]+(?:\.[0-9]+)?)vw,\s*([^)\n]+)\)")

    def repl(match):
        minimum = match.group(1).strip()
        coeff_text = match.group(2)
        maximum = match.group(3).strip()
        coeff = float(coeff_text)
        cap_rem = coeff * 0.96  # coeff * 1536 / 100 / 16
        cap_text = f"{cap_rem:.3f}".rstrip("0").rstrip(".")
        return f"clamp({minimum}, min({coeff_text}vw, {cap_text}rem), {maximum})"

    css, count = pattern.subn(repl, css)
    if count < 20:
        raise SystemExit(f"unexpectedly low vw clamp replacement count: {count}")
    css = css.rstrip() + "\n\n" + marker + "\n"
    css_path.write_text(css, encoding="utf-8")
    print(f"capped {count} viewport-driven clamp values at the 1536px layout ceiling")
else:
    print("wide-screen fluid cap already applied")

# 2) Expand headline containment coverage beyond the seven chapter displays.
qa_path = Path("qa/browser-qa.mjs")
qa = qa_path.read_text(encoding="utf-8")
old_selectors = '''      const selectors = [
        ".profile__display",
        ".foundation__display",
        ".capabilities__display",
        ".ai__display",
        ".work__display",
        ".journey__display",
        ".languages__display"
      ];'''
new_selectors = '''      const selectors = [
        ".opening__name",
        ".identity__title",
        ".profile__display",
        ".foundation__display",
        ".capabilities__display",
        ".ai__display",
        ".work__display",
        ".journey__display",
        ".languages__display",
        ".contact__display",
        ".foundation__closing",
        ".capabilities__bridge",
        ".ai-formula",
        ".work__closing > div",
        ".journey-ending",
        ".case-study__title",
        ".workflow-step h3",
        ".work-case__story h3",
        ".symbioz-grid__story h3",
        ".digital-work__intro h3",
        ".digital-card h4",
        ".journey-event__content h3",
        ".journey-education > h3",
        ".language-row strong"
      ];'''
if old_selectors in qa:
    qa = qa.replace(old_selectors, new_selectors, 1)
elif new_selectors not in qa:
    raise SystemExit("headline selector block not found")

old_measurement = '''        const available = headline.clientWidth;
        return [...headline.querySelectorAll(":scope > span")]
          .map((line, index) => ({
            selector,
            index,
            text: (line.textContent || "").trim(),
            available,
            scrollWidth: line.scrollWidth,
            clientWidth: line.clientWidth
          }))
          .filter(line => line.scrollWidth > available + 2);'''
new_measurement = '''        const available = headline.clientWidth;
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
          .filter(line => line.scrollWidth > available + 2);'''
if old_measurement in qa:
    qa = qa.replace(old_measurement, new_measurement, 1)
elif new_measurement not in qa:
    raise SystemExit("headline measurement block not found")

needle = '''  if (viewport.width <= 1180) {'''
opening_check = '''  const clippedViewportContainers = await page.evaluate(() => {
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
if opening_check not in qa:
    if needle not in qa:
        raise SystemExit("responsive menu checkpoint not found")
    qa = qa.replace(needle, opening_check + needle, 1)

qa_path.write_text(qa, encoding="utf-8")

# 3) Keep QA documentation aligned with the new release gate.
readme_path = Path("qa/README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = readme.replace(
    "- desktop, laptop, tablet, landscape and mobile viewports",
    "- desktop, laptop, tablet, landscape and mobile viewports, plus MacBook 14 (1512×982), MacBook 16 (1728×1117 and 1728×960), Full HD (1920×1080) and QHD (2560×1440) wide-screen checks"
)
readme = readme.replace(
    "- horizontal overflow and editorial headline containment",
    "- horizontal overflow, viewport-locked vertical clipping and broad editorial headline containment"
)
if "1536px layout ceiling" not in readme:
    readme = readme.rstrip() + "\n\nWide-screen fluid sizing rule: `vw`-driven `clamp()` values stop growing after the 1536px viewport layout ceiling (1440px content canvas + 48px gutters per side), so typography cannot continue scaling after the content columns have stopped growing.\n"
readme_path.write_text(readme, encoding="utf-8")
