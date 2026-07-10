import type { APIRoute } from 'astro';
import { requireBandleader, setRole, ROLES, json, type Role } from '../../../lib/crew';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const caller = await requireBandleader(request.headers);
  if (!caller) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const userId = String(body.userId ?? '');
  const role = body.role as Role;
  if (!userId) return json({ error: 'Mitglied fehlt.' }, 400);
  if (!ROLES.includes(role)) return json({ error: 'Ungültige Rolle.' }, 400);

  // Don't let a bandleader demote themselves (avoid locking out the admin area).
  if (userId === caller.id && role !== 'bandleader') {
    return json({ error: 'Du kannst dir selbst nicht die Bandleader-Rolle entziehen.' }, 400);
  }

  await setRole(userId, role);
  return json({ ok: true });
};
