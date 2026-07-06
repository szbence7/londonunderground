#!/usr/bin/env node
// Regenerates src/data/londonUndergroundStations.json from the live TfL API.
// Run with: node scripts/fetchStations.mjs

import { writeFile } from 'node:fs/promises';

const OUT_PATH = new URL('../src/data/londonUndergroundStations.json', import.meta.url);

const res = await fetch('https://api.tfl.gov.uk/StopPoint/Mode/tube');
if (!res.ok) {
  throw new Error(`TfL API request failed: ${res.status} ${res.statusText}`);
}
const { stopPoints } = await res.json();

const stations = stopPoints
  .filter((sp) => sp.stopType === 'NaptanMetroStation')
  .map((sp) => ({
    id: sp.id,
    name: sp.commonName.replace(/ Underground Station$/, ''),
    lineIds: (sp.lines ?? []).map((l) => l.id),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

await writeFile(OUT_PATH, JSON.stringify(stations, null, 2) + '\n');
console.log(`Wrote ${stations.length} stations to ${OUT_PATH.pathname}`);
