from io import BytesIO
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

try:
    import pillow_avif  # noqa: F401 - registers AVIF support in Pillow
except ImportError:
    pillow_avif = None


OUT = Path("build/cv-v3")
OUT.mkdir(parents=True, exist_ok=True)
PORTRAIT = Path("assets/portrait.avif")

REG = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
BOLD = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("Noto", REG))
pdfmetrics.registerFont(TTFont("NotoBold", BOLD))

W, H = A4
MARGIN = 42
RIGHT = W - MARGIN
CONTENT_W = W - (MARGIN * 2)

# Calm portfolio-related palette: almost-white paper, graphite, deep navy,
# one muted brass accent. No large colour blocks.
PAPER = HexColor("#FCFBF8")
INK = HexColor("#18191A")
NAVY = HexColor("#1B2634")
ACCENT = HexColor("#9A7652")
GRAPH = HexColor("#4C4D4D")
MUTED = HexColor("#737472")
LINE = HexColor("#D9D5CE")
PHOTO_LINE = HexColor("#CDC7BE")

CONTACT = {
    "phone": "+49 151 25233241",
    "phone_url": "tel:+4915125233241",
    "email": "makukha.andrii.it@gmail.com",
    "github": "github.com/andrii-makukha",
    "portfolio": "andrii-makukha.github.io/web-portfolio/",
}

DE = {
    "locale": "de",
    "filename": "andrii-makukha-de-v3.pdf",
    "title": "Andrii Makukha - Lebenslauf",
    "kicker": "BERUFLICHES PROFIL",
    "tagline": "Führung · Organisation · Digitale Arbeitsweisen & KI",
    "location": "Bernau am Chiemsee · Deutschland",
    "footer": "Lebenslauf · 2026",
    "sections": {
        "profile": "PROFIL",
        "experience": "BERUFSERFAHRUNG",
        "projects": "AUSGEWÄHLTE PROJEKTE",
        "education": "BILDUNG & WEITERBILDUNG",
        "capabilities": "KOMPETENZEN",
        "languages": "SPRACHEN",
    },
    "profile": (
        "Beruflicher Hintergrund in professioneller Musik, Führung und Organisation. "
        "Als erster Trompeter, Gruppenleiter und Gründer einer achtköpfigen Band habe ich "
        "Präzision, Verantwortung und Teamkoordination unter Leistungsdruck entwickelt. "
        "Heute verbinde ich diese Erfahrung mit Web-Grundlagen, digitalen Werkzeugen und "
        "KI-gestützten Arbeitsweisen."
    ),
    "experience": [
        (
            "Hardy Orchestra",
            "Erster Trompeter & Gruppenleiter",
            "2017-2022",
            "Führung der Trompetensektion in komplexen Produktionen, u. a. Rammstein-Symphonien; "
            "Präzision und Belastbarkeit bei Live-Auftritten.",
        ),
        (
            "Symbioz Band",
            "Gründer & Leiter",
            "09/2019-02/2022",
            "Leitung von 8 Musikern und Organisation von 80+ Veranstaltungen. Verantwortung für "
            "Projektplanung, Budget, Kundenakquise, Konfliktmanagement und Qualitätssicherung.",
        ),
        ("Gastronomie", "Kurier / Auslieferungsfahrer", "2022-2024", ""),
    ],
    "projects": [
        (
            "ReSchuhe",
            "Konzept · Marke · digitales Produkt",
            "2026 · in Entwicklung",
            "Geschäftsplanung, Markenentwicklung, Produktstruktur und KI-gestützte Umsetzung; "
            "Website und digitale Nutzerführung in Entwicklung.",
        ),
        (
            "Portfolio v2",
            "Interaktives berufliches Profil",
            "2026",
            "Konzept, Struktur und Designrichtung eigenverantwortlich definiert; KI für Recherche, "
            "technische Umsetzung und Qualitätssicherung eingesetzt.",
        ),
    ],
    "education": [
        (
            "Fullstack JavaScript (Zertifikat)",
            "Hillel IT School",
            "2024-2025",
            "JavaScript (ES6+), Frontend-/Backend-Grundlagen, React & Node.js (Basis), REST APIs, "
            "Datenbanken (Grundlagen), Git.",
        ),
        ("Bachelor of Music Arts", "Musikakademie Odessa", "2017-2021", ""),
        (
            "Fachschulausbildung im Bereich Musik",
            "Musikschule V.S. Kosenko, Zhytomyr",
            "2013-2017",
            "",
        ),
    ],
    "capabilities": [
        ("Führung & Verantwortung", "Leitung von 8 Musikern · Führung einer Trompetensektion"),
        ("Organisation & Planung", "80+ Veranstaltungen · Projektplanung · Budget"),
        ("Kommunikation", "Kundenakquise · Teamkoordination · Konfliktmanagement"),
        (
            "Digitales Arbeiten & Lernen",
            "Web-Grundlagen · Informationsrecherche · KI-gestützte Arbeitsabläufe",
        ),
    ],
    "languages": "Deutsch B2 · Ukrainisch Muttersprache · Russisch Muttersprache",
}

EN = {
    "locale": "en",
    "filename": "andrii-makukha-en-v3.pdf",
    "title": "Andrii Makukha - CV",
    "kicker": "PROFESSIONAL PROFILE",
    "tagline": "Leadership · Organisation · Digital Workflows & AI",
    "location": "Bernau am Chiemsee · Germany",
    "footer": "Curriculum Vitae · 2026",
    "sections": {
        "profile": "PROFILE",
        "experience": "PROFESSIONAL EXPERIENCE",
        "projects": "SELECTED PROJECTS",
        "education": "EDUCATION & TRAINING",
        "capabilities": "CAPABILITIES",
        "languages": "LANGUAGES",
    },
    "profile": (
        "Professional background in music, leadership and organisation. As a first trumpet player, "
        "section leader and founder of an eight-person band, I developed precision, responsibility "
        "and team coordination under performance pressure. Today I combine that experience with web "
        "fundamentals, digital tools and AI-assisted workflows."
    ),
    "experience": [
        (
            "Hardy Orchestra",
            "First Trumpet & Section Leader",
            "2017-2022",
            "Led the trumpet section in complex productions, including Rammstein-Symphonien; "
            "precision and resilience in live performance.",
        ),
        (
            "Symbioz Band",
            "Founder & Band Leader",
            "09/2019-02/2022",
            "Led 8 musicians and organised 80+ events. Responsible for project planning, budgets, "
            "client acquisition, conflict management and quality assurance.",
        ),
        ("Hospitality / Food Service", "Courier / Delivery Driver", "2022-2024", ""),
    ],
    "projects": [
        (
            "ReSchuhe",
            "Concept · brand · digital product",
            "2026 · in development",
            "Business planning, brand development, product structure and AI-assisted execution; "
            "website and digital customer journey in development.",
        ),
        (
            "Portfolio v2",
            "Interactive professional profile",
            "2026",
            "Concept, structure and design direction defined independently; AI used for research, "
            "technical implementation and quality assurance.",
        ),
    ],
    "education": [
        (
            "Fullstack JavaScript (Certificate)",
            "Hillel IT School",
            "2024-2025",
            "JavaScript (ES6+), frontend/backend fundamentals, React & Node.js (basic), REST APIs, "
            "database fundamentals, Git.",
        ),
        ("Bachelor of Music Arts", "Odessa Music Academy", "2017-2021", ""),
        (
            "Vocational Music Education",
            "V.S. Kosenko Music School, Zhytomyr",
            "2013-2017",
            "",
        ),
    ],
    "capabilities": [
        ("Leadership & responsibility", "Led 8 musicians · led a trumpet section"),
        ("Organisation & planning", "80+ events · project planning · budgets"),
        ("Communication", "Client acquisition · team coordination · conflict management"),
        (
            "Digital work & learning",
            "Web fundamentals · information research · AI-assisted workflows",
        ),
    ],
    "languages": "German B2 · Ukrainian native · Russian native",
}

RU = {
    "locale": "ru",
    "filename": "andrii-makukha-ru-v3.pdf",
    "title": "Andrii Makukha - Резюме",
    "kicker": "ПРОФЕССИОНАЛЬНЫЙ ПРОФИЛЬ",
    "tagline": "Руководство · Организация · Цифровые процессы и ИИ",
    "location": "Bernau am Chiemsee · Германия",
    "footer": "Резюме · 2026",
    "sections": {
        "profile": "ПРОФИЛЬ",
        "experience": "ПРОФЕССИОНАЛЬНЫЙ ОПЫТ",
        "projects": "ИЗБРАННЫЕ ПРОЕКТЫ",
        "education": "ОБРАЗОВАНИЕ И ОБУЧЕНИЕ",
        "capabilities": "КОМПЕТЕНЦИИ",
        "languages": "ЯЗЫКИ",
    },
    "profile": (
        "Профессиональный опыт в музыке, руководстве и организации. Как первый трубач, руководитель "
        "секции и основатель коллектива из восьми музыкантов я развил точность, ответственность и "
        "навыки командной координации в условиях высокой сценической нагрузки. Сегодня я объединяю "
        "этот опыт с веб-основами, цифровыми инструментами и рабочими процессами с поддержкой ИИ."
    ),
    "experience": [
        (
            "Hardy Orchestra",
            "Первый трубач и руководитель секции",
            "2017-2022",
            "Руководство секцией труб в сложных постановках, включая Rammstein-Symphonien; "
            "точность и выдержка в условиях живых выступлений.",
        ),
        (
            "Symbioz Band",
            "Основатель и руководитель",
            "09/2019-02/2022",
            "Руководство командой из 8 музыкантов и организация 80+ мероприятий. Ответственность за "
            "проектное планирование, бюджет, привлечение клиентов, решение конфликтов и контроль качества.",
        ),
        ("Сфера общественного питания", "Курьер / водитель доставки", "2022-2024", ""),
    ],
    "projects": [
        (
            "ReSchuhe",
            "Концепция · бренд · цифровой продукт",
            "2026 · в разработке",
            "Бизнес-планирование, развитие бренда, структура продукта и реализация с поддержкой ИИ; "
            "сайт и цифровой путь клиента находятся в разработке.",
        ),
        (
            "Portfolio v2",
            "Интерактивный профессиональный профиль",
            "2026",
            "Концепция, структура и направление дизайна определены самостоятельно; ИИ используется "
            "для исследования, технической реализации и контроля качества.",
        ),
    ],
    "education": [
        (
            "Fullstack JavaScript (сертификат)",
            "Hillel IT School",
            "2024-2025",
            "JavaScript (ES6+), основы фронтенда и бэкенда, React & Node.js (базовый уровень), "
            "REST API, основы баз данных, Git.",
        ),
        ("Bachelor of Music Arts", "Музыкальная академия Одессы", "2017-2021", ""),
        (
            "Профессиональное музыкальное образование",
            "Музыкальная школа им. В. С. Косенко, Житомир",
            "2013-2017",
            "",
        ),
    ],
    "capabilities": [
        ("Руководство и ответственность", "Команда из 8 музыкантов · руководство секцией труб"),
        ("Организация и планирование", "80+ мероприятий · проектное планирование · бюджет"),
        ("Коммуникация", "Привлечение клиентов · координация команды · решение конфликтов"),
        (
            "Цифровая работа и обучение",
            "Веб-основы · поиск и анализ информации · процессы с поддержкой ИИ",
        ),
    ],
    "languages": "Немецкий B2 · Украинский родной · Русский родной",
}

DATA = [DE, EN, RU]


def wrap(text, font, size, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, text, x, y, max_width, font="Noto", size=7.95, leading=10.05, color=GRAPH):
    c.setFillColor(color)
    c.setFont(font, size)
    for line in wrap(text, font, size, max_width):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_spaced_text(c, text, x, y, font, size, color, char_space=0.0):
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setFillColor(color)
    t.setCharSpace(char_space)
    t.textLine(text)
    c.drawText(t)


def section_label(c, number, title, y):
    c.setFillColor(ACCENT)
    c.setFont("NotoBold", 7.45)
    c.drawString(MARGIN, y, f"{number:02d}")

    c.setFillColor(INK)
    c.setFont("NotoBold", 7.9)
    c.drawString(MARGIN + 30, y, title)

    title_w = stringWidth(title, "NotoBold", 7.9)
    line_x = MARGIN + 30 + title_w + 15
    c.setStrokeColor(LINE)
    c.setLineWidth(0.45)
    if line_x < RIGHT - 18:
        c.line(line_x, y + 2.2, RIGHT, y + 2.2)
    return y - 19


def draw_entry(c, org, role, date, body, y, compact=False):
    c.setFillColor(INK)
    c.setFont("NotoBold", 9.35)
    c.drawString(MARGIN, y, org)

    c.setFillColor(MUTED)
    c.setFont("Noto", 7.35)
    c.drawRightString(RIGHT, y + 0.4, date)

    y -= 12
    c.setFillColor(NAVY)
    c.setFont("NotoBold", 8.1)
    c.drawString(MARGIN, y, role)
    y -= 10.6

    if body:
        y = draw_wrapped(c, body, MARGIN, y, CONTENT_W, size=7.85, leading=9.85)

    return y - (4.8 if compact else 6.2)


def portrait_reader():
    if not PORTRAIT.exists():
        raise FileNotFoundError(f"Missing portrait asset: {PORTRAIT}")

    image = Image.open(PORTRAIT).convert("RGB")
    width, height = image.size

    # The selected standing three-quarter portrait remains the single source.
    # For the CV, use a business-oriented upper-body 4:5 crop without touching it.
    crop_w = int(width * 0.64)
    crop_h = int(crop_w / 0.80)
    left = max(0, (width - crop_w) // 2)
    top = int(height * 0.025)
    bottom = min(height, top + crop_h)
    if bottom - top < crop_h:
        top = max(0, height - crop_h)
        bottom = height

    cropped = image.crop((left, top, left + crop_w, bottom))
    buffer = BytesIO()
    cropped.save(buffer, format="JPEG", quality=96, optimize=True)
    buffer.seek(0)
    return ImageReader(buffer), buffer


def draw_header(c, data):
    name_y = H - 55
    draw_spaced_text(c, "ANDRII MAKUKHA", MARGIN, name_y, "NotoBold", 26.2, INK, 0.25)

    c.setFillColor(ACCENT)
    c.setFont("NotoBold", 7.35)
    c.drawString(MARGIN, name_y - 22, data["kicker"])

    c.setFillColor(NAVY)
    c.setFont("NotoBold", 9.35)
    c.drawString(MARGIN, name_y - 40, data["tagline"])

    c.setFillColor(GRAPH)
    c.setFont("Noto", 7.35)
    c.drawString(MARGIN, name_y - 65, data["location"])
    c.drawString(MARGIN + 205, name_y - 65, CONTACT["phone"])
    c.drawString(MARGIN, name_y - 80, CONTACT["email"])
    c.drawString(MARGIN + 205, name_y - 80, CONTACT["github"])
    c.drawString(MARGIN, name_y - 95, CONTACT["portfolio"])

    c.linkURL(CONTACT["phone_url"], (MARGIN + 205, name_y - 69, MARGIN + 315, name_y - 59))
    c.linkURL("mailto:" + CONTACT["email"], (MARGIN, name_y - 84, MARGIN + 175, name_y - 74))
    c.linkURL("https://" + CONTACT["github"], (MARGIN + 205, name_y - 84, MARGIN + 350, name_y - 74))
    c.linkURL("https://" + CONTACT["portfolio"], (MARGIN, name_y - 99, MARGIN + 210, name_y - 89))

    photo_w = 96
    photo_h = 120
    photo_x = RIGHT - photo_w
    photo_y = H - 43 - photo_h

    image_reader, buffer = portrait_reader()
    c.saveState()
    path = c.beginPath()
    path.roundRect(photo_x, photo_y, photo_w, photo_h, 5.5)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(
        image_reader,
        photo_x,
        photo_y,
        width=photo_w,
        height=photo_h,
        preserveAspectRatio=False,
        mask="auto",
    )
    c.restoreState()
    buffer.close()

    c.setStrokeColor(PHOTO_LINE)
    c.setLineWidth(0.55)
    c.roundRect(photo_x, photo_y, photo_w, photo_h, 5.5, stroke=1, fill=0)

    divider_y = H - 184
    c.setStrokeColor(LINE)
    c.setLineWidth(0.55)
    c.line(MARGIN, divider_y, RIGHT, divider_y)
    return divider_y - 24


def draw_capabilities(c, items, y):
    gap = 22
    col_w = (CONTENT_W - gap) / 2
    row_height = 41

    for index, (title, evidence) in enumerate(items):
        col = index % 2
        row = index // 2
        x = MARGIN + col * (col_w + gap)
        item_y = y - row * row_height

        c.setFillColor(INK)
        c.setFont("NotoBold", 8.0)
        c.drawString(x, item_y, title)
        draw_wrapped(c, evidence, x, item_y - 11.5, col_w, size=7.5, leading=9.1, color=GRAPH)

    return y - (2 * row_height) + 5


def make(data):
    path = OUT / data["filename"]
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle(data["title"])
    c.setAuthor("Andrii Makukha")
    c.setSubject("Professional CV")

    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    y = draw_header(c, data)

    y = section_label(c, 1, data["sections"]["profile"], y)
    y = draw_wrapped(c, data["profile"], MARGIN, y, CONTENT_W, size=8.15, leading=10.45)
    y -= 11

    y = section_label(c, 2, data["sections"]["experience"], y)
    for item in data["experience"]:
        y = draw_entry(c, *item, y)

    y = section_label(c, 3, data["sections"]["projects"], y)
    for item in data["projects"]:
        y = draw_entry(c, *item, y, compact=True)

    y = section_label(c, 4, data["sections"]["education"], y)
    for name, org, date, body in data["education"]:
        c.setFillColor(INK)
        c.setFont("NotoBold", 8.8)
        c.drawString(MARGIN, y, name)
        c.setFillColor(MUTED)
        c.setFont("Noto", 7.3)
        c.drawRightString(RIGHT, y + 0.2, date)
        y -= 11.2
        c.setFillColor(GRAPH)
        c.setFont("Noto", 7.6)
        c.drawString(MARGIN, y, org)
        y -= 10
        if body:
            y = draw_wrapped(c, body, MARGIN, y, CONTENT_W, size=7.55, leading=9.25)
        y -= 5

    y = section_label(c, 5, data["sections"]["capabilities"], y)
    y = draw_capabilities(c, data["capabilities"], y)

    y = section_label(c, 6, data["sections"]["languages"], y)
    c.setFillColor(GRAPH)
    c.setFont("Noto", 8.0)
    c.drawString(MARGIN, y, data["languages"])
    y -= 17

    if y < 35:
        raise RuntimeError(f"CV content overflow for {data['locale']}: final y={y:.1f}")

    c.setStrokeColor(LINE)
    c.setLineWidth(0.45)
    c.line(MARGIN, 31, RIGHT, 31)
    c.setFillColor(MUTED)
    c.setFont("Noto", 6.4)
    c.drawString(MARGIN, 18, data["footer"])
    c.drawRightString(RIGHT, 18, CONTACT["portfolio"])
    c.linkURL("https://" + CONTACT["portfolio"], (RIGHT - 185, 13, RIGHT, 25))

    c.save()
    print(f"Built {path} (content floor y={y:.1f})")


if __name__ == "__main__":
    for item in DATA:
        make(item)
