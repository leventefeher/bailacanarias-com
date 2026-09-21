#!/usr/bin/env node
/**
 * Merges scraped Instagram event observations into the sightings ledger,
 * classifies each event as weekly-recurring or one-off, and rewrites
 * src/content/singletons/where-to-dance.yaml accordingly.
 *
 * Usage: node scripts/parties/update-parties.mjs <observations.json> [--dry-run]
 *
 * Manually-curated lines already in the YAML are preserved: the script only
 * adds, updates and removes events it has seen on Instagram itself.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML, { Scalar } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const LEDGER = resolve(here, 'ledger.json');
const CONFIG = resolve(here, 'config.json');
const YAML_FILE = resolve(root, 'src/content/singletons/where-to-dance.yaml');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY = 86400000;

const today = process.env.PARTIES_TODAY ?? new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes('--dry-run');
const obsPath = process.argv[2];

if (!obsPath || obsPath.startsWith('--')) {
  console.error('usage: node scripts/parties/update-parties.mjs <observations.json> [--dry-run]');
  process.exit(1);
}

const rules = JSON.parse(readFileSync(CONFIG, 'utf8')).rules;
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const observations = JSON.parse(readFileSync(resolve(process.cwd(), obsPath), 'utf8'));

/**
 * Stable identity for an event across posts: name + venue, loosely normalised.
 * NFKD (not NFD) is deliberate: Instagram captions are full of styled Unicode
 * such as mathematical-bold letters, which NFD leaves intact and the ASCII
 * filter below then strips to an empty string, collapsing every styled event
 * onto a single key.
 */
const keyOf = (e) =>
  `${e.name ?? ''}|${e.venue ?? ''}`
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9|]+/g, '');

const weekdayOf = (iso) => WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);

// ---------------------------------------------------------------- ingest ----

let newEvents = 0;
let newSightings = 0;

for (const post of observations.posts ?? []) {
  for (const event of post.events ?? []) {
    if (!event.name || !event.eventDate) continue;
    const key = keyOf(event);
    const entry = (ledger.events[key] ??= {
      name: event.name,
      venue: event.venue ?? '',
      area: event.area ?? '',
      region: event.region ?? '',
      stylesEn: event.stylesEn ?? '',
      stylesEs: event.stylesEs ?? '',
      mapsUrl: event.mapsUrl ?? '',
      url: event.url ?? post.postUrl ?? '',
      firstSeen: today,
      sightings: [],
    });
    if (ledger.events[key].sightings.length === 0) newEvents++;

    // Keep the freshest copy of the descriptive fields.
    for (const f of ['venue', 'area', 'region', 'stylesEn', 'stylesEs', 'mapsUrl']) {
      if (event[f]) entry[f] = event[f];
    }
    if (event.url) entry.url = event.url;

    // A caption that says "every Wednesday" / "todos los miercoles" is direct
    // evidence of recurrence — no need to wait for three separate sightings.
    if (event.declaredRecurring) entry.declaredRecurring = true;

    // One sighting per event-date; re-posts of the same night don't inflate the count.
    if (!entry.sightings.some((s) => s.eventDate === event.eventDate)) {
      entry.sightings.push({
        eventDate: event.eventDate,
        weekday: weekdayOf(event.eventDate),
        postUrl: post.postUrl ?? '',
        recordedOn: today,
      });
      entry.sightings.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
      newSightings++;
    }
    entry.lastSeen = entry.sightings.at(-1).eventDate;
  }
}

// -------------------------------------------------------------- classify ----

const weekly = [];   // { weekday, entry }
const oneOffs = [];  // { entry, date }

for (const [key, entry] of Object.entries(ledger.events)) {
  // Group this event's sightings by the weekday they fell on.
  const byWeekday = new Map();
  for (const s of entry.sightings) {
    if (!byWeekday.has(s.weekday)) byWeekday.set(s.weekday, []);
    byWeekday.get(s.weekday).push(s.eventDate);
  }

  let recurringOn = null;
  for (const [weekday, dates] of byWeekday) {
    const span = daysBetween(dates[0], dates.at(-1));

    // Weekly events recur every ~7 days. A monthly event on, say, the third
    // Saturday also lands on one weekday and clears the span test, so check the
    // typical gap too — otherwise a monthly party gets a weekly slot.
    const gaps = dates.slice(1).map((d, k) => daysBetween(dates[k], d)).sort((a, b) => a - b);
    const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : Infinity;

    const proven =
      dates.length >= rules.sightingsToPromote &&
      span >= rules.daysSpanToPromote &&
      medianGap <= rules.maxGapDaysForWeekly;

    if (proven || (entry.declaredRecurring && dates.length >= 1)) {
      recurringOn = weekday;
      break;
    }
  }

  if (recurringOn) {
    const stale = daysBetween(entry.lastSeen, today) > rules.weeksUnseenToDrop * 7;
    entry.status = stale ? 'dormant' : 'weekly';
    entry.weekday = recurringOn;
    if (!stale) weekly.push({ weekday: recurringOn, entry });
  } else {
    // Not yet proven recurring — show any future date as a one-off.
    const upcoming = entry.sightings.map((s) => s.eventDate).filter((d) => d >= today);
    entry.status = upcoming.length ? 'upcoming' : 'past';
    entry.weekday = null;
    for (const date of upcoming) oneOffs.push({ entry, date });
  }
  ledger.events[key] = entry;
}

oneOffs.sort((a, b) => a.date.localeCompare(b.date) || a.entry.name.localeCompare(b.entry.name));

// ----------------------------------------------------------- write yaml -----

const doc = YAML.parse(readFileSync(YAML_FILE, 'utf8'));
const ledgerNames = new Set(Object.values(ledger.events).map((e) => e.name.toLowerCase().trim()));

// ------------------------------------------- retire stale manual entries ----
//
// Hand-written entries are not in the sightings ledger, so "nobody is posting
// about this" has to be tracked separately. The hazard: the sources backing
// these entries are the weak ones (Facebook, a video-only venue account), so a
// naive "unseen for N weeks -> delete" would remove exactly the parties we
// cannot observe, not the ones that stopped running. The clock therefore only
// advances on runs where a backing source was actually read.

const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
const sourcesRead = new Set(observations.sourcesRead ?? []);

// "Baila Q' Baila (Sunday)" -> name + the day it runs, so two same-named
// parties on different nights stay distinct.
const splitBacks = (label) => {
  const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { name: m[1].trim(), weekday: m[2].trim() } : { name: label.trim(), weekday: null };
};

const manualKey = (name, weekday) => `${keyOf({ name })}@${weekday ?? ''}`;

// entry -> the source handles that would report on it
const backers = new Map();
for (const src of [...(cfg.sources ?? []), ...(cfg.secondarySources ?? [])]) {
  for (const label of src.backs ?? []) {
    const { name, weekday } = splitBacks(label);
    const k = manualKey(name, weekday);
    if (!backers.has(k)) backers.set(k, []);
    backers.get(k).push(src.handle ?? src.url);
  }
}

ledger.manual ??= {};
const retired = [];
const unwatched = [];

for (const group of doc.parties ?? []) {
  const weekdayLabel = (group.dayEn ?? '').trim();
  for (const raw of (group.eventsRaw ?? '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const name = raw.split('|')[0].trim();
    if (ledgerNames.has(name.toLowerCase())) continue; // the script already owns this one

    // A day group may be "Monday & Tuesday"; match a backer on either day.
    const k =
      [...backers.keys()].find(
        (bk) => bk.startsWith(`${keyOf({ name })}@`) && weekdayLabel.includes(bk.split('@')[1])
      ) ?? manualKey(name, weekdayLabel);

    const m = (ledger.manual[k] ??= {
      name,
      weekday: weekdayLabel,
      adoptedOn: today,
      missedChecks: 0,
      status: 'active',
    });
    m.backedBy = backers.get(k) ?? [];

    const watched = m.backedBy.filter((h) => sourcesRead.has(h));
    if (!watched.length) {
      // Nothing readable covers this entry — never retire it on silence alone.
      m.lastResult = m.backedBy.length ? 'sources-unreadable' : 'no-backing-source';
      unwatched.push(m.name);
      continue;
    }

    // Seen on Instagram this run? Then it is alive and the counter resets.
    const seen = Object.values(ledger.events).some(
      (e) => e.name.toLowerCase().trim() === name.toLowerCase() && e.lastSeen >= today
    );
    if (seen) {
      m.missedChecks = 0;
      m.lastConfirmed = today;
      m.lastResult = 'confirmed';
    } else {
      m.missedChecks += 1;
      m.lastResult = 'missed';
    }

    const trackedDays = daysBetween(m.adoptedOn, today);
    if (
      m.missedChecks >= cfg.rules.manualMissedChecksToRetire &&
      trackedDays >= cfg.rules.manualMinDaysTracked
    ) {
      m.status = 'retired';
      m.retiredOn = today;
      retired.push(`${m.name} (${m.weekday})`);
    }
  }
}

const isRetired = (name) =>
  Object.values(ledger.manual).some(
    (m) => m.status === 'retired' && m.name.toLowerCase() === name.toLowerCase()
  );
/**
 * Place only — the region travels as its own field so each page can print it
 * in its own language ("Tenerife South" / "Tenerife Sur").
 */
const locationOf = (e) => [e.venue, e.area].filter(Boolean).join(', ');

/**
 * A Maps *search* link, not a pin: the flyer gives a venue name, rarely an
 * address, and a search for the name resolves correctly while a guessed
 * coordinate would not.
 */
const mapsOf = (e) => {
  if (e.mapsUrl) return e.mapsUrl;
  const q = [e.venue, e.area, 'Tenerife'].filter(Boolean).join(', ');
  return q === 'Tenerife' ? '' : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

const line = (e) =>
  [e.name, locationOf(e), e.stylesEn, e.stylesEs, e.url, mapsOf(e), e.region ?? '']
    .map((s) => (s ?? '').trim())
    .join(' | ')
    .replace(/(\s*\|)+$/, '');

for (const group of doc.parties ?? []) {
  const mine = weekly
    .filter(({ weekday }) => (group.dayEn ?? '').includes(weekday))
    .map(({ entry }) => line(entry));

  // Preserve hand-written lines; only replace the ones this script manages.
  const manual = (group.eventsRaw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !ledgerNames.has(l.split('|')[0].trim().toLowerCase()))
    .filter((l) => !isRetired(l.split('|')[0].trim()));

  const merged = [...manual, ...mine];
  if (merged.length) group.eventsRaw = merged.join('\n\n');
  else delete group.eventsRaw;
}

// YAML would read a bare 2026-10-31 back as a Date; Keystatic requires a string.
const quoted = (s) => Object.assign(new Scalar(s), { type: Scalar.QUOTE_SINGLE });

doc.oneOffEvents = oneOffs.map(({ entry, date }) => ({
  name: entry.name,
  date: quoted(date),
  location: locationOf(entry),
  region: entry.region ?? '',
  stylesEn: entry.stylesEn,
  stylesEs: entry.stylesEs,
  url: entry.url,
  mapsUrl: mapsOf(entry),
}));

const summary = {
  today,
  newEvents,
  newSightings,
  weekly: weekly.length,
  oneOffs: oneOffs.length,
  dormant: Object.values(ledger.events).filter((e) => e.status === 'dormant').length,
  manualRetired: retired,
  manualUnwatched: unwatched,
};

if (dryRun) {
  console.log(YAML.stringify(doc));
  console.log('summary (dry run):', summary);
} else {
  writeFileSync(YAML_FILE, YAML.stringify(doc, { lineWidth: 80 }));
  writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log('summary:', summary);
}
