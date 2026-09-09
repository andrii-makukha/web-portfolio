from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth
from pathlib import Path

OUT = Path("assets/cv")
OUT.mkdir(parents=True, exist_ok=True)
REG="/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
MED="/usr/share/fonts/truetype/noto/NotoSans-Medium.ttf"
BOLD="/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("Noto", REG))
pdfmetrics.registerFont(TTFont("NotoMed", MED))
pdfmetrics.registerFont(TTFont("NotoBold", BOLD))

W, H = A4
INK = HexColor("#0B0C0D")
PAPER = HexColor("#FAF8F3")
NAVY = HexColor("#111D2D")
BRASS = HexColor("#A67B4B")
GRAPH = HexColor("#454545")
MUTED = HexColor("#6B6B68")
LINE = HexColor("#D7D3CB")

CONTACT = {
    "phone": "+49 151 25233241",
    "email": "makukha.andrii.it@gmail.com",
    "github": "github.com/andrii-makukha",
    "portfolio": "andrii-makukha.github.io/web-portfolio/",
}

DATA = {
    "de": {
        "filename": "andrii-makukha-de.pdf",
        "title": "Andrii Makukha - Lebenslauf",
        "subtitle": "BERUFLICHES PROFIL",
        "tagline": "Musik · Führung · Organisation · Digitale Werkzeuge & KI",
        "location": "Bernau am Chiemsee · Deutschland",
        "profile_title": "PROFIL",
        "profile": "Beruflicher Hintergrund in professioneller Musik, Führung und Organisation. Als erster Trompeter, Gruppenleiter und Gründer einer achtköpfigen Band habe ich Präzision, Verantwortung und Koordination unter realem Leistungsdruck entwickelt. Heute ergänze ich diese Erfahrung durch digitale Werkzeuge, Web-Grundlagen und KI-gestützte Arbeitsweisen.",
        "exp_title": "BERUFSERFAHRUNG",
        "experience": [
            ("Hardy Orchestra", "Erster Trompeter & Gruppenleiter", "2017-2022", "Führung der Trompetensektion in komplexen Produktionen, u. a. Rammstein-Symphonien. Präzision und Belastbarkeit unter Live-Druck."),
            ("Symbioz Band", "Gründer & Leiter", "09/2019-02/2022", "Leitung von 8 Musikern; Organisation von 80+ Veranstaltungen. Verantwortung für Projektplanung, Budget, Kundenakquise, Konfliktmanagement und Qualitätssicherung."),
            ("Gastronomie", "Kurier / Auslieferungsfahrer", "2022-2024", ""),
        ],
        "dev_title": "AUSGEWÄHLTE ENTWICKLUNG",
        "dev": [
            ("ReSchuhe", "Konzept · Marke · digitales Produkt", "2026 · in Entwicklung", "Geschäftsplanung, Markenentwicklung, Produktstruktur und KI-gestützte Umsetzung. Öffentliche Website und digitale Nutzererfahrung in Entwicklung."),
            ("Portfolio v2", "Interaktives berufliches Profil", "2026", "Konzept, Struktur, Inhaltsrichtung, Designentscheidungen und finale Bewertung von mir gesteuert; KI-Unterstützung für Recherche, Variantenfindung, technische Umsetzung und QA."),
        ],
        "edu_title": "BILDUNG & WEITERBILDUNG",
        "education": [
            ("Fullstack JavaScript (Zertifikat)", "Hillel IT School", "2024-2025", "JavaScript (ES6+), Frontend-/Backend-Grundlagen, React & Node.js (Basis), REST APIs, Datenbanken (Grundlagen), Git."),
            ("Bachelor of Music Arts", "Musikakademie Odessa", "2017-2021", ""),
            ("Fachschulausbildung im Bereich Musik", "Musikschule V.S. Kosenko, Zhytomyr", "2013-2017", ""),
        ],
        "cap_title": "KOMPETENZEN",
        "caps": [
            ("Führung & Verantwortung", "Leitung von 8 Musikern · Führung einer Trompetensektion"),
            ("Organisation & Planung", "80+ Veranstaltungen · Projektplanung · Budget"),
            ("Kommunikation", "Kundenakquise · Teamkoordination · Konfliktmanagement"),
            ("Digital & Lernen", "Web-Grundlagen · digitale Recherche · KI-gestützte Workflows"),
        ],
        "lang_title": "SPRACHEN",
        "langs": "Deutsch B2 · Ukrainisch Muttersprache · Russisch Muttersprache",
    },
    "en": {
        "filename": "andrii-makukha-en.pdf",
        "title": "Andrii Makukha - CV",
        "subtitle": "PROFESSIONAL PROFILE",
        "tagline": "Music · Leadership · Organisation · Digital & AI",
        "location": "Bernau am Chiemsee · Germany",
        "profile_title": "PROFILE",
        "profile": "Professional background in music, leadership and organisation. As first trumpet, section leader and founder of an eight-person band, I developed precision, responsibility and coordination under real performance pressure. Today I extend that experience through digital tools, web fundamentals and AI-assisted workflows.",
        "exp_title": "PROFESSIONAL EXPERIENCE",
        "experience": [
            ("Hardy Orchestra", "First Trumpet & Section Leader", "2017-2022", "Led the trumpet section in complex productions, including Rammstein-Symphonien. Precision and resilience under live-performance pressure."),
            ("Symbioz Band", "Founder & Band Leader", "09/2019-02/2022", "Led 8 musicians and organised 80+ events. Responsible for project planning, budgets, client acquisition, conflict management and quality assurance."),
            ("Gastronomy", "Courier / Delivery Driver", "2022-2024", ""),
        ],
        "dev_title": "SELECTED DEVELOPMENT",
        "dev": [
            ("ReSchuhe", "Concept · brand · digital product", "2026 · in development", "Business planning, brand development, product structure and AI-assisted execution. Public website and customer-facing digital experience in development."),
            ("Portfolio v2", "Interactive professional profile", "2026", "Concept, structure, content direction, design decisions and final evaluation directed by me; AI support for research, exploration, technical implementation and QA."),
        ],
        "edu_title": "EDUCATION & TRAINING",
        "education": [
            ("Fullstack JavaScript (Certificate)", "Hillel IT School", "2024-2025", "JavaScript (ES6+), frontend/backend fundamentals, React & Node.js (basic), REST APIs, databases (fundamentals), Git."),
            ("Bachelor of Music Arts", "Odessa Music Academy", "2017-2021", ""),
            ("Vocational Music Education", "V.S. Kosenko Music School, Zhytomyr", "2013-2017", ""),
        ],
        "cap_title": "CAPABILITIES",
        "caps": [
            ("Leadership & responsibility", "Led 8 musicians · led a trumpet section"),
            ("Organisation & planning", "80+ events · project planning · budgets"),
            ("Communication", "Client acquisition · team coordination · conflict management"),
            ("Digital & learning", "Web fundamentals · digital research · AI-assisted workflows"),
        ],
        "lang_title": "LANGUAGES",
        "langs": "German B2 · Ukrainian native · Russian native",
    },
    "ru": {
        "filename": "andrii-makukha-ru.pdf",
        "title": "Andrii Makukha - Резюме",
        "subtitle": "ПРОФЕССИОНАЛЬНЫЙ ПРОФИЛЬ",
        "tagline": "Музыка · Руководство · Организация · Цифровые инструменты и ИИ",
        "location": "Bernau am Chiemsee · Германия",
        "profile_title": "ПРОФИЛЬ",
        "profile": "Профессиональный опыт в музыке, руководстве и организации. Как первый трубач, руководитель секции и основатель группы из восьми музыкантов я развил точность, ответственность и навыки координации в условиях реальной сценической нагрузки. Сегодня я дополняю этот опыт цифровыми инструментами, веб-основами и рабочими процессами с поддержкой ИИ.",
        "exp_title": "ПРОФЕССИОНАЛЬНЫЙ ОПЫТ",
        "experience": [
            ("Hardy Orchestra", "Первый трубач и руководитель секции", "2017-2022", "Руководство секцией труб в сложных постановках, включая Rammstein-Symphonien. Точность и выдержка под нагрузкой живых выступлений."),
            ("Symbioz Band", "Основатель и руководитель", "09/2019-02/2022", "Руководство командой из 8 музыкантов; организация 80+ мероприятий. Ответственность за проектное планирование, бюджет, привлечение клиентов, решение конфликтов и контроль качества."),
            ("Гастрономия", "Курьер / водитель доставки", "2022-2024", ""),
        ],
        "dev_title": "ИЗБРАННОЕ РАЗВИТИЕ",
        "dev": [
            ("ReSchuhe", "Концепция · бренд · цифровой продукт", "2026 · в разработке", "Бизнес-планирование, развитие бренда, структура продукта и реализация с поддержкой ИИ. Публичный сайт и цифровой пользовательский опыт находятся в разработке."),
            ("Portfolio v2", "Интерактивный профессиональный профиль", "2026", "Концепцию, структуру, направление контента, дизайн-решения и финальную оценку определял я; ИИ помогал с исследованием, поиском вариантов, технической реализацией и проверкой качества."),
        ],
        "edu_title": "ОБРАЗОВАНИЕ И ОБУЧЕНИЕ",
        "education": [
            ("Fullstack JavaScript (сертификат)", "Hillel IT School", "2024-2025", "JavaScript (ES6+), основы фронтенда и бэкенда, React & Node.js (базовый уровень), REST API, основы баз данных, Git."),
            ("Bachelor of Music Arts", "Музыкальная академия Одессы", "2017-2021", ""),
            ("Профессиональное музыкальное образование", "Музыкальная школа им. В. С. Косенко, Житомир", "2013-2017", ""),
        ],
        "cap_title": "КОМПЕТЕНЦИИ",
        "caps": [
            ("Руководство и ответственность", "Команда из 8 музыкантов · руководство секцией труб"),
            ("Организация и планирование", "80+ мероприятий · проектное планирование · бюджет"),
            ("Коммуникация", "Привлечение клиентов · координация команды · решение конфликтов"),
            ("Цифровые инструменты и обучение", "Веб-основы · цифровое исследование · рабочие процессы с поддержкой ИИ"),
        ],
        "lang_title": "ЯЗЫКИ",
        "langs": "Немецкий B2 · Украинский родной · Русский родной",
    },
}

def wrap(text, font, size, maxw):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        candidate = word if not cur else cur + " " + word
        if stringWidth(candidate, font, size) <= maxw:
            cur = candidate
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines

def draw_wrapped(c, text, x, y, maxw, font="Noto", size=8, leading=10.5, color=GRAPH, max_lines=None):
    c.setFillColor(color)
    c.setFont(font, size)
    lines = wrap(text, font, size, maxw)
    if max_lines:
        lines = lines[:max_lines]
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y

def label(c, text, x, y):
    c.setFillColor(BRASS)
    c.setFont("NotoBold", 7.4)
    c.drawString(x, y, text)
    c.setStrokeColor(LINE)
    c.setLineWidth(.45)
    c.line(x + 122, y + 2, W - 42, y + 2)
    return y - 16

def entry(c, org, role, date, body, x, y, maxw, compact=False):
    c.setFillColor(INK)
    c.setFont("NotoBold", 9.15)
    c.drawString(x, y, org)
    if date:
        c.setFillColor(MUTED)
        c.setFont("NotoMed", 7.4)
        c.drawRightString(x + maxw, y, date)
    y -= 11
    c.setFillColor(NAVY)
    c.setFont("NotoMed", 8.05)
    c.drawString(x, y, role)
    y -= 9.8
    if body:
        y = draw_wrapped(c, body, x, y, maxw, "Noto", 7.45, 9.4, GRAPH)
    return y - (3 if compact else 5)

def make(data):
    path = OUT / data["filename"]
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle(data["title"])
    c.setAuthor("Andrii Makukha")
    c.setSubject("Professional CV")

    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.rect(0, H - 116, W, 116, fill=1, stroke=0)
    c.setFillColor(BRASS)
    c.rect(42, H - 116, 76, 3, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.setFont("NotoBold", 22)
    c.drawString(42, H - 47, "ANDRII MAKUKHA")
    c.setFillColor(BRASS)
    c.setFont("NotoBold", 7.4)
    c.drawString(42, H - 67, data["subtitle"])
    c.setFillColor(PAPER)
    c.setFont("Noto", 8.25)
    c.drawString(42, H - 85, data["tagline"])

    right = W - 42
    c.setFont("Noto", 7.15)
    c.setFillColor(PAPER)
    for y, value in [
        (H - 45, data["location"]),
        (H - 57, CONTACT["phone"]),
        (H - 69, CONTACT["email"]),
        (H - 81, CONTACT["github"]),
        (H - 93, CONTACT["portfolio"]),
    ]:
        c.drawRightString(right, y, value)

    c.linkURL("tel:+4915125233241", (right - 130, H - 62, right, H - 52))
    c.linkURL("mailto:" + CONTACT["email"], (right - 185, H - 74, right, H - 64))
    c.linkURL("https://" + CONTACT["github"], (right - 165, H - 86, right, H - 76))
    c.linkURL("https://" + CONTACT["portfolio"], (right - 205, H - 98, right, H - 88))

    x, maxw, y = 42, W - 84, H - 143
    y = label(c, data["profile_title"], x, y)
    y = draw_wrapped(c, data["profile"], x, y, maxw, "Noto", 8.05, 10.55, GRAPH)
    y -= 8

    y = label(c, data["exp_title"], x, y)
    for item in data["experience"]:
        y = entry(c, *item, x, y, maxw)

    y = label(c, data["dev_title"], x, y)
    for item in data["dev"]:
        y = entry(c, *item, x, y, maxw, compact=True)

    y = label(c, data["edu_title"], x, y)
    for name, org, date, body in data["education"]:
        c.setFillColor(INK)
        c.setFont("NotoBold", 8.55)
        c.drawString(x, y, name)
        c.setFillColor(MUTED)
        c.setFont("NotoMed", 7.35)
        c.drawRightString(x + maxw, y, date)
        y -= 10
        c.setFillColor(GRAPH)
        c.setFont("Noto", 7.45)
        c.drawString(x, y, org)
        y -= 9.5
        if body:
            y = draw_wrapped(c, body, x, y, maxw, "Noto", 7.3, 9.1, GRAPH)
        y -= 4

    y = label(c, data["cap_title"], x, y)
    for capability, evidence in data["caps"]:
        c.setFillColor(INK)
        c.setFont("NotoBold", 7.75)
        c.drawString(x, y, capability)
        capw = stringWidth(capability, "NotoBold", 7.75)
        c.setFillColor(GRAPH)
        c.setFont("Noto", 7.2)
        c.drawString(x + capw + 10, y, evidence)
        y -= 13.5

    y -= 2
    y = label(c, data["lang_title"], x, y)
    c.setFillColor(GRAPH)
    c.setFont("Noto", 7.6)
    c.drawString(x, y, data["langs"])

    c.setFillColor(MUTED)
    c.setFont("Noto", 6.4)
    c.drawString(42, 22, "Human-directed · AI-assisted")
    c.drawRightString(W - 42, 22, "Portfolio · 2026")
    c.save()

for item in DATA.values():
    make(item)
