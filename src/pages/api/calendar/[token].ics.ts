// Personal iCal subscription feed. Public endpoint (calendar apps can't send
// auth), secured by the unguessable per-member token in the URL.
import type { APIRoute } from 'astro';
import { findUserByIcalToken, listEvents } from '../../../lib/events';
import { buildICS } from '../../../lib/ical';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const token = params.token ?? '';
  const user = token ? await findUserByIcalToken(token) : null;
  if (!user) return new Response('Not found', { status: 404 });

  const ics = buildICS(await listEvents());
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="swallowsrose.ics"',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
