// Central content/config for the site. Edit values here, not in components.

export const band = {
  name: "Swallow's Rose",
  origin: 'Bayern, Germany',
  // TODO: replace with the real booking address
  bookingEmail: 'booking@swallowsrose.com',
};

export const album = {
  title: 'The Beginning',
  releaseDate: '2026-03-06',
  releaseLabelDE: '6. März 2026',
  releaseLabelEN: 'March 6th, 2026',
  preOrderUrl: 'https://shop.uncle-m.com/cat/index/sCategory/2233',
  label: 'Uncle M Music',
};

export const links = {
  instagram: 'https://www.instagram.com/swallowsrose/',
  youtube: 'https://www.youtube.com/channel/UCWJp8pyROUpRSmTRXNFiTxA',
  // TODO: fill in once available
  appleMusic: '#',
  shop: 'https://shop.uncle-m.com/cat/index/sCategory/2233',
};

// TODO: replace with the real Spotify artist URI / playlist embed src.
// Example artist embed: https://open.spotify.com/embed/artist/<ARTIST_ID>?utm_source=generator
export const spotifyEmbedSrc =
  'https://open.spotify.com/embed/artist/REPLACE_WITH_SPOTIFY_ARTIST_ID?utm_source=generator&theme=0';

export type Member = {
  name: string;
  role: string;
  /** path under /public */
  photo: string;
};

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
  /** "#" if no ticket link yet */
  ticketUrl: string;
  /** Optional note shown as a small tag */
  note?: string;
};

// TODO: replace these three placeholder rows with real tour dates.
// Tour with Massendefekt and 100 Kilo Herz, autumn 2026.
export const tourDates: TourDate[] = [
  {
    date: '2026-10-15',
    dateLabelDE: '15. Okt 2026',
    dateLabelEN: 'Oct 15, 2026',
    city: 'TODO – Stadt',
    venue: 'TODO – Venue',
    ticketUrl: '#',
    note: 'w/ Massendefekt',
  },
  {
    date: '2026-10-22',
    dateLabelDE: '22. Okt 2026',
    dateLabelEN: 'Oct 22, 2026',
    city: 'TODO – Stadt',
    venue: 'TODO – Venue',
    ticketUrl: '#',
    note: 'w/ 100 Kilo Herz',
  },
  {
    date: '2026-11-05',
    dateLabelDE: '5. Nov 2026',
    dateLabelEN: 'Nov 5, 2026',
    city: 'TODO – Stadt',
    venue: 'TODO – Venue',
    ticketUrl: '#',
  },
];

export const nav = [
  { href: '#music', labelDE: 'Musik', labelEN: 'Music' },
  { href: '#about', labelDE: 'Band', labelEN: 'Band' },
  { href: '#tour', labelDE: 'Tour', labelEN: 'Tour' },
  { href: '#merch', labelDE: 'Merch', labelEN: 'Merch' },
  { href: '#contact', labelDE: 'Kontakt', labelEN: 'Contact' },
] as const;
