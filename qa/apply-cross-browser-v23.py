from pathlib import Path

css_path = Path("css/v2.css")
css = css_path.read_text()

old_foundation = '''/* v2.3.1 final WebKit DE foundation fit */
@media (min-width: 901px) {
  html[lang="de"] .foundation__display {
    font-size: clamp(3.7rem, min(7.7vw, 7.392rem), 8.1rem);
  }
}'''
new_foundation = '''/* v2.3.1 final WebKit DE foundation fit */
@media (min-width: 901px) {
  html[lang="de"] .foundation__display {
    font-size: clamp(3.65rem, min(7.5vw, 7.2rem), 7.9rem);
  }
}'''

if old_foundation not in css:
    raise SystemExit("Expected current WebKit foundation calibration not found")
css = css.replace(old_foundation, new_foundation, 1)

marker = "/* v2.3.2 Firefox/WebKit final measured containment */"
if marker in css:
    raise SystemExit("Final containment block already present")

block = r'''

/* v2.3.2 Firefox/WebKit final measured containment */
/* Root clipping prevents Firefox from exposing scrollable area created by already-clipped
   sticky/decorative descendants. Element-level containment below still fixes real text fit. */
html {
  overflow-x: clip;
}

@supports not (overflow: clip) {
  html {
    overflow-x: hidden;
  }
}

/* The Ukrainian language label is the longest unbreakable mobile row value. */
@media (max-width: 560px) {
  .language-row {
    grid-template-columns: 2.5rem minmax(0, 1fr);
    gap: .75rem;
  }

  .language-row strong {
    min-width: 0;
    max-width: 100%;
    font-size: clamp(1.95rem, 10vw, 2.8rem);
    line-height: .92;
  }

  .language-row__level {
    min-width: 0;
    max-width: 100%;
  }
}

/* Measured 768px fixes shared by actual content geometry, not browser diagnostics. */
@media (min-width: 561px) and (max-width: 900px) {
  html[lang="ru"] .foundation__closing {
    font-size: clamp(2.75rem, 6.1vw, 4.45rem);
  }
}

/* Firefox uses different system-ui glyph metrics on Linux/macOS than WebKit.
   Keep the same editorial composition while giving the measured long strings room. */
@supports (-moz-appearance: none) {
  @media (min-width: 561px) and (max-width: 900px) {
    html[lang="de"] .languages__display {
      font-size: clamp(2.5rem, 9.35vw, 4.8rem);
    }
  }

  @media (min-width: 901px) {
    html[lang="de"] .profile__display {
      font-size: clamp(3.45rem, min(6.72vw, 6.45rem), 7.2rem);
    }

    html[lang="de"] .languages__display {
      font-size: clamp(3.35rem, min(5.22vw, 5.02rem), 5.8rem);
    }

    html[lang="de"] .workflow-step h3 {
      font-size: clamp(3.2rem, min(7vw, 6.72rem), 7rem);
    }

    html[lang="de"] .journey-event__content h3 {
      font-size: clamp(2.15rem, min(3.9vw, 3.744rem), 4.15rem);
    }

    html[lang="de"] .work__display {
      font-size: clamp(3rem, 5.55vw, 5.45rem);
    }

    html[lang="ru"] .workflow-step h3 {
      font-size: clamp(2.95rem, min(5.7vw, 5.472rem), 5.8rem);
    }

    html[lang="ru"] .capabilities__display {
      font-size: clamp(3rem, min(5.35vw, 5.136rem), 5.85rem);
    }

    html[lang="ru"] .ai__display {
      font-size: clamp(3.05rem, min(7vw, 6.72rem), 6.7rem);
    }

    html[lang="ru"] .work__display {
      font-size: clamp(2.95rem, 5.3vw, 5.45rem);
    }
  }

  @media (min-width: 901px) and (max-width: 1180px) {
    html[lang="ru"] .languages__display {
      font-size: clamp(2.9rem, 4.55vw, 3.45rem);
    }
  }

  @media (min-width: 1181px) {
    html[lang="ru"] .languages__display {
      font-size: clamp(3.35rem, 5.05vw, 5.55rem);
    }
  }
}
'''

css_path.write_text(css.rstrip() + block + "\n")
