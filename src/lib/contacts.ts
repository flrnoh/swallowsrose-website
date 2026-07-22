// Shared contact directory — the band's address book for /backend/kontakte and
// the /api/contacts/* endpoints. Promoters, venues, peer bands, agencies, tech.
// Any logged-in member may edit. Purely backend; nothing leaks to the website.
import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { auth } from './auth';
import { db, schema } from './db';

export const KINDS = ['veranstalter', 'festival', 'venue', 'band', 'agentur', 'label', 'technik', 'sonstiges'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  veranstalter: 'Veranstalter',
  festival: 'Festival',
  venue: 'Venue',
  band: 'Band',
  agentur: 'Agentur',
  label: 'Label',
  technik: 'Technik',
  sonstiges: 'Sonstiges',
};

export type ContactInput = {
  name: string;
  kind?: Kind;
  person?: string | null;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  city?: string | null;
  notes?: string | null;
};

/** Any authenticated member (the directory is shared, everyone may edit). */
export async function requireUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return (session?.user as { id: string; role?: string } | undefined) ?? null;
}

export function validate(input: Partial<ContactInput>): string | null {
  if (!input.name || !input.name.trim()) return 'Name ist Pflicht.';
  if (input.kind && !KINDS.includes(input.kind)) return 'Ungültige Kategorie.';
  return null;
}

function toRow(input: ContactInput) {
  return {
    name: input.name.trim(),
    kind: input.kind && KINDS.includes(input.kind) ? input.kind : 'sonstiges',
    person: input.person?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    instagram: input.instagram?.trim() || null,
    city: input.city?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

/** All contacts, grouped-friendly order: by kind, then name (case-insensitive). */
export async function listContacts() {
  const rows = await db.select().from(schema.contact).orderBy(asc(schema.contact.name));
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
}

export async function createContact(input: ContactInput, userId: string) {
  await db.insert(schema.contact).values({ id: randomUUID(), ...toRow(input), createdBy: userId });
}

/** Bulk insert (used by the paste-import). Caller must validate each input. */
export async function createContacts(inputs: ContactInput[], userId: string) {
  if (inputs.length === 0) return 0;
  const rows = inputs.map((input) => ({ id: randomUUID(), ...toRow(input), createdBy: userId }));
  await db.insert(schema.contact).values(rows);
  return rows.length;
}

/** Partial update — only fields present in the payload are touched. */
export async function updateContact(id: string, input: Partial<ContactInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name.trim();
  if (input.kind !== undefined && KINDS.includes(input.kind)) set.kind = input.kind;
  if ('person' in input) set.person = input.person?.trim() || null;
  if ('email' in input) set.email = input.email?.trim() || null;
  if ('phone' in input) set.phone = input.phone?.trim() || null;
  if ('instagram' in input) set.instagram = input.instagram?.trim() || null;
  if ('city' in input) set.city = input.city?.trim() || null;
  if ('notes' in input) set.notes = input.notes?.trim() || null;
  await db.update(schema.contact).set(set).where(eq(schema.contact.id, id));
}

export async function deleteContact(id: string) {
  await db.delete(schema.contact).where(eq(schema.contact.id, id));
}
