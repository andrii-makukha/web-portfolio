# CV v3 — Final QA record

Release candidate head: `096c1c8b1f9a33fde5b65c91dc6eca1123982a2f`

## Automated gate

GitHub Actions run: `34528482127` (`Build Portfolio CV PDFs`)

Result: PASS.

The permanent release gate rebuilt the committed DE / EN / RU PDFs from source and verified:

- exactly one page per locale;
- selectable ATS text;
- required factual anchors (`ANDRII MAKUKHA`, `Hardy Orchestra`, `Symbioz Band`, `ReSchuhe`, `Hillel IT School`);
- locale-specific professional-experience heading;
- no Unicode replacement characters in extracted text;
- exact extracted-text parity between committed and regenerated PDFs;
- exact 200-dpi PNG render parity between committed and regenerated PDFs.

## Visual review

The 200-dpi DE / EN / RU renders were reviewed after the multilingual layout was generated.

Observed release surfaces:

- portrait crop is consistent and undistorted;
- header and contact hierarchy remains consistent across all locales;
- section numbering and hairlines align consistently;
- no text clipping, overlap or broken glyphs;
- Russian copy wraps more densely but preserves the same hierarchy and remains comfortably within the one-page layout;
- the lower-page whitespace remains intentional rather than filled with decorative content.

## Release status

Production-named PDFs are committed on the CV v3 branch. `main` remains unchanged until explicit release approval.
