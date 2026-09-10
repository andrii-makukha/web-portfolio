from pathlib import Path

path = Path("css/v2.css")
css = path.read_text()
marker = "/* v2.2.5 work display geometry correction */"
if marker in css:
    raise SystemExit("patch already applied")

css += r'''

/* v2.2.5 work display geometry correction */
@media (min-width: 901px) {
  /* 12ch scaled with the font and kept the semantic phrase permanently ~3% too narrow.
     13ch fixes the actual geometry while preserving the editorial line composition. */
  html[lang="de"] .work__display,
  html[lang="en"] .work__display {
    max-width: 13ch;
    min-width: 0;
    font-size: clamp(3.25rem, 6.15vw, 6rem);
  }
}
'''

path.write_text(css)
print("Applied work display geometry correction")
