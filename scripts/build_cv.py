from pathlib import Path

import build_cv_v3 as cv3


# Production entry point. The v3 design engine remains isolated while the
# public site keeps the stable locale-specific filenames used by its links.
cv3.OUT = Path("assets/cv")
cv3.OUT.mkdir(parents=True, exist_ok=True)

FILENAMES = {
    "de": "andrii-makukha-de.pdf",
    "en": "andrii-makukha-en.pdf",
    "ru": "andrii-makukha-ru.pdf",
}


if __name__ == "__main__":
    for source in cv3.DATA:
        data = dict(source)
        data["filename"] = FILENAMES[data["locale"]]
        cv3.make(data)
