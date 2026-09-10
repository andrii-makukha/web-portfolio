from pathlib import Path

path = Path("css/v2.css")
css = path.read_text()
marker = "/* v2.2.4 DE/EN work phrase fit */"
if marker in css:
    raise SystemExit("patch already applied")

css += r'''

/* v2.2.4 DE/EN work phrase fit */
@media (min-width: 901px) {
  /* Measured fit for the semantic conjunction+verb phrase on desktop columns. */
  html[lang="de"] .work__display,
  html[lang="en"] .work__display {
    font-size: clamp(3.12rem, 5.92vw, 5.8rem);
  }
}
'''

path.write_text(css)
print("Applied DE/EN work phrase fit correction")
