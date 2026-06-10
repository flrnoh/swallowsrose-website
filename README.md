# Swallow's Rose — Website

Statische One-Pager-Website für die melodische Punkrock-Band **Swallow's Rose**
aus dem Bayerischen Wald. Gebaut mit Astro + Tailwind v4, dark theme nach der
Farbsprache des Album-Artworks „The Beginning". Datensparsam: keine Cookies,
keine Google Fonts, Spotify-Embed nur auf Klick, anonymisierte
Reichweitenmessung via Vercel Analytics (cookielos, kein Personenbezug).

## Lokal entwickeln

Voraussetzung: Node ≥ 22.12.

```bash
npm install
npm run dev      # startet Astro auf http://localhost:4321
npm run build    # baut die Produktionsdateien nach ./dist
npm run preview  # serviert ./dist lokal zum Gegenchecken
```

## Wo welche Inhalte austauschen

Alle anpassbaren Inhalte liegen zentral unter `src/data/`. Such im Code nach
`TODO`, da steht jeweils, was getauscht werden muss.

| Was              | Datei                                  | Hinweis                                                                |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Album, Pre-Order | `src/data/site.ts` (`album`)           | Release-Datum, Pre-Order-URL, Label.                                   |
| Booking-Mail     | `src/data/site.ts` (`band`)            | `bookingEmail` bestätigen / ersetzen.                                  |
| Social-Links     | `src/data/site.ts` (`links`)           | Instagram, YouTube, Apple Music (TODO), Shop, Bandcamp.                |
| Spotify-Embed    | `src/data/site.ts` (`spotifyEmbedSrc`) | Aktuell verdrahtet auf Artist-ID `6tJMwSfznqmbuudBww2qUw`.             |
| Bandmitglieder   | `src/data/site.ts` (`members`)         | Reihenfolge + Fotos (`/public/img/band/<name>.jpg`).                   |
| Tourdaten        | `src/data/site.ts` (`tourDates`)       | 12 echte Daten gepflegt. Ticket-URLs ergänzen, sobald verfügbar (leerer String → "Bald"). Leeres Array → "Dates announced soon". |
| Bandtext DE/EN   | `src/data/copy.ts` (`about`)           | EN-Version durch die offizielle englische Fassung ersetzen.            |
| Site-URL         | `astro.config.mjs` (`SITE`)            | Aktuell auf `swallowsrose-website.vercel.app` gesetzt; auf Custom-Domain wechseln, sobald gebunden. |

### Bilder

Platzhalter-Pfade, die noch befüllt werden müssen (PNG/JPG, dunkel-tauglich):

- `public/img/hero.jpg` — Album-Artwork „The Beginning" oder ein dunkles
  Pressefoto (≈ 2400×1600). Wird mit 40 % Deckkraft als Hero-Backdrop gelegt.
- `public/img/og.jpg` — Open-Graph-Bild für Social Shares (1200×630). Tipp:
  Front-Cover des Albums mit Headline „SWALLOW'S ROSE — THE BEGINNING".
- `public/img/band/<name>.jpg` — Portraits, Hochformat (≈ 600×800). Die
  Vornamen sind: `dominik`, `manuel`, `korbi`, `fabi`, `michael`.
- `public/img/merch/product-1.jpg` … `product-3.jpg` — Produktbilder
  (quadratisch, ≈ 600×600).

**Quellen:**
- Bandfotos: <https://www.picdrop.com/flogge/gd7DKjaWCw> — pro Mitglied einen
  Crop ziehen und unter dem oben genannten Pfad ablegen.
- Album-Artwork: Cover-PNG/JPG des Releases „The Beginning" (Uncle M Music,
  06.03.2026).

Solange die Dateien fehlen, blendet `onerror="this.style.display='none'"`
die `<img>`-Tags aus — die Layouts bleiben heil.

## Sprach-Toggle DE/EN

Rein clientseitig. Pro übersetztem Textfragment liegen zwei
`<span data-lang="de">` / `<span data-lang="en">` im DOM, eines davon ist via
`hidden` ausgeblendet. Das Layout-Skript schaltet beim Klick um und speichert
die Wahl in `localStorage` unter `sr-lang`.

## Designtokens

In `src/styles/global.css` als Tailwind-v4-`@theme`-Variablen:

| Token                | Wert      | Verwendung                                |
| -------------------- | --------- | ----------------------------------------- |
| `--color-ink`        | `#0a1424` | Page-Hintergrund (midnight navy)          |
| `--color-ink-soft`   | `#14213a` | Surfaces (Cards, Spotify-Slot)            |
| `--color-cream`      | `#f4ece0` | Text / Hauptfarbe                         |
| `--color-flame`      | `#e87a8e` | Primärer Akzent (Coral Sunset)            |
| `--color-flame-soft` | `#f29bab` | Hover-Akzent                              |
| `--color-teal`       | `#5fc1d1` | Sekundärer Akzent (sparsam, Cometen-Trail)|
| `--font-display`     | Big Shoulders Display 700/900 | Headlines, Buttons, Nav   |
| `--font-body`        | Inter Tight Variable          | Body / UI                 |

## Deploy (Vercel)

Erstes Mal:

```bash
vercel              # verlinkt das Projekt mit einem Vercel-Projekt
vercel --prod       # Produktions-Deploy
```

Danach genügt `vercel --prod` für jeden neuen Stand. Alternativ Repo auf
GitHub pushen und Vercel auf den Branch hängen — dann läuft jeder Push
automatisch durch.

## Rechtliches (DE-Pflicht!)

`/impressum` und `/datenschutz` sind aktuell als Platzhalter angelegt und
MÜSSEN vor dem Go-Live mit echten Angaben gefüllt werden (§ 5 TMG bzw. DSGVO).
Den Bestandstext der alten Seite (`https://www.swallowsrose.com/impressum/`
bzw. `/datenschutz/`) am einfachsten manuell rüberkopieren — die Seite blockt
automatische Fetches.

## Tech-Stack

- **Astro 6** (statisch, keine schweren Frameworks)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **@fontsource/big-shoulders-display** + **@fontsource-variable/inter-tight**
  (lokale Fonts, DSGVO)
- **@astrojs/sitemap** für Sitemap + Robots
- **prefers-reduced-motion** wird respektiert (alle Animationen aus)
- **IntersectionObserver** für Scroll-Reveals (vanilla, kein Lib)
- **Spotify-Embed** wird erst nach Klick geladen (DSGVO-freundlich)
