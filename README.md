# Swallow's Rose — Website

Statische One-Pager-Website für die melodische Punkrock-Band **Swallow's Rose**
aus Bayern. Gebaut mit Astro + Tailwind v4, dark theme, DSGVO-freundlich
(keine Tracker, keine Google Fonts, Spotify-Embed nur auf Klick).

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
| Booking-Mail     | `src/data/site.ts` (`band`)            | `bookingEmail` durch reale Adresse ersetzen.                           |
| Social-Links     | `src/data/site.ts` (`links`)           | Instagram, YouTube, Apple Music, Shop.                                 |
| Spotify-Embed    | `src/data/site.ts` (`spotifyEmbedSrc`) | `REPLACE_WITH_SPOTIFY_ARTIST_ID` durch die echte Artist-ID tauschen.   |
| Bandmitglieder   | `src/data/site.ts` (`members`)         | Reihenfolge + Fotos (`/public/img/band/<name>.jpg`).                   |
| Tourdaten        | `src/data/site.ts` (`tourDates`)       | Drei Platzhalter durch echte Termine ersetzen. Leeres Array → "Dates announced soon". |
| Bandtext DE/EN   | `src/data/copy.ts` (`about`)           | EN-Version durch die offizielle englische Fassung ersetzen.            |
| Site-URL         | `astro.config.mjs` (`SITE`)            | Final-Domain eintragen, damit Sitemap + Canonical stimmen.             |

### Bilder

Platzhalter-Pfade, die noch befüllt werden müssen (PNG/JPG, dunkel-tauglich):

- `public/img/hero.jpg` — Pressefoto / Logo-Background (≈ 2400×1600)
- `public/img/og.jpg` — Open-Graph-Bild für Social Shares (1200×630)
- `public/img/band/<name>.jpg` — Portraits, Hochformat (≈ 600×800)
- `public/img/merch/product-1.jpg` … `product-3.jpg` — Produktbilder (quadratisch, ≈ 600×600)

Solange die Dateien fehlen, blendet das CSS die `<img>`-Tags via
`onerror="this.style.display='none'"` aus — die Layouts bleiben heil.

## Sprach-Toggle DE/EN

Rein clientseitig. Pro übersetztem Textfragment liegen zwei
`<span data-lang="de">` / `<span data-lang="en">` im DOM, eines davon ist via
`hidden` ausgeblendet. Das Layout-Skript schaltet beim Klick um und speichert
die Wahl in `localStorage` unter `sr-lang`.

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

`/impressum` und `/datenschutz` sind als Platzhalter vorhanden und MÜSSEN
vor dem Go-Live mit echten Angaben befüllt werden (§ 5 TMG bzw. DSGVO).

## Tech-Stack

- **Astro 6** (statisch, keine schweren Frameworks)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **@fontsource/oswald** + **@fontsource-variable/inter-tight** (lokale Fonts, DSGVO)
- **@astrojs/sitemap** für Sitemap + Robots
- **prefers-reduced-motion** wird respektiert (alle Animationen aus)
- **IntersectionObserver** für Scroll-Reveals (vanilla, kein Lib)
