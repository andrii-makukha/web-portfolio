from pathlib import Path
import re

PAGES = {
    Path("de/datenschutz/index.html"): {
        "section": '''      <section class="legal-section">
        <h2>2. Hosting über Vercel</h2>
        <p>Diese Website wird über <strong>Vercel</strong> bereitgestellt. Anbieter ist Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA.</p>
        <p>Bei der Bereitstellung der Website verarbeitet Vercel technisch erforderliche Daten. Nach der Datenschutzerklärung von Vercel können hierzu insbesondere die IP-Adresse, aus der IP-Adresse abgeleitete Standortinformationen, System- und Konfigurationsinformationen sowie Anfrage-, Nutzungs- und Protokolldaten gehören. Diese Verarbeitung dient unter anderem dazu, die angeforderten Inhalte auszuliefern sowie Sicherheit, Stabilität und Betrieb der Hosting-Infrastruktur zu gewährleisten.</p>
        <p>Die Nutzung von Vercel und die damit verbundene Verarbeitung erfolgen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse besteht in einer sicheren, stabilen und technisch zuverlässigen Bereitstellung dieses Portfolios.</p>
        <p>Eine Verarbeitung personenbezogener Daten kann auch in den USA oder anderen Ländern außerhalb des Europäischen Wirtschaftsraums stattfinden. Vercel beschreibt für internationale Datenübermittlungen geeignete Schutzmechanismen, darunter Standardvertragsklauseln, und erklärt die Einhaltung des EU-U.S. Data Privacy Framework.</p>
        <p>Weitere Informationen finden Sie in der <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">Datenschutzerklärung von Vercel</a>.</p>
      </section>''',
        "retention_old": "Auf die Speicherdauer technischer Daten bei GitHub hat der Websitebetreiber keinen unmittelbaren Einfluss; hierfür gelten die Angaben von GitHub.",
        "retention_new": "Auf die Speicherdauer technischer Daten bei Vercel hat der Websitebetreiber keinen unmittelbaren Einfluss; hierfür gelten die Angaben von Vercel.",
    },
    Path("en/privacy/index.html"): {
        "section": '''      <section class="legal-section">
        <h2>2. Hosting with Vercel</h2>
        <p>This website is hosted with <strong>Vercel</strong>. The provider is Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States.</p>
        <p>Vercel processes technical data required to deliver the website. According to Vercel's Privacy Notice, this may include an End User's IP address, location information derived from the IP address, system and configuration information, and request, usage and log information. This processing is used, among other purposes, to deliver the requested content and to maintain the security, stability and operation of the hosting infrastructure.</p>
        <p>The use of Vercel and the associated processing are based on Art. 6(1)(f) GDPR. The legitimate interest is the secure, stable and technically reliable provision of this portfolio.</p>
        <p>Personal data may also be processed in the United States or other countries outside the European Economic Area. Vercel describes appropriate safeguards for international data transfers, including Standard Contractual Clauses, and states that it complies with the EU-U.S. Data Privacy Framework.</p>
        <p>More information is available in the <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">Vercel Privacy Notice</a>.</p>
      </section>''',
        "retention_old": "The website operator has no direct control over GitHub's retention of technical data; GitHub's own information applies.",
        "retention_new": "The website operator has no direct control over Vercel's retention of technical data; Vercel's own information applies.",
    },
    Path("ru/privacy/index.html"): {
        "section": '''      <section class="legal-section">
        <h2>2. Хостинг Vercel</h2>
        <p>Сайт размещён на платформе <strong>Vercel</strong>. Провайдер: Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, США.</p>
        <p>При предоставлении сайта Vercel обрабатывает технические данные, необходимые для его работы. Согласно политике конфиденциальности Vercel, к ним могут относиться IP-адрес посетителя, сведения о местоположении, определённые на основании IP-адреса, данные о системе и конфигурации, а также сведения о запросах, использовании и журналы событий. Такая обработка используется, в частности, для передачи запрошенного содержимого и обеспечения безопасности, стабильности и работы инфраструктуры хостинга.</p>
        <p>Использование Vercel и связанная с ним обработка осуществляются на основании ст. 6 абз. 1 лит. f GDPR/DSGVO. Законный интерес состоит в безопасной, стабильной и технически надёжной работе портфолио.</p>
        <p>Персональные данные могут также обрабатываться в США или других странах за пределами Европейской экономической зоны. Vercel описывает применяемые механизмы защиты международной передачи данных, включая стандартные договорные положения, и заявляет о соблюдении EU-U.S. Data Privacy Framework.</p>
        <p>Подробнее: <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">политика конфиденциальности Vercel</a>.</p>
      </section>''',
        "retention_old": "На сроки хранения технических данных GitHub владелец сайта напрямую не влияет; применяются правила GitHub.",
        "retention_new": "На сроки хранения технических данных Vercel владелец сайта напрямую не влияет; применяются правила Vercel.",
    },
}

section_pattern = re.compile(
    r'      <section class="legal-section">\n        <h2>2\..*?</section>',
    re.DOTALL,
)

for path, values in PAGES.items():
    text = path.read_text(encoding="utf-8")
    updated, count = section_pattern.subn(values["section"], text, count=1)
    if count != 1:
        raise SystemExit(f"Expected exactly one hosting section in {path}; found {count}")
    if values["retention_old"] not in updated:
        raise SystemExit(f"Expected old retention text not found in {path}")
    updated = updated.replace(values["retention_old"], values["retention_new"], 1)
    if "GitHub Pages" in updated:
        raise SystemExit(f"Legacy GitHub Pages hosting text remains in {path}")
    if "https://vercel.com/legal/privacy-notice" not in updated:
        raise SystemExit(f"Vercel Privacy Notice link missing in {path}")
    path.write_text(updated, encoding="utf-8")

print("Migrated DE/EN/RU privacy hosting disclosures to Vercel.")
