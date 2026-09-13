from pathlib import Path

css_path = Path("css/v2.css")
css = css_path.read_text()

old = '''/* v2.3.1 final WebKit DE foundation fit */
@media (min-width: 901px) {
  html[lang="de"] .foundation__display {
    font-size: clamp(3.65rem, min(7.5vw, 7.2rem), 7.9rem);
  }
}'''

new = '''/* v2.3.1 final WebKit DE foundation fit */
@media (min-width: 901px) {
  html[lang="de"] .foundation__display {
    max-width: 11.2ch;
    font-size: clamp(3.65rem, min(7.5vw, 7.2rem), 7.9rem);
  }
}'''

if old not in css:
    raise SystemExit("Expected current WebKit foundation block not found")

css_path.write_text(css.replace(old, new, 1))
