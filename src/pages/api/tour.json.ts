// Public feed for the marketing site's tour list — upcoming public events.
import type { APIRoute } from 'astro';
import { listPublicUpcoming } from '../../lib/events';

export const prerender = false;

const tz = 'Europe/Berlin';
const fmtDE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: tz });
const fmtEN = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz });
const fmtISO = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz });

export const GET: APIRoute = async () => {
  const events = await listPublicUpcoming();
  const dates = events.map((e) => ({
    date: fmtISO.format(e.startAt), // YYYY-MM-DD
    dateLabelDE: fmtDE.format(e.startAt),
    dateLabelEN: fmtEN.format(e.startAt),
    city: e.city ?? '',
    venue: e.location ?? '',
    ticketUrl: e.ticketUrl ?? '',
    note: e.notes ?? '',
  }));

  return new Response(JSON.stringify({ dates }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // CDN-cache briefly so the static homepage stays fast; updates within ~1 min.
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
};
