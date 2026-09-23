#!/usr/bin/env node
/**
 * One-off migration: hand-written party lines carried their region inside the
 * location text ("Las Americas — Tenerife South"), which printed English on
 * the Spanish page. Split that into the structured `region` field and generate
 * a Google Maps search link, matching what update-parties.mjs now emits.
 *
 * Usage: node scripts/parties/migrate-manual-entries.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML, { Scalar } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const YAML_FILE = resolve(root, 'src/content/singletons/where-to-dance.yaml');
const dryRun = process.argv.includes('--dry-run');

const REGION_WORDS = {
  north: 'north',
  norte: 'north',
  south: 'south',
  sur: 'south',
  east: 'east',
  este: 'east',
  west: 'west',
  oeste: 'west',
  northeast: 'northeast',
  noreste: 'northeast',
  northwest: 'northwest',
  noroeste: 'northwest',
  southeast: 'southeast',
  sureste: 'southeast',
  southwest: 'southwest',
  suroeste: 'southwest',
};

const doc = YAML.parse(readFileSync(YAML_FILE, 'utf8'));
const changes = [];

for (const group of doc.parties ?? []) {
  const lines = (group.eventsRaw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) continue;

  const migrated = lines.map((line) => {
    const f = line.split('|').map((s) => s.trim());
    if (f.length > 6 && f[6]) return line; // already migrated

    const [name = '', location = '', stylesEn = '', stylesEs = '', url = ''] = f;

    // "Las Americas — Tenerife South" -> place "Las Americas", region "south"
    const m = location.match(/^(.*?)\s*[—–-]\s*Tenerife\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s*$/);
    if (!m) return line;
    const region = REGION_WORDS[m[2].toLowerCase()];
    if (!region) return line;

    const place = m[1].trim();
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Tenerife`)}`;
    changes.push(`${name}: "${location}" -> place "${place}" + region "${region}" + maps link`);
    return [name, place, stylesEn, stylesEs, url, maps, region].join(' | ');
  });

  group.eventsRaw = migrated.join('\n\n');
}

// Rewriting the whole document would emit oneOffEvents dates unquoted, and YAML
// reads a bare 2026-10-31 back as a Date, which Keystatic rejects. Re-quote them.
const isoOf = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ''));
for (const e of doc.oneOffEvents ?? []) {
  if (e?.date != null)
    e.date = Object.assign(new Scalar(isoOf(e.date)), { type: Scalar.QUOTE_SINGLE });
}

// Second pass: the first migration generated a Maps link from whatever was in
// the location field, including bare towns. "Las Americas, Tenerife" drops the
// reader on a resort, not a venue, so strip those; a venue keeps its link.
for (const group of doc.parties ?? []) {
  const lines = (group.eventsRaw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) continue;

  group.eventsRaw = lines
    .map((line) => {
      const f = line.split('|').map((x) => x.trim());
      if (!f[5]) return line; // no map link on this row

      // "Venue, Town" has a venue; "Town" alone does not.
      const hasVenue = (f[1] ?? '').includes(',');
      if (hasVenue) return line;

      changes.push(`${f[0]}: dropped town-only map link ("${f[1]}")`);
      f[5] = '';
      return f.join(' | ').replace(/(\s*\|)+$/, '');
    })
    .join('\n\n');
}

if (!changes.length) {
  console.log('nothing to migrate');
} else if (dryRun) {
  console.log(changes.join('\n'));
  console.log(`\n(dry run) ${changes.length} entries would change`);
} else {
  writeFileSync(YAML_FILE, YAML.stringify(doc, { lineWidth: 80 }));
  console.log(changes.join('\n'));
  console.log(`\nmigrated ${changes.length} entries`);
}
