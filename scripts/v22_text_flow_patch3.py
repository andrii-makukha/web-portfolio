from pathlib import Path

MARKER = "/* v2.2.2 residual text-flow corrections */"
css_path = Path("css/v2.css")
css = css_path.read_text(encoding="utf-8")

if MARKER not in css:
    css += r'''

/* v2.2.2 residual text-flow corrections */
@media (min-width: 901px) {
  /* Measured against the real work column: keep conjunction+verb phrases intact without overflow. */
  .work__display {
    font-size: clamp(3.35rem, 6.4vw, 6.2rem);
  }

  html[lang="de"] .capability-row__evidence strong {
    font-size: clamp(2.05rem, 3.35vw, 3.6rem);
  }

  html[lang="en"] .ai__display {
    font-size: clamp(3.55rem, 7.7vw, 7.45rem);
  }

  html[lang="en"] .ai__display > span:nth-child(2),
  html[lang="en"] .ai__display > span:last-child,
  html[lang="ru"] .ai__display > span:nth-child(2) {
    white-space: nowrap;
  }
}

@media (min-width: 901px) and (max-width: 1180px) {
  html[lang="ru"] .capabilities__display {
    font-size: clamp(3.15rem, 6.2vw, 4.6rem);
  }

  html[lang="ru"] .work__display {
    font-size: clamp(3.05rem, 6vw, 4.45rem);
  }
}

@media (max-width: 560px) {
  html[lang="ru"] .contact__display {
    font-size: clamp(2.5rem, 9.2vw, 4.2rem);
  }

  html[lang="de"] .work__closing > div {
    font-size: clamp(1.9rem, 8.5vw, 3.3rem);
  }
}
'''
    css_path.write_text(css, encoding="utf-8")

print("v2.2.2 residual text-flow corrections applied")
