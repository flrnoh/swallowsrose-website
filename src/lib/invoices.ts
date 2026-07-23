// Invoicing — the band writes its own gig/merch invoices in the backend instead
// of the external SumUp app (SumUp's free tier caps at 4 invoices/month and its
// API is payment-only; our backend is egress-free by policy anyway). Powers the
// Rechnungen section on /backend/finanzen, the /api/invoice/* endpoints and the
// printable A4 view at /backend/rechnungen/[id].
//
// Amounts are whole cents (reusing finance's parseEuro/fmtEuro). Line totals are
// exact integers (quantity × unit price). Tax is settable per invoice:
//   'kleinunternehmer' → §19 UStG, no VAT shown (rate 0, plus the §19 note)
//   'regel'            → VAT shown (usually 19 %, some artistic services 7 %)
import { and, asc, desc, eq, like } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { auth } from './auth';
import { db, schema } from './db';

export { fmtEuro, parseEuro } from './finance';

// ── Status ───────────────────────────────────────────────────────────────────
export const STATUSES = ['entwurf', 'gestellt', 'bezahlt', 'storniert'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  entwurf: 'Entwurf',
  gestellt: 'Gestellt',
  bezahlt: 'Bezahlt',
  storniert: 'Storniert',
};

// ── Tax handling ─────────────────────────────────────────────────────────────
export const TAX_MODES = ['kleinunternehmer', 'regel'] as const;
export type TaxMode = (typeof TAX_MODES)[number];
export const TAX_MODE_LABEL: Record<TaxMode, string> = {
  kleinunternehmer: 'Kleinunternehmer (§19 UStG)',
  regel: 'Regelbesteuerung (mit USt)',
};

/** Any authenticated member may write invoices (shared, like the ledger). */
export async function requireUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return (session?.user as { id: string; role?: string } | undefined) ?? null;
}

// ── Sender / issuer settings ─────────────────────────────────────────────────
// The band's own legally-required invoice data (address, Steuernummer, IBAN, …)
// lives in the INVOICE_SETTINGS env var — NOT in this public repo, same rule as
// CREW_MEMBERS/CREW_CONTACTS. Korbinian fills it in Vercel; until then the dev
// fallback below is used and flagged as a placeholder in the UI.
export type InvoiceSettings = {
  senderName: string; // legal issuer (GbR/person) — appears as the sender
  senderLines: string[]; // address lines (street, "PLZ Ort")
  taxNumber: string; // Steuernummer (Pflicht, wenn keine USt-IdNr.)
  vatId: string; // USt-IdNr. (bei Regelbesteuerung)
  email: string;
  phone: string;
  website: string;
  accountHolder: string; // Kontoinhaber (falls ≠ senderName)
  iban: string;
  bic: string;
  bankName: string;
  defaultTaxMode: TaxMode;
  defaultTaxRatePercent: number; // used when defaultTaxMode = 'regel'
  defaultDueDays: number;
  kleinunternehmerNote: string; // §19-Hinweis auf der Rechnung
  paymentNote: string; // Fuß-/Zahlungshinweis (Default für neue Rechnungen)
  isPlaceholder: boolean; // true → INVOICE_SETTINGS fehlt (Warnung anzeigen)
};

// Harmless dev placeholder. In prod INVOICE_SETTINGS overrides ALL of this.
const PLACEHOLDER_SETTINGS: InvoiceSettings = {
  senderName: "Swallow's Rose",
  senderLines: ['— Absenderadresse fehlt —', 'PLZ Ort'],
  taxNumber: '—',
  vatId: '',
  email: 'crew@swallowsrose.com',
  phone: '',
  website: 'swallowsrose.com',
  accountHolder: '',
  iban: '',
  bic: '',
  bankName: '',
  defaultTaxMode: 'kleinunternehmer',
  defaultTaxRatePercent: 19,
  defaultDueDays: 14,
  kleinunternehmerNote:
    'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.',
  paymentNote:
    'Bitte den Rechnungsbetrag bis zum genannten Datum auf das unten stehende Konto überweisen.',
  isPlaceholder: true,
};

/** Sender data for invoices — from INVOICE_SETTINGS (JSON) or the dev fallback. */
export function getInvoiceSettings(): InvoiceSettings {
  const raw = process.env.INVOICE_SETTINGS;
  if (!raw) return PLACEHOLDER_SETTINGS;
  try {
    const p = JSON.parse(raw) as Partial<InvoiceSettings>;
    return {
      ...PLACEHOLDER_SETTINGS,
      ...p,
      senderLines: Array.isArray(p.senderLines) && p.senderLines.length
        ? p.senderLines
        : PLACEHOLDER_SETTINGS.senderLines,
      defaultTaxMode: p.defaultTaxMode && TAX_MODES.includes(p.defaultTaxMode)
        ? p.defaultTaxMode
        : PLACEHOLDER_SETTINGS.defaultTaxMode,
      isPlaceholder: false,
    };
  } catch {
    console.warn('INVOICE_SETTINGS ist kein gültiges JSON — nutze Platzhalter.');
    return PLACEHOLDER_SETTINGS;
  }
}

// ── Inputs & validation ──────────────────────────────────────────────────────
export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type InvoiceInput = {
  recipientName: string;
  recipientAddress?: string | null;
  recipientEmail?: string | null;
  contactId?: string | null;
  eventId?: string | null;
  issueDate: string; // ISO
  serviceDate?: string | null;
  dueDays?: number | null;
  taxMode: TaxMode;
  taxRatePercent: number;
  intro?: string | null;
  notes?: string | null;
  items: InvoiceItemInput[];
};

export function validate(input: Partial<InvoiceInput>): string | null {
  if (!input.recipientName || !input.recipientName.trim()) return 'Empfänger ist Pflicht.';
  if (!input.issueDate || isNaN(new Date(input.issueDate).getTime())) return 'Ungültiges Rechnungsdatum.';
  if (!input.taxMode || !TAX_MODES.includes(input.taxMode)) return 'Ungültiger Steuer-Modus.';
  if (input.taxMode === 'regel') {
    if (typeof input.taxRatePercent !== 'number' || input.taxRatePercent < 0 || input.taxRatePercent > 100)
      return 'Ungültiger USt-Satz.';
  }
  if (!Array.isArray(input.items) || input.items.length === 0) return 'Mindestens eine Position ist Pflicht.';
  for (const [i, it] of input.items.entries()) {
    if (!it || !it.description || !it.description.trim()) return `Position ${i + 1}: Beschreibung fehlt.`;
    if (typeof it.quantity !== 'number' || !Number.isFinite(it.quantity) || it.quantity <= 0)
      return `Position ${i + 1}: Menge muss größer als 0 sein.`;
    if (typeof it.unitPriceCents !== 'number' || !Number.isFinite(it.unitPriceCents) || it.unitPriceCents < 0)
      return `Position ${i + 1}: Einzelpreis ungültig.`;
  }
  return null;
}

// ── Totals ───────────────────────────────────────────────────────────────────
export type Totals = { netCents: number; taxCents: number; grossCents: number };

export function computeTotals(
  items: { quantity: number; unitPriceCents: number }[],
  taxMode: TaxMode,
  taxRatePercent: number,
): Totals {
  const netCents = items.reduce((s, it) => s + Math.round(it.quantity) * Math.round(it.unitPriceCents), 0);
  const rate = taxMode === 'regel' ? taxRatePercent : 0;
  const taxCents = Math.round((netCents * rate) / 100);
  return { netCents, taxCents, grossCents: netCents + taxCents };
}

// ── Invoice number (fortlaufend & eindeutig, Pflichtangabe) ──────────────────
/** Next number for the issue year, e.g. "2026-001". Sequence resets per year. */
export async function nextInvoiceNumber(issueDate: Date): Promise<string> {
  const year = issueDate.getFullYear();
  const rows = await db
    .select({ number: schema.invoice.number })
    .from(schema.invoice)
    .where(like(schema.invoice.number, `${year}-%`));
  let max = 0;
  for (const r of rows) {
    const m = /-(\d+)$/.exec(r.number);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${year}-${String(max + 1).padStart(3, '0')}`;
}

// ── Reads ────────────────────────────────────────────────────────────────────
export type InvoiceRow = typeof schema.invoice.$inferSelect;
export type InvoiceItemRow = typeof schema.invoiceItem.$inferSelect;
export type InvoiceWithItems = InvoiceRow & { items: InvoiceItemRow[]; totals: Totals };

async function itemsFor(invoiceId: string): Promise<InvoiceItemRow[]> {
  return db
    .select()
    .from(schema.invoiceItem)
    .where(eq(schema.invoiceItem.invoiceId, invoiceId))
    .orderBy(asc(schema.invoiceItem.position));
}

/** All invoices (newest first) with their items and computed totals. */
export async function listInvoices(): Promise<InvoiceWithItems[]> {
  const invoices = await db
    .select()
    .from(schema.invoice)
    .orderBy(desc(schema.invoice.issueDate), desc(schema.invoice.createdAt));
  const allItems = await db.select().from(schema.invoiceItem).orderBy(asc(schema.invoiceItem.position));
  const byInvoice = new Map<string, InvoiceItemRow[]>();
  for (const it of allItems) {
    const arr = byInvoice.get(it.invoiceId) ?? [];
    arr.push(it);
    byInvoice.set(it.invoiceId, arr);
  }
  return invoices.map((inv) => {
    const items = byInvoice.get(inv.id) ?? [];
    return { ...inv, items, totals: computeTotals(items, inv.taxMode as TaxMode, inv.taxRatePercent) };
  });
}

export async function getInvoice(id: string): Promise<InvoiceWithItems | null> {
  const [inv] = await db.select().from(schema.invoice).where(eq(schema.invoice.id, id)).limit(1);
  if (!inv) return null;
  const items = await itemsFor(id);
  return { ...inv, items, totals: computeTotals(items, inv.taxMode as TaxMode, inv.taxRatePercent) };
}

// ── Writes ───────────────────────────────────────────────────────────────────
function headRow(input: InvoiceInput) {
  const rate = input.taxMode === 'regel' ? Math.round(input.taxRatePercent) : 0;
  return {
    recipientName: input.recipientName.trim(),
    recipientAddress: input.recipientAddress?.trim() || null,
    recipientEmail: input.recipientEmail?.trim() || null,
    contactId: input.contactId || null,
    eventId: input.eventId || null,
    issueDate: new Date(input.issueDate),
    serviceDate: input.serviceDate?.trim() || null,
    dueDays: typeof input.dueDays === 'number' && input.dueDays >= 0 ? Math.round(input.dueDays) : null,
    taxMode: input.taxMode,
    taxRatePercent: rate,
    intro: input.intro?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

function itemRows(invoiceId: string, items: InvoiceItemInput[]) {
  return items.map((it, i) => ({
    id: randomUUID(),
    invoiceId,
    position: i,
    description: it.description.trim(),
    quantity: Math.round(it.quantity),
    unitPriceCents: Math.round(it.unitPriceCents),
  }));
}

/** Create a draft invoice (assigns the next sequential number). Returns id + number. */
export async function createInvoice(input: InvoiceInput, userId: string): Promise<{ id: string; number: string }> {
  const id = randomUUID();
  const issue = new Date(input.issueDate);
  // Retry once on the (rare, race) unique-number collision.
  for (let attempt = 0; attempt < 2; attempt++) {
    const number = await nextInvoiceNumber(issue);
    try {
      await db.insert(schema.invoice).values({ id, number, status: 'entwurf', ...headRow(input), createdBy: userId });
      const rows = itemRows(id, input.items);
      if (rows.length) await db.insert(schema.invoiceItem).values(rows);
      return { id, number };
    } catch (e) {
      if (attempt === 0 && String(e).includes('unique')) continue;
      throw e;
    }
  }
  throw new Error('Rechnungsnummer konnte nicht vergeben werden.');
}

/** Update an invoice head + replace its items. Number and status are untouched. */
export async function updateInvoice(id: string, input: InvoiceInput) {
  await db
    .update(schema.invoice)
    .set({ ...headRow(input), updatedAt: new Date() })
    .where(eq(schema.invoice.id, id));
  await db.delete(schema.invoiceItem).where(eq(schema.invoiceItem.invoiceId, id));
  const rows = itemRows(id, input.items);
  if (rows.length) await db.insert(schema.invoiceItem).values(rows);
}

export async function setStatus(id: string, status: Status) {
  await db.update(schema.invoice).set({ status, updatedAt: new Date() }).where(eq(schema.invoice.id, id));
}

export async function deleteInvoice(id: string) {
  // invoice_item rows cascade on the FK.
  await db.delete(schema.invoice).where(eq(schema.invoice.id, id));
}

// ── Book a paid invoice into the finance ledger ──────────────────────────────
/** Create a matching income entry for a paid invoice (idempotent via financeEntryId). */
export async function bookInvoiceAsIncome(id: string, userId: string, method = 'sumup'): Promise<string | null> {
  const inv = await getInvoice(id);
  if (!inv) throw new Error('Rechnung nicht gefunden.');
  if (inv.financeEntryId) return inv.financeEntryId; // already booked
  const entryId = randomUUID();
  const title = `Rechnung ${inv.number} — ${inv.recipientName}`;
  await db.insert(schema.financeEntry).values({
    id: entryId,
    kind: 'einnahme',
    category: 'gage',
    title,
    amountCents: inv.totals.grossCents,
    method,
    occurredAt: inv.issueDate,
    eventId: inv.eventId ?? null,
    notes: `Automatisch aus Rechnung ${inv.number}`,
    createdBy: userId,
  });
  await db
    .update(schema.invoice)
    .set({ financeEntryId: entryId, status: 'bezahlt', updatedAt: new Date() })
    .where(eq(schema.invoice.id, id));
  return entryId;
}

// ── Formatting helper for the print view ─────────────────────────────────────
export function fmtInvoiceDate(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(d);
}

/** Due date = issue date + dueDays (or null). */
export function dueDate(issue: Date, dueDays: number | null): Date | null {
  if (dueDays == null) return null;
  const d = new Date(issue);
  d.setDate(d.getDate() + dueDays);
  return d;
}
