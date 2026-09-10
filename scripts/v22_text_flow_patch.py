from pathlib import Path

BRANCH_MARKER = "/* v2.2 semantic text-flow hardening */"

replacements = {
    "de/index.html": [
        (
            """              <span>Was ich</span>\n              <span>aufgebaut,</span>\n              <span>organisiert</span>\n              <span>und entwickelt habe.</span>""",
            """              <span>Was ich</span>\n              <span>aufgebaut,</span>\n              <span>organisiert und</span>\n              <span>entwickelt habe.</span>""",
        ),
        (
            """            <span>Unterschiedliche</span><span>Aufgaben.</span><span>Dieselbe</span><span>Arbeitsweise.</span>""",
            """            <span>Unterschiedliche Aufgaben.</span><span>Dieselbe Arbeitsweise.</span>""",
        ),
        (
            """          <span>Nicht ein</span><span>Neustart.</span><span>Eine</span><span>Erweiterung.</span>""",
            """          <span>Nicht ein Neustart.</span><span>Eine Erweiterung.</span>""",
        ),
    ],
    "en/index.html": [
        (
            """              <span>What I've</span>\n              <span>built,</span>\n              <span>organised</span>\n              <span>and developed.</span>""",
            """              <span>What I've</span>\n              <span>built,</span>\n              <span>organised and</span>\n              <span>developed.</span>""",
        ),
        (
            """            <span>Different</span><span>tasks.</span><span>The same</span><span>way of working.</span>""",
            """            <span>Different tasks.</span><span>The same way of working.</span>""",
        ),
        (
            """          <span>Not a</span><span>restart.</span><span>An</span><span>expansion.</span>""",
            """          <span>Not a restart.</span><span>An expansion.</span>""",
        ),
    ],
    "ru/index.html": [
        (
            """              <span>Не</span>\n              <span>заявлено.</span>\n              <span>Подтверждено.</span>""",
            """              <span>Не заявлено.</span>\n              <span>Подтверждено.</span>""",
        ),
        (
            """            <span>Разные</span><span>задачи.</span><span>Один</span><span>подход.</span>""",
            """            <span>Разные задачи.</span><span>Один подход.</span>""",
        ),
        (
            """          <span>Не</span><span>перезапуск.</span><span>А</span><span>расширение.</span>""",
            """          <span>Не перезапуск.</span><span>А расширение.</span>""",
        ),
        (
            """<h3 id=\"journey-education-ru\" data-reveal>Образование и дополнительное обучение</h3>""",
            """<h3 id=\"journey-education-ru\" data-reveal>Образование и&nbsp;дополнительное обучение</h3>""",
        ),
        (
            """<h3>Это портфолио — практический пример такого подхода.</h3>""",
            """<h3>Это портфолио&nbsp;— практический пример такого подхода.</h3>""",
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
            raise SystemExit(f"Expected source block not found in {file_name}: {old[:100]!r}")
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")

css_path = Path("css/v2.css")
css = css_path.read_text(encoding="utf-8")
if BRANCH_MARKER not in css:
    css += r'''

/* v2.2 semantic text-flow hardening */
main h1,
main h2,
main h3,
main h4,
.foundation__closing,
.capabilities__bridge,
.ai-formula,
.work__closing > div,
.journey-ending,
.capability-row__evidence strong,
.language-row strong {
  text-wrap: balance;
}

main p {
  text-wrap: pretty;
}

main h1,
main h2,
main h3,
main h4,
.foundation__closing,
.capabilities__bridge,
.work__closing > div,
.journey-ending,
.capability-row__evidence strong,
.language-row strong {
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
}

/* The AI statement is one semantic sentence. Let the browser balance it instead of
   forcing desktop-authored span breaks at narrower desktop widths. */
.ai__display > span {
  display: inline;
}

.ai__display > span + span::before {
  content: " ";
}

/* Closing statements now use two semantic phrases; keep the second phrase accented. */
.work__closing > div span:last-child,
.journey-ending span:last-child {
  color: var(--brass);
}

@media (max-width: 900px) {
  .profile__display,
  .foundation__display,
  .capabilities__display,
  .ai__display,
  .work__display,
  .journey__display,
  .languages__display {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    font-size: clamp(2.55rem, 10vw, 5.2rem);
    line-height: .9;
    text-wrap: balance;
  }

  .contact__display {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    font-size: clamp(3rem, 10.2vw, 5.8rem);
    line-height: .9;
    text-wrap: balance;
  }

  .profile__display > span,
  .foundation__display > span,
  .capabilities__display > span,
  .work__display > span,
  .journey__display > span,
  .languages__display > span,
  .contact__display > span {
    display: inline;
  }

  .profile__display > span + span::before,
  .foundation__display > span + span::before,
  .capabilities__display > span + span::before,
  .work__display > span + span::before,
  .journey__display > span + span::before,
  .languages__display > span + span::before,
  .contact__display > span + span::before {
    content: " ";
  }

  .opening__name {
    max-width: 100%;
    font-size: clamp(3.6rem, 9.5vw, 5.8rem);
  }

  .opening__name span:last-child {
    margin-left: clamp(.75rem, 3vw, 2.25rem);
  }

  .capability-row__evidence strong {
    max-width: 100%;
    font-size: clamp(2.2rem, 6.5vw, 4rem);
    line-height: .94;
  }

  .capability-row__result h3 {
    max-width: 100%;
    font-size: clamp(2rem, 5.8vw, 3.8rem);
    line-height: .96;
  }

  .workflow-step h3 {
    max-width: 100%;
    font-size: clamp(2.4rem, 7vw, 5rem);
    line-height: .9;
  }

  .digital-card h4 {
    max-width: 100%;
    font-size: clamp(1.9rem, 5vw, 3.4rem);
    line-height: .94;
  }

  .journey-event__content h3,
  .journey-education > h3 {
    max-width: 100%;
    font-size: clamp(2rem, 5.8vw, 3.8rem);
    line-height: .96;
  }

  .foundation__closing,
  .capabilities__bridge,
  .work__closing > div,
  .journey-ending {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    font-size: clamp(2.5rem, 7vw, 5rem);
    line-height: .9;
  }
}

@media (max-width: 560px) {
  .opening__name {
    font-size: clamp(3.2rem, 15vw, 4.8rem);
  }

  .opening__name span:last-child {
    margin-left: clamp(.5rem, 2.5vw, 1rem);
  }

  .capability-row__evidence strong {
    font-size: clamp(1.85rem, 8.4vw, 3.2rem);
  }

  .capability-row__result h3 {
    font-size: clamp(1.8rem, 8vw, 3.1rem);
  }

  .workflow-step h3 {
    font-size: clamp(2rem, 9.2vw, 3.8rem);
  }

  .digital-card h4 {
    font-size: clamp(1.7rem, 7.4vw, 2.8rem);
  }

  .journey-event__content h3 {
    font-size: clamp(1.7rem, 7.4vw, 2.9rem);
  }

  .journey-education > h3 {
    font-size: clamp(1.85rem, 7.8vw, 3rem);
  }

  .foundation__closing,
  .capabilities__bridge,
  .work__closing > div,
  .journey-ending {
    font-size: clamp(2rem, 9vw, 3.6rem);
  }
}
'''
    css_path.write_text(css, encoding="utf-8")

print("v2.2 text-flow patch applied")
