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
| Tourdaten (öffentlich)      | Crew-Kalender `/backend/kalender` (nicht site.ts!) |
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

**Nicht mehr in `site.ts`** — Tourdaten kommen jetzt aus dem Crew-Kalender.
Im Backend unter **`/backend/kalender`** einen Termin anlegen und **„Öffentlich"**
ankreuzen; er erscheint automatisch im Tourkalender auf swallowsrose.com
(die Tour-Section holt sie live von `/api/tour.json`, nur kommende Termine).
`src/data/site.ts` → `tourDates` ist nur noch der einmalige Seed-Bestand
(via `scripts/seed-tourdates.ts` beim Deploy in die DB übernommen).

Tickets-Zelle: `ticketUrl` gesetzt → „Tickets →"-Link, sonst „Bald" / „Soon".

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

### Kalender & iCal (`/backend/kalender`)

Geteilter Band-Kalender (Gigs/Proben/Sonstiges). **Alle Mitglieder** dürfen
Termine anlegen/bearbeiten/löschen. Kern: `src/lib/events.ts`, API
`/api/events/{create,update,delete}` (eingeloggt = erlaubt, sonst 403).
- **iCal-Abo**: pro Mitglied ein geheimer Feed `/api/calendar/<token>.ics`
  (`src/lib/ical.ts`), zum Abonnieren in Apple/Google Kalender — one-way,
  aktualisiert sich automatisch (Frequenz bestimmt die Kalender-App).
- **Öffentlich**: Termine mit `isPublic` erscheinen im Website-Tourkalender
  (`/api/tour.json` → `Tour.astro` client-seitig, nur kommende **& bestätigte**).

### Gig-Pipeline (`/backend/gigs`)

Booking-Workflow auf demselben `event`-Modell (nur `type='gig'`). Status:
`anfrage → angebot → bestaetigt → gespielt` (+ `abgesagt`), plus `fee` (Gage €)
und Kontakt-Felder. Status-Wechsel: `/api/events/status`; Anlegen/Bearbeiten
über die normalen Event-Endpoints (partielles Update — Kalender-Edits fassen
Pipeline-Felder nicht an).
- **Trennung**: Nur **bestätigte/gespielte** Gigs gelten als echte Termine —
  `listCalendarEvents()` speist Kalender + iCal, `listPublicUpcoming()` den
  Tourkalender. Anfragen/Angebote/Absagen bleiben in der Pipeline (kein Leak
  auf die Website, kein Verstopfen des Kalenders).
- **Kontakt-Verknüpfung** (`event.contactId` → `contact`, `set null` beim Löschen
  des Kontakts): optionaler Picker im Formular (nach `kind` gruppiert) neben den
  Freitext-Kontaktfeldern. Der Gig zeigt „↳ <Kontakt>" (→ `/backend/kontakte`),
  der Kontakt seinerseits seine Gigs. Siehe Kontakte.

### Gig-Sheets (`/backend/gig-sheets`)

Show-Tag-Infoblatt pro **bestätigtem** Gig (Load-in, Zeitplan, Anfahrt, Rider) —
ein optionales Sheet je Event (1:1, `gig_sheet`-Tabelle, unique je `event_id`,
Cascade-Delete am Event). **Alle Mitglieder** dürfen bearbeiten. Kern:
`src/lib/gigsheets.ts`, API `/api/gigsheet/save` (eingeloggt = Upsert, sonst 403).
- **Quelle**: `listSheetGigs()` liefert nur Gigs mit Status `bestaetigt`/`gespielt`
  (`CONFIRMED_STATUSES`) — Anfragen/Angebote haben (noch) kein Sheet.
- **Felder** (alle Freitext, in `SHEET_FIELDS`): `loadIn`, `soundcheck`, `doors`,
  `stageTime`, `setLength`, `address`, `parking`, `accommodation`, `catering`,
  `backline`, `contactOnSite`, `notes`. Zeitangaben sind bewusst Text
  („16:00", „ab 17 Uhr", „TBC"), relativ zum Gig-Tag.
- **Hotel-Deeplinks** (`src/lib/hotels.ts`): im aufgeklappten Sheet oben ein
  „Hotels in <Stadt>"-Balken mit **Booking.com** (vorausgefüllt: Stadt + Check-in
  = Gig-Tag) und **Google Maps** (auf Venue-Koordinaten zentriert). Nur Links, die
  im Browser öffnen — keine API, kein Egress, nichts gespeichert (spart das
  manuelle booking.com-Durchforsten). Gleiche Links auch auf den Tourplaner-Stopps.
- Rein Backend, **nichts davon leakt auf die öffentliche Website**.

### Verfügbarkeit (`/backend/verfuegbarkeit`)

Ampel pro anstehendem Termin (`listUpcomingEvents()` = kommende echte Events).
Jedes Mitglied setzt **ja/vielleicht/nein** (ein Klick), alle sehen die
Crew-Übersicht (farbige Chips). `availability`-Tabelle (unique je event+member,
Upsert), API `/api/availability/set` (eingeloggt = eigene Antwort).
`src/lib/availability.ts`.

### Setlists (`/backend/setlists`)

Songbibliothek + benannte, geordnete Setlists. **Alle Mitglieder** dürfen
bearbeiten. Kern: `src/lib/setlists.ts`.
- **Songbibliothek** (`song`-Tabelle): Titel, `artist` (nur bei Covern), Länge
  (`durationSeconds`, Eingabe als `m:ss`), Notizen (Tuning/Key/Cues), `active`.
  API `/api/setlist/song` (action `create`/`update`/`delete`).
- **Setlists** (`setlist` + `setlist_item`): Übersicht/Anlegen auf
  `/backend/setlists`, Editor auf `/backend/setlists/[id]` mit **Drag-and-drop**-
  Reihenfolge, Song-Picker aus der Bibliothek, Cue je Slot, laufender
  Gesamtlänge. Optional mit einem Gig verknüpfbar (`eventId`, `set null` beim
  Löschen des Events). APIs: `/api/setlist/save` (Kopf), `/api/setlist/delete`,
  `/api/setlist/items` (action `add`/`remove`/`note`/`reorder`).
- **Seed** (`scripts/seed-songs.ts`, läuft im Deploy): Album „The Beginning"
  (Spotify) + Live-Repertoire (Downfall, Promises, So Sail On, Live For Today)
  + Cover „Boys of Summer". Idempotent über `source_key`. Dazu einmalig die
  echte **„Live-Set (35 Min)"**-Setlist (nur wenn der Titel noch nicht existiert).
- Rein Backend, **nichts davon leakt auf die öffentliche Website**.

### Finanzen (`/backend/finanzen`)

Gemeinsames Kassenbuch: Einnahmen (Gage, Merch, Zuschuss) und Ausgaben (Fahrt,
Unterkunft, Equipment, Merch-Einkauf, Gebühren …). **Alle Mitglieder** dürfen
buchen. Kern: `src/lib/finance.ts`, APIs `/api/finance/save` + `/api/finance/delete`
(eingeloggt = erlaubt, sonst 403).
- **Beträge in Cent** (`amount_cents`, integer) — nie Float. `parseEuro` nimmt
  „250", „12,50", „1.234,56" entgegen, `fmtEuro` gibt de-DE-Währung aus.
  `kind` (`einnahme`/`ausgabe`) trägt das Vorzeichen; gespeichert wird positiv.
- **Zahlungsart** (`method`): `sumup` (Default — die Band nutzt SumUp für
  Rechnungen & Merch), `bar`, `ueberweisung`, `sonstiges`. Die Übersicht zeigt
  „Einnahmen nach Zahlungsart" (SumUp-Abgleich).
- **Kassenstand** = Einnahmen − Ausgaben; **Gagen-Split** = Kassenstand ÷
  Mitgliederzahl (`getMemberCount()`), live auf der Seite.
- **Bulk-Import** („aus Tabelle einfügen"): Tab-getrennte Zeilen (Datum · Art ·
  Betrag · Bemerkung) einfügen → Vorschau (Kategorie wird aus „Art" erraten) →
  `/api/finance/import` (Batch, validiert atomar). So kommen echte Zahlen in die
  **private DB**, ohne sie ins (öffentliche) Repo zu committen.
- Optional an einen Gig gekoppelt (`eventId`, `set null` beim Löschen des Gigs).
- **Keine SumUp-API-Anbindung** (Egress-Policy blockt externe Dienste; keine
  OAuth-Keys) — bewusst manuelles Buchen, abgleichbar mit dem SumUp-Report.
- Rein Backend, **nichts davon leakt auf die öffentliche Website**.

### Kontakte (`/backend/kontakte`)

Adressbuch der Band — Veranstalter, Venues, Peer-/Supportbands, Agenturen,
Technik. **Alle Mitglieder** dürfen bearbeiten. Kern: `src/lib/contacts.ts`,
APIs `/api/contacts/save` (Upsert) + `/api/contacts/delete` (eingeloggt = erlaubt,
sonst 403).
- **Felder** (`contact`-Tabelle): `name` (Pflicht), `kind`
  (`veranstalter`/`festival`/`venue`/`band`/`agentur`/`label`/`technik`/`sonstiges`),
  `person` (Ansprechpartner), `email`, `phone`, `instagram`, `city`, `notes`.
  Ansicht ist nach `kind` gruppiert; **Kategorie-Filter-Chips** (Alle + je Kind
  mit Anzahl) und Live-Suche filtern clientseitig und kombiniert (Schnittmenge)
  über alle Felder. `KINDS`/`KIND_LABEL` in `src/lib/contacts.ts` steuern
  Reihenfolge + Beschriftung.
- **Gig-Verknüpfung**: jeder Kontakt zeigt seine verknüpften Gigs („Gigs: …" →
  `/backend/gigs#gig-<id>`); umgekehrt verlinkt ein Gig auf seinen Kontakt
  (siehe Gig-Pipeline, `event.contactId`).
- **Seed** (`scripts/seed-contacts.ts`, läuft im Deploy): Adressbuch kommt aus
  der Env-Var **`CREW_CONTACTS`** (JSON-Array, **nur in Vercel** — dieses Repo ist
  public, genau wie bei `CREW_MEMBERS`). Idempotent über `source_key`; lokal
  greift ein harmloser Dev-Fallback (`DEV_CONTACTS` in `src/data/contacts.ts`).
  Erstbestand aus den Google-Drive-Listen (Veranstalter aus „Tourdates 2026",
  Peer-Bands aus „Supportband (GER)", ~280 Festivals aus „FESTIVALS 2026" als
  `kind:'festival'`); danach im Backend pflegen.
- **Datenschutz**: enthält personenbezogene Kontaktdaten Dritter → **niemals im
  Repo** (public!), nur in der Env-Var. Rein intern (invite-only, kein Versand an
  Externe, **nichts leakt auf die Website**) — dieselbe Nutzung wie zuvor in der
  Google-Tabelle, kein neuer Auftragsverarbeiter.

### Tourplaner (`/backend/tourplaner` + `/backend/tourplaner/generator`)

**Vorwärts** (`/backend/tourplaner`): bestätigte Gigs (`CONFIRMED_STATUSES`) als
Route auf einer **DACH-Karte** (Inline-SVG, keine externen Kartenkacheln),
chronologisch, mit **Luftlinien-Distanzen** (Haversine) je Etappe + Summe.
Read-only. Der Länderumriss (DE gefüllt + AT/CH/CZ als Kontext) liegt gebündelt in
`src/data/dach-outline.json` — **einmalig** aus Natural-Earth 50m (public domain)
extrahiert, Douglas-Peucker-vereinfacht und mit **derselben Projektion** wie die
Punkte zu SVG-Pfaden vorgerechnet (Projektions-Konstanten W=420/H=512/PAD=26 +
BBOX müssen zwischen Karte und Outline-Build übereinstimmen).

**Generativ** (`/backend/tourplaner/generator`, Phase 2): Startpunkt + Umkreis +
Anzahl Shows (+ Kategorie/„nur mit Mail") → ein **Nearest-Neighbor + 2-opt**-Lauf
über die Kontakt-Koordinaten stellt die kürzeste fahrbare Route aus Booking-Zielen
zusammen (Karte + Etappen + Pitch-Mails). **Rein clientseitig** (Regler →
Live-Neuberechnung, kein Roundtrip); der Server bettet die vorprojizierten
Kandidaten (Kontakte mit Coords, ~247) als JSON ein.
- **Datums-Filter + Festival-Wissensbasis**: bei gesetztem Zeitraum fallen Festivals
  raus, deren **Monat** nicht ins Fenster passt (Venues/Veranstalter sind nicht
  saisongebunden → bleiben). Quelle ist jetzt `src/data/festivals.json`
  (`sourceKey → { month, outdoor, verified, window? }`), gebaut von
  `scripts/build-festivals.mjs` (kein PII → im Repo). `outdoor` trennt Open-Air von
  Halle, `verified` unterscheidet **gegen die Festivalseite geprüfte** Einträge
  (Monat + Indoor/Outdoor + `window`-Label) von **heuristisch geschätzten**
  (Nov–Feb ist immer Halle — kein deutsches Open-Air im Winter; Namens-Tokens
  verfeinern den Rest). Der Generator hängt die Felder per `sourceKey` an die
  Kandidaten und zeigt sie je Stopp als Badge (☀ Open-Air / ⌂ Halle · ✓ verlässlich
  / ~ geschätzt) — so traut niemand einem geratenen Monat. **Neue/korrigierte
  Festivals**: `VERIFIED`-Overlay in `build-festivals.mjs` pflegen und
  `node scripts/build-festivals.mjs` laufen lassen (idempotent, liest den Monat aus
  `festivals.json`). Löste die frühere, aus Trennzeilen geratene `festival-months.json` ab.
- **Manuell anpassen**: jeder Stopp hat ✕ (entfernen), „Weitere in der Nähe" bietet
  die nächstgelegenen Pool-Kandidaten zum Hinzufügen; danach re-2opt. „↻ Neu
  vorschlagen" setzt auf den Auto-Vorschlag zurück (Regler-Änderung ebenso).
- **Sammelmail**: `mailto:` mit allen Route-Mails im **BCC** + Pitch-Vorlage
  (Betreff/Body); plus „E-Mails kopieren". Der Pitch nennt echte Belege
  (Album/Uncle M/SBÄM, Tour-Historie Dropkick Murphys/Flogging Molly/Less Than Jake),
  macht das Ja leicht (Headliner **oder** Support, faire Gage, eigene Anlage) und
  zieht Zeitraum + Region live rein. Die Belegzahlen (Streaming/Draw) trägt die Band
  **einmal in die `PROOF`-Konstante** in `generator.astro` ein — leer = die Zeile
  fällt weg (kein Platzhalter landet im Versand).
- **Vollständig self-contained, kein externer Dienst** (Egress-frei): Kern
  `src/lib/geo.ts` — `geocode(city)`, `haversineKm`, `projectUnit` (DACH-BBox →
  Unit-Space). Koordinaten aus `src/data/geo-cities.json`: normalisierte
  Stadt→[lat,lng]-Teilmenge (~228 Orte, 6 KB), **einmalig** aus den öffentlichen
  GeoNames-Postleitzahl-Dumps (DE/AT/CZ, CC-BY) für unsere Gig-/Kontakt-Städte
  erzeugt (Achtung Namensdubletten: Oberhausen war fälschlich das bayerische statt
  des Ruhrgebiets — bei neuen Städten die richtige Region prüfen). Nicht gematchte
  Städte (~18 %, obskure Festival-Weiler/Tippfehler)
  plotten einfach nicht (Hinweis „N ohne verortbare Stadt").
- **Normalisierung** (`normCity`, muss synchron zur Bau-Logik von
  `geo-cities.json` bleiben): lower, ß→ss, Diakritika strippen, „(AT)/(CZ)"
  entfernen, nur `[a-z0-9]`. Neue Städte → Teilmenge neu erzeugen.
- **Geplant:** Phase 3 = Hotel-/Gastro-Kontakt-Kategorien pro Stopp; mehr
  **verifizierte** Festivals ins `VERIFIED`-Overlay (aktuell 5 web-geprüft, Rest
  geschätzt); ausländische Festival-Städte (SI/weitere) in `geo-cities.json`
  aufnehmen, damit z. B. Punk Rock Holiday plottet.

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
