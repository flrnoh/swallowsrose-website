// Central content/config for the site. Edit values here, not in components.

export const band = {
  name: "Swallow's Rose",
  origin: 'Bayerischer Wald',
  // Offizielle Kontaktadresse aus dem Impressum.
  bookingEmail: 'swallowsrose@web.de',
  bookingPhone: '+49 171 2262714',
};

export const album = {
  title: 'The Beginning',
  releaseDate: '2026-03-06',
  releaseLabelDE: '6. März 2026',
  releaseLabelEN: 'March 6th, 2026',
  orderUrl: 'https://shop.uncle-m.com/cat/index/sCategory/2233',
  label: 'Uncle M Music',
};

export const links = {
  instagram: 'https://www.instagram.com/swallowsrose/',
  youtube: 'https://www.youtube.com/channel/UCWJp8pyROUpRSmTRXNFiTxA',
  // TODO: Apple-Music-Artist-URL ergänzen, sobald verfügbar.
  appleMusic: '#',
  shop: 'https://shop.uncle-m.com/cat/index/sCategory/2233',
  bandcamp: 'https://unclem.bandcamp.com/album/the-beginning',
};

// Spotify artist embed — wird erst nach Klick geladen (DSGVO, siehe Music.astro).
export const spotifyEmbedSrc =
  'https://open.spotify.com/embed/artist/6tJMwSfznqmbuudBww2qUw?utm_source=generator&theme=0';

// Regionaler Kulturkalender ("Kultur am Regen") — direkt im Crew-Kalender
// (/backend/kalender) eingebettet, damit Mitglieder tagesaktuell sehen, was in
// der Region los ist, ohne die Seite zu verlassen. Bewusst client-seitig: der
// Browser des Mitglieds lädt ihn (kein Server-Egress — unser Backend ist
// egress-frei und käme an die Quelle eh nicht ran), und wie beim Spotify-Embed
// erst nach Klick (DSGVO — vorher wird nichts übertragen).
//
// Quelle jederzeit hier umstellbar — falls die Seite Einbettung blockt
// (X-Frame-Options / CSP frame-ancestors), greift im Kalender automatisch der
// sichtbare „im neuen Tab öffnen"-Fallback. Alternativen für den Bayerischen Wald:
//   'https://veranstaltungen.erlebe.bayern/regen/'   (offizielles Bayern-Portal)
//   'https://www.regen.de/startseite/veranstaltungen' (Stadt Regen)
//   'https://veranstaltungen.meinestadt.de/regen/alle/alle'
export const regionalCalendar = {
  /** Anzeigename der Quelle (steht klein unter dem Kalender). */
  source: 'Arberkultur — Kunst & Kultur im Landkreis Regen',
  /** Region-Label fürs Kärtchen. */
  region: 'Bayerischen Wald & Landkreis Regen',
  /** Seite, die nach Klick ins iframe geladen wird. */
  embedUrl: 'https://www.arberkultur.de/erleben/kulturkalender/',
  /** Fallback-Link (neuer Tab), falls die Seite sich nicht einbetten lässt. */
  openUrl: 'https://www.arberkultur.de/erleben/kulturkalender/',
};

export type Member = {
  name: string;
  role: string;
  /** path under /public */
  photo: string;
};

// Fotos aus dem picdrop-Set zuschneiden und unter dem jeweiligen Pfad ablegen:
// https://www.picdrop.com/flogge/gd7DKjaWCw
export const members: Member[] = [
  { name: 'Dominik', role: 'Vocals', photo: '/img/band/dominik.jpg' },
  { name: 'Manuel', role: 'Rhythm Guitar / Backing Vocals', photo: '/img/band/manuel.jpg' },
  { name: 'Korbi', role: 'Bass / Backing Vocals', photo: '/img/band/korbi.jpg' },
  { name: 'Fabi', role: 'Lead Guitar', photo: '/img/band/fabi.jpg' },
  { name: 'Michael', role: 'Drums', photo: '/img/band/michael.jpg' },
];

export type TourDate = {
  /** ISO date — used for sorting and machine-readable output */
  date: string;
  /** Human label, localised per language */
  dateLabelDE: string;
  dateLabelEN: string;
  city: string;
  venue: string;
  /** Leave empty string to hide the ticket link */
  ticketUrl: string;
  /** True when there's no advance sale, only door / box office on the night. */
  boxOffice?: boolean;
  /** Optional note shown as a small tag (e.g. festival / support) — bilingual */
  noteDE?: string;
  noteEN?: string;
};

// Ticket-Links: leerer String → kein Link (zeigt "Bald"). Past dates werden
// clientseitig automatisch ausgegraut (siehe Layout.astro).
export const tourDates: TourDate[] = [
  {
    date: '2026-05-09',
    dateLabelDE: '09. Mai 2026',
    dateLabelEN: 'May 9, 2026',
    city: 'München',
    venue: 'Atelier von Simon Marchner',
    ticketUrl: '',
  },
  {
    date: '2026-06-03',
    dateLabelDE: '03. Juni 2026',
    dateLabelEN: 'Jun 3, 2026',
    city: 'München',
    venue: 'Backstage',
    ticketUrl: '',
  },
  {
    date: '2026-06-05',
    dateLabelDE: '05. Juni 2026',
    dateLabelEN: 'Jun 5, 2026',
    city: 'Bischofsmais',
    venue: 'Rock the Hill Festival',
    ticketUrl: 'https://rockthehill.de/tickets/',
    noteDE: 'Festival',
    noteEN: 'Festival',
  },
  {
    date: '2026-06-06',
    dateLabelDE: '06. Juni 2026',
    dateLabelEN: 'Jun 6, 2026',
    city: 'Plzeň (CZ)',
    venue: 'Kapouk Vita Leto Festival',
    ticketUrl: '',
    noteDE: 'Festival',
    noteEN: 'Festival',
  },
  {
    date: '2026-06-27',
    dateLabelDE: '27. Juni 2026',
    dateLabelEN: 'Jun 27, 2026',
    city: 'Neumarkt',
    venue: 'Paradise Shitty Open Air',
    ticketUrl: 'https://www.paradise-shitty.de/tickets',
    noteDE: 'Open Air',
    noteEN: 'Open Air',
  },
  {
    date: '2026-07-05',
    dateLabelDE: '05. Juli 2026',
    dateLabelEN: 'Jul 5, 2026',
    city: 'Empfenbach',
    venue: 'Festival Holledau',
    ticketUrl: 'https://festival-holledau.de/tickets/',
    noteDE: 'Festival',
    noteEN: 'Festival',
  },
  {
    date: '2026-07-11',
    dateLabelDE: '11. Juli 2026',
    dateLabelEN: 'Jul 11, 2026',
    city: 'Schlüchtern',
    venue: 'Rock am Hinkelhof',
    ticketUrl: 'https://www.eventim.de/event/rock-am-hinkelhof-2026-rock-am-hinkelhof-20497606/',
    noteDE: 'Festival',
    noteEN: 'Festival',
  },
  {
    date: '2026-08-21',
    dateLabelDE: '21. August 2026',
    dateLabelEN: 'Aug 21, 2026',
    city: 'Stetten / Mühldorf',
    venue: 'Soizfest',
    ticketUrl: 'https://www.eventim-light.com/de/a/663f4ed75085a858ac97e8c8/e/69a460d990e1773b398ee34a',
    noteDE: 'Festival',
    noteEN: 'Festival',
  },
  {
    date: '2026-09-12',
    dateLabelDE: '12. September 2026',
    dateLabelEN: 'Sep 12, 2026',
    city: 'Zollernalb',
    venue: 'U&D Zollernalb',
    ticketUrl: 'https://u-d-zollernalb.de/',
    noteDE: 'Eintritt frei',
    noteEN: 'Free entry',
  },
  {
    date: '2026-09-26',
    dateLabelDE: '26. September 2026',
    dateLabelEN: 'Sep 26, 2026',
    city: 'Marktschorgast / Kulmbach',
    venue: 'Falling Leaves Festival',
    // Kein VVK — nur Abendkasse.
    ticketUrl: '',
    boxOffice: true,
    noteDE: 'Festival',
    noteEN: 'Festival',
  },
  {
    date: '2026-10-02',
    dateLabelDE: '02. Oktober 2026',
    dateLabelEN: 'Oct 2, 2026',
    city: 'Leipzig',
    venue: 'Bandhaus',
    ticketUrl: 'https://bandcommunity-leipzig.org/veranstaltungen/',
  },
  {
    date: '2026-11-07',
    dateLabelDE: '07. November 2026',
    dateLabelEN: 'Nov 7, 2026',
    city: 'Salzbergen',
    venue: 'EMS Noise Rock Fest',
    ticketUrl: 'https://emsnoise-rockfest.de/',
    noteDE: 'Festival',
    noteEN: 'Festival',
  },
];

export const nav = [
  { href: '#music', labelDE: 'Musik', labelEN: 'Music' },
  { href: '#about', labelDE: 'Band', labelEN: 'Band' },
  { href: '#tour', labelDE: 'Tour', labelEN: 'Tour' },
  { href: '#merch', labelDE: 'Merch', labelEN: 'Merch' },
  { href: '#contact', labelDE: 'Kontakt', labelEN: 'Contact' },
] as const;
