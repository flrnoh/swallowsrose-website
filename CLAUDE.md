# CLAUDE.md — Projekt-Kontext für Claude Code

Hi Claude — willkommen im Repo. Hier steht alles, was du brauchst, um beim
Pflegen der Swallow's-Rose-Bandsite zu helfen.

## Was ist das hier

Statische One-Pager-Website unter https://swallowsrose.com, deployed auf
Vercel. Quellcode liegt unter https://github.com/flrnoh/swallowsrose-website.

Stack: **Astro 6** + **Tailwind v4** + **TypeScript (strict)**.
Inhalte sind komplett bilingual (DE/EN, clientseitig umschaltbar).
Dark Theme nach der Farbsprache des Album-Artworks "The Beginning".

## Setup beim ersten Mal

```bash
git clone https://github.com/flrnoh/swallowsrose-website.git
cd swallowsrose-website
npm install
npm run dev       # http://localhost:4321
```

Voraussetzungen: Node ≥ 22.12, Git, ein GitHub-Account mit Schreibrechten
am Repo. Für lokale Bildverarbeitung (Crops, Favicons) wird Python 3 mit
Pillow + OpenCV-headless gebraucht — nicht zwingend für reine Text-Edits.

## Wo welche Inhalte leben

Alle änderbaren Inhalte sind zentralisiert. Such IMMER zuerst in
`src/data/` — sehr selten muss man wirklich in eine Komponente.

| Was anpassen                | Datei                                  |
| --------------------------- | -------------------------------------- |
| Tourdaten, Tickets, Notes   | `src/data/site.ts` → `tourDates`       |
| Bandmitglieder + Rollen     | `src/data/site.ts` → `members`         |
| Social-Links, Shop, Spotify | `src/data/site.ts` → `links`, `spotifyEmbedSrc` |
| Booking-Mail, Telefon       | `src/data/site.ts` → `band`            |
| Album-Infos, Pre-Order-URL  | `src/data/site.ts` → `album`           |
| Bio-Text DE + EN            | `src/data/copy.ts` → `about`           |
| Hero-Headline, CTAs         | `src/data/copy.ts` → `hero`            |
| Section-Headlines, Tooltips | `src/data/copy.ts` → `music/tour/...`  |
| Marquee-Slogans             | `src/pages/index.astro`                |
| Impressum                   | `src/pages/impressum.astro`            |
| Datenschutz                 | `src/pages/datenschutz.astro`          |
| Site-URL (Sitemap)          | `astro.config.mjs` → `SITE`            |
| Theme-Tokens (Farben, Font) | `src/styles/global.css` → `@theme`     |

Bilder liegen unter `public/img/`:
- `band/*.jpg`     — Mitglieder-Portraits (600×800, Coral-Navy-Duotone via CSS)
- `merch/*.jpg`    — Uncle-M-Produktbilder (600×600 weißer BG)
- `hero.jpg`       — Bandshot (2400×1200, 2:1)
- `cover.jpg`      — Album-Cover (800×800)
- `og.jpg`         — Open-Graph-Bild (1200×630)
- Favicons im Wurzelverzeichnis von `public/`

## Workflow — PR-basiert, niemals direkt auf main pushen

`main` ist branch-protected. Änderungen kommen ausschließlich per
Feature-Branch + Pull Request rein.

```bash
git checkout -b fix/tour-date-update
# … Änderungen machen …
git add -A
git commit -m "fix(tour): replace Bandhaus venue"
git push -u origin fix/tour-date-update
gh pr create --title "fix(tour): replace Bandhaus venue" --body "…"
```

Florian reviewt + merget. Nach dem Merge:

```bash
git checkout main
git pull
git branch -d fix/tour-date-update
```

Vercel deployed automatisch beim Merge auf main — meistens innerhalb von
60 Sekunden ist die Änderung live unter swallowsrose.com.

## Commit-Konvention

Conventional Commits-Stil, Präfix erklärt den Bereich:

- `feat(tour): …`      — neues Tour-Date, neuer Status
- `fix(merch): …`      — kaputter Produktlink
- `i18n: …`            — DE/EN-Anpassungen
- `style: …`           — rein visuelle Polituren
- `chore(deploy): …`   — Konfiguration, DNS, Vercel-Settings
- `docs: …`            — README, dieser File, kommentare

## Häufige Mini-Tasks

### Tour-Date hinzufügen

`src/data/site.ts` → neues Objekt ins `tourDates`-Array. Beispiel:

```ts
{
  date: '2026-12-15',
  dateLabelDE: '15. Dezember 2026',
  dateLabelEN: 'Dec 15, 2026',
  city: 'Wien',
  venue: 'Arena',
  ticketUrl: 'https://oeticket.com/...',
  noteDE: 'Club',
  noteEN: 'Club',
},
```

Zustände der Tickets-Zelle (priorisiert):
1. `ticketUrl` gesetzt → klickbarer "Tickets →" Link
2. `boxOffice: true` → "Abendkasse" / "Box office"
3. Sonst → "Bald" / "Soon"

Vergangene Daten werden client-seitig automatisch durchgestrichen.

### Bio-Text ändern (DE + EN)

`src/data/copy.ts` → `about.bodyDE` und `about.bodyEN`. **Immer beides
pflegen** — Sprach-Toggle erwartet beide Varianten.

### Bandmember-Foto austauschen

Neues Bild als 600×800 unter `public/img/band/<name>.jpg` ablegen
(Dateinamen bleibt gleich). Astro lädt es beim nächsten Build automatisch.
Crops mit Face-Centering kann man via `/tmp/srb_facecrop.py`-Pattern
generieren, falls aus einer Gruppenaufnahme.

### Marquee-Slogans tauschen

`src/pages/index.astro` → die `items`-Arrays der `<Marquee>`-Komponenten.

## DSGVO / Datenschutz — was die Seite tut

- **Vercel Analytics** läuft (cookielos, anonymisiert) — in
  Datenschutz §4 dokumentiert. Bei jedem Feature-Add, das Daten an
  externe Anbieter sendet, Datenschutz unbedingt mit anpassen.
- **Spotify-Embed** lädt erst nach Klick.
- **Schriften lokal** über `@fontsource`, niemals Google-Fonts-CDN.
- **Kein Cookie-Banner** notwendig, weil keine Cookies gesetzt werden.

## Deployment + Domain

- Vercel-Projekt: `flrnohs-projects/swallowsrose-website`
- Production-Domain: `swallowsrose.com` (Apex), `www.swallowsrose.com` (308 → Apex)
- DNS bei Vercel (Vercel ist Registrar seit Juni 2026)
- Mail-Forwarding: ImprovMX (kostenlos, Aliase → `swallowsrose@web.de`)
- SPF erlaubt sowohl ImprovMX als auch web.de als Sender

## Wenn was Größeres ansteht

- **Neue Section auf der Seite** → Komponente in `src/components/`,
  bilingual Copy in `src/data/copy.ts`, in `src/pages/index.astro`
  einbinden. Section-Marker `// 0X — Tag` als Header verwenden.
- **Style-Token (Farbe, Font) ändern** → `src/styles/global.css`
  unter `@theme` — wirkt auf die ganze Seite.
- **Domain / DNS / SSL anfassen** → Vercel CLI (`vercel dns …`)
  oder Vercel-Dashboard. Vorsicht bei MX/SPF — kaputt = Mails weg.

## Wenn du unsicher bist

Frag explizit nach. Lieber eine kurze Rückfrage als einen Commit, der
auf Live geht. Florian (`@flrnoh`) reviewt jeden PR.
