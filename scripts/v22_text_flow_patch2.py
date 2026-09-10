from pathlib import Path

MARKER = "/* v2.2.1 measured text-flow corrections */"

replacements = {
    "de/index.html": [
        (
            """              <span>Was ich</span>\n              <span>aufgebaut,</span>\n              <span>organisiert und</span>\n              <span>entwickelt habe.</span>""",
            """              <span>Was ich</span>\n              <span>aufgebaut,</span>\n              <span>organisiert</span>\n              <span>und&nbsp;entwickelt</span>\n              <span>habe.</span>""",
        ),
    ],
    "en/index.html": [
        (
            """              <span>What I've</span>\n              <span>built,</span>\n              <span>organised and</span>\n              <span>developed.</span>""",
            """              <span>What I've</span>\n              <span>built,</span>\n              <span>organised</span>\n              <span>and&nbsp;developed.</span>""",
        ),
    ],
}

for file_name, pairs in replacements.items():
    path = Path(file_name)
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        if new in text:
            continue
        if old not in text:
            raise SystemExit(f"Expected source block not found in {file_name}: {old[:120]!r}")
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")

css_path = Path("css/v2.css")
css = css_path.read_text(encoding="utf-8")
if MARKER not in css:
    css += r'''

/* v2.2.1 measured text-flow corrections */
/* Keep long evidence labels within their column across the 901–1728 desktop matrix. */
@media (min-width: 901px) {
  .capability-row__evidence strong {
    max-width: 100%;
    font-size: clamp(2.05rem, 3.65vw, 4rem);
    line-height: .92;
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
  }

  /* The work statement needs enough room to keep the conjunction attached to its verb. */
  .work__display {
    font-size: clamp(3.45rem, 6.75vw, 6.5rem);
  }

  .work__display > span {
    white-space: nowrap;
  }

  /* Preserve the authored three-part AI statement on desktop; the mobile version stays fluid. */
  .ai__display > span {
    display: block;
  }

  .ai__display > span + span::before {
    content: none;
  }

  html[lang="en"] .ai__display > span:last-child {
    white-space: nowrap;
  }

  html[lang="de"] .journey-ending {
    max-width: 19ch;
    font-size: clamp(3.4rem, 7vw, 6.6rem);
  }

  html[lang="de"] .journey-ending > span:last-child {
    white-space: nowrap;
  }
}

/* The first desktop layout immediately above 900px is the tightest two-column state. */
@media (min-width: 901px) and (max-width: 1180px) {
  html[lang="de"] .languages__display,
  html[lang="ru"] .languages__display {
    font-size: clamp(3.25rem, 5.8vw, 4.15rem);
  }

  html[lang="ru"] .capabilities__display,
  html[lang="ru"] .work__display {
    font-size: clamp(3.3rem, 6.9vw, 5rem);
  }
}

@media (max-width: 900px) {
  /* Phrase-level nowrap prevents weak conjunctions from becoming their own display line. */
  .work__display > span {
    white-space: nowrap;
  }
}

@media (max-width: 560px) {
  .work__display {
    font-size: clamp(2rem, 9vw, 4rem);
    line-height: .9;
  }

  .digital-card h4 {
    font-size: clamp(1.45rem, 6.4vw, 2.5rem);
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
  }

  .workflow-step h3 {
    font-size: clamp(1.9rem, 9vw, 3.65rem);
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
  }

  .contact__display {
    font-size: clamp(2.75rem, 10vw, 4.5rem);
  }

  .work__closing > div span {
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
  }

  html[lang="de"] .journey-ending {
    max-width: 100%;
    font-size: clamp(1.85rem, 8.4vw, 3.4rem);
  }

  html[lang="de"] .journey-ending > span:last-child {
    white-space: nowrap;
  }
}
'''
    css_path.write_text(css, encoding="utf-8")

print("v2.2.1 measured text-flow corrections applied")
