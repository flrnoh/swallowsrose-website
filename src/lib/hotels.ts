// Pre-filled deep-links to hotel search — no API, no stored data, just a URL the
// user clicks (opens in their browser). Saves manually re-searching booking.com
// for every gig. Given a venue city + gig date (+ optional coordinates).
import type { LatLng } from './geo';

const ymd = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** Booking.com search pre-filled with the city, check-in = gig day, check-out = +1. */
export function bookingUrl(city: string, checkin: Date): string {
  const checkout = new Date(checkin);
  checkout.setUTCDate(checkout.getUTCDate() + 1);
  const p = new URLSearchParams({
    ss: city,
    checkin: ymd(checkin),
    checkout: ymd(checkout),
    group_adults: '5', // band-sized default; adjustable on the site
  });
  return `https://www.booking.com/searchresults.html?${p.toString()}`;
}

/** Google Maps "hotels" — centred on the venue coordinates when we have them. */
export function mapsUrl(city: string, coord?: LatLng | null): string {
  if (coord) return `https://www.google.com/maps/search/hotels/@${coord[0]},${coord[1]},12z`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Hotels ${city}`)}`;
}
