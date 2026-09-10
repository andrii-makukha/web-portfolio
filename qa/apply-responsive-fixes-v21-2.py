from pathlib import Path

path = Path("css/v2.css")
css = path.read_text(encoding="utf-8")
marker = "/* v2.1 wide-screen fluid cap: viewport-driven clamp values stop growing after 1536px. */"
block = '''/* v2.1 locale-aware long-string containment */
@media (min-width: 901px) {
  html[lang="de"] .work__closing > div {
    max-width: 15ch;
  }

  html[lang="de"] .workflow-step h3 {
    font-size: clamp(3.5rem, min(7.85vw, 7.536rem), 7.85rem);
  }

  html[lang="ru"] .workflow-step h3 {
    font-size: clamp(3.25rem, min(6.65vw, 6.384rem), 6.8rem);
  }
}

@media (min-width: 561px) and (max-width: 900px) {
  html[lang="ru"] .workflow-step h3 {
    font-size: clamp(2.8rem, 9vw, 4.15rem);
  }
}

'''
if block not in css:
    if marker not in css:
        raise SystemExit("wide-screen marker not found")
    css = css.replace(marker, block + marker, 1)

path.write_text(css, encoding="utf-8")
