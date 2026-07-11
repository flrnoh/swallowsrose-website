// Band finances — a shared ledger of income (gigs, merch, invoices) and
// expenses. Any logged-in member may edit. Powers /backend/finanzen and the
// /api/finance/* endpoints. Amounts are whole cents; `kind` carries the sign.
import { desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, schema } from './db';

export const KINDS = ['einnahme', 'ausgabe'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  einnahme: 'Einnahme',
  ausgabe: 'Ausgabe',
};

// Categories per kind (value → label). Kept here so page + API agree.
export const CATEGORIES: Record<Kind, { value: string; label: string }[]> = {
  einnahme: [
    { value: 'gage', label: 'Gage' },
    { value: 'merch', label: 'Merch' },
    { value: 'zuschuss', label: 'Zuschuss / Förderung' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ],
  ausgabe: [
    { value: 'fahrt', label: 'Fahrt' },
    { value: 'unterkunft', label: 'Unterkunft' },
    { value: 'verpflegung', label: 'Verpflegung' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'produktion', label: 'Produktion / Technik' },
    { value: 'merch-einkauf', label: 'Merch-Einkauf' },
    { value: 'werbung', label: 'Werbung / Promo' },
    { value: 'gebuehren', label: 'Gebühren' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ],
};

const ALL_CATEGORY_VALUES = new Set(
  [...CATEGORIES.einnahme, ...CATEGORIES.ausgabe].map((c) => c.value),
);
const CATEGORY_LABEL = new Map(
  [...CATEGORIES.einnahme, ...CATEGORIES.ausgabe].map((c) => [c.value, c.label]),
);
export const categoryLabel = (v: string) => CATEGORY_LABEL.get(v) ?? v;

export const METHODS = [
  { value: 'sumup', label: 'SumUp' },
  { value: 'bar', label: 'Bar' },
  { value: 'ueberweisung', label: 'Überweisung' },
  { value: 'sonstiges', label: 'Sonstiges' },
] as const;
const METHOD_LABEL = new Map(METHODS.map((m) => [m.value, m.label]));
const METHOD_VALUES = new Set(METHODS.map((m) => m.value));
export const methodLabel = (v: string | null | undefined) => (v ? METHOD_LABEL.get(v) ?? v : '');

export type FinanceInput = {
  kind: Kind;
  category?: string;
  title: string;
  amountCents: number;
  method?: string | null;
  occurredAt: string; // ISO
  eventId?: string | null;
  notes?: string | null;
};

export function validate(input: Partial<FinanceInput>): string | null {
  if (!input.kind || !KINDS.includes(input.kind)) return 'Art (Einnahme/Ausgabe) fehlt.';
  if (!input.title || !input.title.trim()) return 'Bezeichnung ist Pflicht.';
  if (typeof input.amountCents !== 'number' || !Number.isFinite(input.amountCents) || input.amountCents <= 0)
    return 'Betrag muss größer als 0 sein.';
  if (!input.occurredAt || isNaN(new Date(input.occurredAt).getTime())) return 'Ungültiges Datum.';
  if (input.method && !METHOD_VALUES.has(input.method)) return 'Ungültige Zahlungsart.';
  return null;
}

function toRow(input: FinanceInput) {
  const category = input.category && ALL_CATEGORY_VALUES.has(input.category) ? input.category : 'sonstiges';
  return {
    kind: input.kind,
    category,
    title: input.title.trim(),
    amountCents: Math.round(input.amountCents),
    method: input.method && METHOD_VALUES.has(input.method) ? input.method : null,
    occurredAt: new Date(input.occurredAt),
    eventId: input.eventId || null,
    notes: input.notes?.trim() || null,
  };
}

export async function listEntries() {
  return db
    .select()
    .from(schema.financeEntry)
    .orderBy(desc(schema.financeEntry.occurredAt), desc(schema.financeEntry.createdAt));
}

export async function createEntry(input: FinanceInput, userId: string) {
  const id = randomUUID();
  await db.insert(schema.financeEntry).values({ id, ...toRow(input), createdBy: userId });
  return id;
}

/** Bulk insert (used by the paste-import). Caller must validate each input. */
export async function createEntries(inputs: FinanceInput[], userId: string) {
  if (inputs.length === 0) return 0;
  const rows = inputs.map((input) => ({ id: randomUUID(), ...toRow(input), createdBy: userId }));
  await db.insert(schema.financeEntry).values(rows);
  return rows.length;
}

export async function updateEntry(id: string, input: FinanceInput) {
  await db
    .update(schema.financeEntry)
    .set({ ...toRow(input), updatedAt: new Date() })
    .where(eq(schema.financeEntry.id, id));
}

export async function deleteEntry(id: string) {
  await db.delete(schema.financeEntry).where(eq(schema.financeEntry.id, id));
}

/** Number of band members — the split divisor for the Gagen-Split. */
export async function getMemberCount() {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(schema.user);
  return Math.max(1, Number(row?.n ?? 1));
}

export type FinanceSummary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  perMemberCents: number;
  memberCount: number;
  incomeByMethod: { method: string; label: string; cents: number }[];
};

/** Totals + per-member split from a list of entries. */
export function summarize(entries: Awaited<ReturnType<typeof listEntries>>, memberCount: number): FinanceSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  const byMethod = new Map<string, number>();
  for (const e of entries) {
    if (e.kind === 'einnahme') {
      incomeCents += e.amountCents;
      const m = e.method ?? 'sonstiges';
      byMethod.set(m, (byMethod.get(m) ?? 0) + e.amountCents);
    } else {
      expenseCents += e.amountCents;
    }
  }
  const balanceCents = incomeCents - expenseCents;
  return {
    incomeCents,
    expenseCents,
    balanceCents,
    memberCount,
    perMemberCents: Math.round(balanceCents / memberCount),
    incomeByMethod: [...byMethod.entries()]
      .map(([method, cents]) => ({ method, label: methodLabel(method) || 'Sonstiges', cents }))
      .sort((a, b) => b.cents - a.cents),
  };
}

// ── Money formatting (shared server/client) ─────────────────────────────────

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
/** cents → "1.234,56 €" */
export function fmtEuro(cents: number): string {
  return EUR.format(cents / 100);
}

/** Accepts "12", "12,50", "12.50", "1.234,56" → cents, or null if invalid. */
export function parseEuro(text: string): number | null {
  let t = text.trim().replace(/[€\s]/g, '');
  if (!t) return null;
  if (t.includes(',') && t.includes('.')) {
    // Last-occurring separator is the decimal point; the other groups thousands.
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (t.includes(',')) {
    t = t.replace(',', '.');
  }
  const n = Number(t);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}
