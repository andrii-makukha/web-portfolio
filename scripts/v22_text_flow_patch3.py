from pathlib import Path

path = Path("css/v2.css")
css = path.read_text()
marker = "/* v2.2 measured text-flow corrections */"
if marker in css:
    raise SystemExit("patch already applied")

css += r'''

/* v2.2 measured text-flow corrections */
.work__display,
.digital-card h4,
.workflow-step h3,
.contact__display,
.work__closing > div,
.work__closing > div span,
.journey-ending,
.journey-ending span,
.capability-row__evidence strong,
.capabilities__display,
.languages__display {
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
}

@media (max-width: 900px) {
  .work__display {
    font-size: clamp(2rem, 9.2vw, 4.2rem);
  }

  .digital-card h4 {
    font-size: clamp(1.45rem, 6.5vw, 2.8rem);
  }

  html[lang="ru"] .workflow-step h3 {
    font-size: clamp(1.75rem, 8vw, 3.4rem);
  }
}

@media (max-width: 560px) {
  html[lang="de"] .journey-ending {
    font-size: clamp(1.82rem, 8.5vw, 3.2rem);
  }

  html[lang="ru"] .contact__display {
    font-size: clamp(2.55rem, 12.5vw, 4rem);
  }
}

@media (min-width: 901px) {
  html[lang="de"] .capability-row__evidence strong {
    font-size: clamp(2.2rem, 4.1vw, 4rem);
  }

  html[lang="ru"] .capability-row__evidence strong {
    font-size: clamp(2.2rem, 4.7vw, 4.6rem);
  }

  html[lang="de"] .journey-ending {
    max-width: 15ch;
  }

  html[lang="de"] .journey-ending > span,
  html[lang="en"] .ai__display > span:last-child {
    white-space: nowrap;
  }

  html[lang="de"] .work__display,
  html[lang="en"] .work__display {
    font-size: clamp(3.6rem, 6.5vw, 6.25rem);
  }
}

@media (min-width: 901px) and (max-width: 1024px) {
  html[lang="de"] .languages__display,
  html[lang="ru"] .languages__display {
    font-size: 3.35rem;
  }

  html[lang="ru"] .capabilities__display {
    font-size: 3.4rem;
  }

  html[lang="ru"] .work__display {
    font-size: 3.35rem;
  }
}
'''

path.write_text(css)
print("Applied measured text-flow corrections")
