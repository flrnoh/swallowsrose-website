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

## Mitglieder-Bereich (Crew-Login)

Neben der öffentlichen Seite gibt es einen geschützten Backend-Bereich für
Bandmitglieder — die Basis der künftigen Band-Verwaltung (Gig-Pipeline,
Setlists, Finanzen …). Login ist **invite-only per Magic-Link**.

**Stack:** Better Auth + Drizzle. DB: **PGlite lokal** (in-process, `./.pglite`),
**Neon Postgres in Prod** — Umschaltung allein über `DATABASE_URL`. Astro läuft
weiter statisch; nur `/login`, `/backend/*` und `/api/auth/*` rendern on-demand
(`export const prerender = false` + `@astrojs/vercel`-Adapter).

**Wichtige Dateien:**
| Datei | Zweck |
| --- | --- |
| `src/lib/db/schema.ts` | Drizzle-Schema (user/session/account/verification + role/instrument) |
| `src/lib/db/index.ts` | DB-Factory (PGlite vs. Neon) |
| `src/lib/auth.ts` | Better-Auth-Server: Magic-Link, invite-only, `disableSignUp` |
| `src/lib/email.ts` | Magic-Link-Versand (Dev: Konsole, Prod: Brevo-SMTP) |
| `src/middleware.ts` | Schützt `/backend/*`, legt `locals.user` ab |
| `scripts/seed-members.ts` | Bandmitglieder anlegen (invite) |

**Lokal starten (null Setup):**
```bash
npm run db:setup   # legt Tabellen in ./.pglite an
npm run db:seed    # legt Bandmitglieder an (echte Mails eintragen!)
npm run dev        # Login unter /login — Magic-Link erscheint in der Konsole
```

**Migration + Seed in Prod:** laufen **automatisch beim Vercel-Deploy** über
`scripts/deploy-setup.ts` (npm-Script `vercel-build`). Grund: die Vercel-Env-Vars
sind „sensitive"/write-only — `vercel env pull` liefert sie leer, man kommt lokal
nicht an `DATABASE_URL`. Der Build läuft dort, wo die URL existiert. Non-fatal:
DB-Fehler brechen den (statischen) Site-Deploy nicht.

**Mitglieder pflegen:** Roster steht als JSON in der Vercel-Env-Var
`CREW_MEMBERS` (NICHT im Repo — public!). Format:
`[{"name":"Dominik","email":"…","role":"member","instrument":"Vocals"}]`.
Beim nächsten Deploy wird abgeglichen (additiv/idempotent; Entfernen = manuell
in der DB). Lokal ohne `CREW_MEMBERS` greift ein harmloser Dev-Fallback.

**Prod-Env (Vercel):** `DATABASE_URL` (Neon-Integration), `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL=https://swallowsrose.com`, `BREVO_SMTP_HOST/USER/PASS`,
`MAIL_FROM` (in Brevo verifizierter Absender), `CREW_MEMBERS`. Vorlage:
`.env.example`.

**Schema ändern:** `src/lib/db/schema.ts` → `npm run db:generate`
(neue SQL-Migration) → `npm run db:setup`.

## Arbeiten mit Nicht-Tech-Kollegen (z. B. Dominik)

Wenn der User **kein Git/GitHub kann** — was bei einem Bandmitglied
normal ist — übernimmst du den kompletten Workflow im Hintergrund:

1. **Niemals nach Git-Begriffen fragen.** Frag nicht „Soll ich auf einen
   Feature-Branch wechseln?" — sondern entscheide selbst und mach's.
2. **Nach jeder inhaltlichen Änderung:** Branch anlegen
   (`fix/...` oder `feat/...`), committen mit Conventional-Commit-Stil,
   pushen, PR via `gh pr create` aufmachen — alles selbstständig.
3. **Erkläre dem User in normaler Sprache, was du gemacht hast** — z. B.
   „Ich habe einen neuen Tour-Termin für Wien hinzugefügt und einen
   Vorschlag (Pull Request) erstellt. Florian schaut den an und schaltet
   ihn live. Du musst nichts weiter tun." Keine Sätze wie „PR #42 ist
   gemerged".
4. **Vor Pushes immer die lokale Vorschau anbieten:** sag „möchtest du
   das vorher selbst angucken? Ich starte dir den lokalen Dev-Server."
   Wenn ja → `npm run dev` und sag, er soll http://localhost:4321
   öffnen.
5. **Mehrere Änderungen sammeln, EIN PR.** Wenn der User mehrere Sachen
   hintereinander ändert, mach das in einem einzigen Branch und einem
   einzigen PR. Frag „Bist du mit deinen Änderungen für jetzt durch?"
   bevor du den PR aufmachst.
6. **Bei Unsicherheit:** zeig die geplante Änderung **vor dem Commit** als
   Vorschau (Markdown-Block, kein Code-Jargon) und lass ihn nicken.

## Wenn du unsicher bist

Frag explizit nach. Lieber eine kurze Rückfrage als ein Commit, der auf
Live geht. Florian (`@flrnoh`) reviewt jeden PR.
