from pathlib import Path

path = Path("css/v2.css")
css = path.read_text()
marker = "/* v2.2.3 final measured overflow correction */"
if marker in css:
    raise SystemExit("patch already applied")

css += r'''

/* v2.2.3 final measured overflow correction */
@media (min-width: 901px) {
  /* Final measured reduction: phrase-width overflow was only ~2–4%. */
  .work__display {
    font-size: clamp(3.25rem, 6.15vw, 6rem);
  }

  html[lang="ru"] .ai__display {
    font-size: clamp(3.45rem, 8vw, 7.6rem);
  }

  html[lang="de"] .capability-row__evidence strong {
    font-size: clamp(2.05rem, 3.25vw, 3.5rem);
  }
}

@media (min-width: 901px) and (max-width: 1180px) {
  html[lang="ru"] .languages__display {
    font-size: clamp(3.2rem, 5.7vw, 4.05rem);
  }
}
'''

path.write_text(css)
print("Applied final measured overflow correction")
