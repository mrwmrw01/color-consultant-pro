/**
 * Reference data shared by the seed and catalog maintenance scripts: paint
 * manufacturers, the SW/BM color catalog spreadsheet, and the global room list
 * derived from ROOM_HIERARCHY.
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import { ROOM_HIERARCHY } from '../../lib/types';

export const COLOR_CATALOG_PATH = path.join(__dirname, '..', '..', 'data', 'Color Uploads.xlsx');

export interface CatalogEntry {
  manufacturer: string;
  colorCode: string;
  name: string;
  hexColor: string;
  rgbColor: string;
}

export interface ManufacturerSeed {
  name: string;
  abbreviation: string;
  website?: string;
  codePattern?: string;
  notes?: string;
}

// Known brands, with codePattern hints for validating new color codes
export const MANUFACTURERS: ManufacturerSeed[] = [
  {
    name: 'Sherwin Williams',
    abbreviation: 'SW',
    website: 'https://www.sherwin-williams.com',
    codePattern: '^SW\\s*\\d{1,5}$',
    notes: 'Codes formatted "SW 0001" (with space).',
  },
  {
    name: 'Benjamin Moore',
    abbreviation: 'BM',
    website: 'https://www.benjaminmoore.com',
    codePattern: '^(AF|HC|CC|CSP|OC|PM)-\\d{1,4}$|^\\d{4}-\\d{2}$|^\\d{2,4}$',
    notes: 'Mixed code formats: AF-5, HC-154, 2041-10, 100.',
  },
  {
    name: 'Farrow & Ball',
    abbreviation: 'FB',
    website: 'https://www.farrow-ball.com',
    codePattern: '^\\d{1,3}$|^No\\.\\s*\\d{1,3}$',
    notes: 'Traditional British paint brand. Codes like "No. 200".',
  },
  {
    name: 'PPG Paints',
    abbreviation: 'PPG',
    website: 'https://www.ppgpaints.com',
  },
  {
    name: 'Behr',
    abbreviation: 'BH',
    website: 'https://www.behr.com',
  },
  {
    name: 'Dunn-Edwards',
    abbreviation: 'DE',
    website: 'https://www.dunnedwards.com',
  },
  {
    name: 'Valspar',
    abbreviation: 'VS',
    website: 'https://www.valspar.com',
  },
];

function normalizeSWCode(raw: string): string {
  // "SW0001" -> "SW 0001"
  const s = String(raw).trim();
  const match = s.match(/^SW\s*(\d+)$/i);
  if (match) return `SW ${match[1]}`;
  return s;
}

function normalizeBMCode(raw: string): string {
  return String(raw).trim();
}

function parseSheet(ws: XLSX.WorkSheet, manufacturer: string): CatalogEntry[] {
  const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
  if (rows.length < 2) return [];

  const header = rows[0].map((h: string) => String(h).trim());
  const idxName = header.findIndex((h: string) => /color name/i.test(h));
  const idxCode = header.findIndex((h: string) => /color number/i.test(h));
  const idxHex = header.findIndex((h: string) => /^hex$/i.test(h));
  const idxR = header.findIndex((h: string) => /red value/i.test(h));
  const idxG = header.findIndex((h: string) => /green value/i.test(h));
  const idxB = header.findIndex((h: string) => /blue value/i.test(h));

  const entries: CatalogEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[idxCode] || !row[idxName]) continue;

    const rawCode = String(row[idxCode]);
    const name = String(row[idxName]).trim();
    const hex = row[idxHex] ? `#${String(row[idxHex]).replace(/^#/, '').toUpperCase()}` : '';
    const r = row[idxR];
    const g = row[idxG];
    const b = row[idxB];
    const rgb = r != null && g != null && b != null ? `${r},${g},${b}` : '';

    const code =
      manufacturer === 'Sherwin Williams' ? normalizeSWCode(rawCode) : normalizeBMCode(rawCode);

    entries.push({ manufacturer, colorCode: code, name, hexColor: hex, rgbColor: rgb });
  }
  return entries;
}

/** Read the SW and BM tabs of the color catalog spreadsheet. */
export function readColorCatalog(filePath: string = COLOR_CATALOG_PATH): CatalogEntry[] {
  const wb = XLSX.readFile(filePath);
  const sw = wb.SheetNames.includes('SW') ? parseSheet(wb.Sheets['SW'], 'Sherwin Williams') : [];
  const bm = wb.SheetNames.includes('BM') ? parseSheet(wb.Sheets['BM'], 'Benjamin Moore') : [];
  return [...sw, ...bm];
}

/** Global rooms, named the same way the room dropdowns build them. */
export function buildGlobalRooms(): { name: string; roomType: string; subType: string }[] {
  const rooms: { name: string; roomType: string; subType: string }[] = [];
  for (const [roomType, config] of Object.entries(ROOM_HIERARCHY)) {
    // Skip the "Enter Custom Name" placeholder
    if (roomType === 'Custom') continue;
    for (const subtype of config.subtypes) {
      const name = subtype === 'Other' ? roomType : `${roomType} - ${subtype}`;
      rooms.push({ name, roomType, subType: subtype });
    }
  }
  return rooms;
}
