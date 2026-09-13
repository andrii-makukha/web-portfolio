from pathlib import Path

OLD_BASE = "https://andrii-makukha.github.io/web-portfolio"
NEW_BASE = "https://web-portfolio-woad-two.vercel.app"
BRANCH = "portfolio-v2.7-vercel-seo"

public_files = [
    Path("de/index.html"),
    Path("en/index.html"),
    Path("ru/index.html"),
    Path("sitemap.xml"),
    Path("robots.txt"),
    Path("404.html"),
]

for path in public_files:
    text = path.read_text(encoding="utf-8")
    text = text.replace(OLD_BASE, NEW_BASE)
    path.write_text(text, encoding="utf-8")

footer_replacements = {
    Path("de/index.html"): (
        '''        <div class="contact__footer">
          <span>© 2026 Andrii Makukha</span>
          <span>Human-directed · AI-assisted</span>
          <a href="#top">Nach oben ↑</a>
        </div>''',
        '''        <div class="contact__footer">
          <span>© 2026 Andrii Makukha</span>
          <span>Human-directed · AI-assisted</span>
          <span class="contact__legal"><a href="../de/impressum/">Impressum</a> · <a href="../de/datenschutz/">Datenschutz</a></span>
          <a href="#top">Nach oben ↑</a>
        </div>''',
        "../de/impressum/",
    ),
    Path("en/index.html"): (
        '''        <div class="contact__footer">
          <span>© 2026 Andrii Makukha</span>
          <span>Human-directed · AI-assisted</span>
          <a href="#top">Back to top ↑</a>
        </div>''',
        '''        <div class="contact__footer">
          <span>© 2026 Andrii Makukha</span>
          <span>Human-directed · AI-assisted</span>
          <span class="contact__legal"><a href="../en/legal-notice/">Legal notice</a> · <a href="../en/privacy/">Privacy</a></span>
          <a href="#top">Back to top ↑</a>
        </div>''',
        "../en/legal-notice/",
    ),
    Path("ru/index.html"): (
        '''        <div class="contact__footer">
          <span>© 2026 Andrii Makukha</span>
          <span>Human-directed · AI-assisted</span>
          <a href="#top">Наверх ↑</a>
        </div>''',
        '''        <div class="contact__footer">
          <span>© 2026 Andrii Makukha</span>
          <span>Human-directed · AI-assisted</span>
          <span class="contact__legal"><a href="../ru/impressum/">Impressum</a> · <a href="../ru/privacy/">Datenschutz</a></span>
          <a href="#top">Наверх ↑</a>
        </div>''',
        "../ru/impressum/",
    ),
}

for path, (old_footer, new_footer, marker) in footer_replacements.items():
    text = path.read_text(encoding="utf-8")
    if marker not in text:
        if old_footer not in text:
            raise SystemExit(f"Expected footer pattern not found in {path}")
        text = text.replace(old_footer, new_footer, 1)
        path.write_text(text, encoding="utf-8")

workflow_paths = [
    Path(".github/workflows/portfolio-v2-qa.yml"),
    Path(".github/workflows/portfolio-v2-cross-browser-qa.yml"),
    Path(".github/workflows/portfolio-v2-lighthouse-audit.yml"),
]

for path in workflow_paths:
    text = path.read_text(encoding="utf-8")
    branch_line = f"      - {BRANCH}\n"
    if branch_line not in text:
        anchor = "      - portfolio-v2.6-legal-404-search\n      - main\n"
        if anchor not in text:
            raise SystemExit(f"Branch anchor not found in {path}")
        text = text.replace(
            anchor,
            f"      - portfolio-v2.6-legal-404-search\n{branch_line}      - main\n",
            1,
        )

    if path.name in {"portfolio-v2-qa.yml", "portfolio-v2-cross-browser-qa.yml"}:
        syntax_anchor = "          node --check qa/legal-completeness-qa.mjs\n"
        syntax_line = "          node --check qa/vercel-production-qa.mjs\n"
        if syntax_line not in text:
            if syntax_anchor not in text:
                raise SystemExit(f"Syntax anchor not found in {path}")
            text = text.replace(syntax_anchor, syntax_anchor + syntax_line, 1)

        legal_step = (
            "      - name: Run legal and search readiness QA\n"
            + ("        if: always()\n" if path.name == "portfolio-v2-qa.yml" else "")
            + "        run: node qa/legal-completeness-qa.mjs\n"
        )
        vercel_step = (
            "\n      - name: Run Vercel production metadata QA\n"
            + ("        if: always()\n" if path.name == "portfolio-v2-qa.yml" else "")
            + "        run: node qa/vercel-production-qa.mjs\n"
        )
        if "Run Vercel production metadata QA" not in text:
            if legal_step not in text:
                raise SystemExit(f"Legal QA step anchor not found in {path}")
            text = text.replace(legal_step, legal_step + vercel_step, 1)

    path.write_text(text, encoding="utf-8")

for path in public_files:
    text = path.read_text(encoding="utf-8")
    if OLD_BASE in text:
        raise SystemExit(f"Legacy GitHub Pages URL remains in {path}")

print(f"Migrated production metadata to {NEW_BASE}")
