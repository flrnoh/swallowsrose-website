// Seed-contact type + harmless dev fallback for the crew address book
// (/backend/kontakte).
//
// This repo is PUBLIC, so real third-party contact data (promoter and peer-band
// emails and phone numbers) must NOT live here — same rule as the member roster.
// In prod the address book is seeded from the CREW_CONTACTS env var (a JSON
// array of SeedContact); locally we fall back to the harmless dev list below.
// See scripts/seed-contacts.ts.
export type SeedContact = {
  sourceKey: string;
  name: string;
  kind: 'veranstalter' | 'festival' | 'venue' | 'band' | 'agentur' | 'label' | 'technik' | 'sonstiges';
  person?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  city?: string;
  notes?: string;
};

// Dev-only fallback — no real addresses. Prod overrides via CREW_CONTACTS.
export const DEV_CONTACTS: SeedContact[] = [
  { sourceKey: 'dev:veranstalter', name: 'Beispiel-Veranstalter', kind: 'veranstalter', person: 'Dev Booker', email: 'booker@example.test', city: 'Musterstadt', notes: 'Dev-Fallback' },
  { sourceKey: 'dev:band', name: 'Beispiel-Band', kind: 'band', email: 'band@example.test', notes: 'Dev-Fallback' },
];
