// Build src/data/festivals.json — the tour planner's festival knowledge base.
//
// WHY this exists: the old festival-months.json was a flat sourceKey→month map,
// its months *guessed* from the position of a name relative to month-separator
// rows in a spreadsheet. That produced wrong months (e.g. Ruhrpott Rodeo landed
// in June though it's late July) and — worse — no way to tell a summer open-air
// from an indoor winter show, so a December search surfaced festivals with no
// hint that they can't possibly be open-airs.
//
// This script rebuilds a richer, HONEST record per festival:
//   { month, outdoor, verified, window? }
//   - month    1–12  (unchanged from the old map unless corrected below)
//   - outdoor  true = open-air, false = indoor/hall
//   - verified true  = window + indoor/outdoor checked against the festival's
//                      own site/announcement (see VERIFIED); false = heuristic,
//                      shown to the crew as "~ geschätzt" so nobody trusts a guess.
//   - window   short human label, only on verified entries.
//
// The heuristic for the ~280 unverified names is deliberately conservative:
// German open-airs don't happen Nov–Feb, so those months are always indoor;
// name tokens ("open-air", "wald", "see", "halle" …) refine the rest. It's still
// a guess — hence verified:false — but at least the winter/indoor split is right,
// which is what the December bug was about.
//
// Run:  node scripts/build-festivals.mjs
// Idempotent: reads festivals.json for each festival's month, then rewrites the
// file with freshly-derived outdoor/verified/window. Tweak VERIFIED or the
// heuristic below and re-run. (The very first build seeded months from the
// now-removed festival-months.json — see git history.)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'src', 'data');

// Month source of truth = the current festivals.json (verified months win below).
const current = JSON.parse(readFileSync(join(dataDir, 'festivals.json'), 'utf8'));
const months = Object.fromEntries(Object.entries(current).map(([k, v]) => [k, v.month]));

// ── Verified layer ─────────────────────────────────────────────────────────
// Only festivals whose month + indoor/outdoor were actually checked this build.
// Corrections to the legacy month live here too (see `month`). Keep the note in
// `window` short — it renders on the tour-planner stop.
const VERIFIED = {
  // Web-verified 2026 (festival site / official announcement):
  'f:sbaem-fest':         { month: 6,  outdoor: true,  window: 'Anf. Juni · Wels (AT)' },      // SBÄM Records-Fest, Label-Heimat
  'f:ruhrpott-rodeo':     { month: 7,  outdoor: true,  window: 'Ende Juli · Hünxe' },          // war fälschlich Juni
  'f:mighty-sounds':      { month: 6,  outdoor: true,  window: 'Ende Juni · Tábor (CZ)' },
  'f:punk-rock-holiday':  { month: 8,  outdoor: true,  window: 'Mitte August · Tolmin (SI)' },
  'f:punk-im-pott':       { month: 12, outdoor: false, window: 'Mitte Dez · Oberhausen (Halle)' },
};

// Festivals not in the legacy map that the verified layer introduces.
const NEW_KEYS = ['f:sbaem-fest', 'f:mighty-sounds', 'f:punk-rock-holiday'];

// ── Heuristic for the unverified rest ──────────────────────────────────────
const OUTDOOR_HINT = /(open.?air|openair|draussen|wald|wiese|acker|see|insel|berg|garten|park|rodeo|butterfahrt|bootstour|hoffest|seefest)/;
const INDOOR_HINT = /(halle|hall|indoor|club|festhalle)/;

function guessOutdoor(key, month) {
  const name = key.replace(/^f:/, '');
  if (INDOOR_HINT.test(name)) return false;
  // No German open-air runs Nov–Feb — always indoor, regardless of name.
  if (month >= 11 || month <= 2) return false;
  if (OUTDOOR_HINT.test(name)) return true;
  // Mar & Oct are shoulder season → default indoor unless a name hint said otherwise.
  if (month === 3 || month === 10) return false;
  // Apr–Sep → default open-air.
  return true;
}

const out = {};
const keys = new Set([...Object.keys(months), ...NEW_KEYS]);
for (const key of [...keys].sort()) {
  const v = VERIFIED[key];
  if (v) {
    out[key] = { month: v.month, outdoor: v.outdoor, verified: true, window: v.window };
  } else {
    const month = months[key];
    out[key] = { month, outdoor: guessOutdoor(key, month), verified: false };
  }
}

writeFileSync(join(dataDir, 'festivals.json'), JSON.stringify(out) + '\n');
const verified = Object.values(out).filter((f) => f.verified).length;
const outdoor = Object.values(out).filter((f) => f.outdoor).length;
console.log(`festivals.json: ${Object.keys(out).length} Festivals · ${verified} verifiziert · ${outdoor} Open-Air · ${Object.keys(out).length - outdoor} Halle`);
