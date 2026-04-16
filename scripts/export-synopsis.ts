import { generateSynopsisFromAnnotations } from '../lib/synopsis-generator';
import * as fs from 'fs';

async function main() {
  const projectId = process.argv[2] || 'cmo1up1cg0006i60m1fopzbl5';
  const data = await generateSynopsisFromAnnotations(projectId);
  const outPath = '/tmp/synopsis-data.json';
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✓ Saved ${outPath}`);
  console.log(`  Rooms: ${data.roomData.length}`);
  console.log(`  Wall colors: ${data.colorSummary.walls.length}`);
  console.log(`  Trim colors: ${data.colorSummary.trim.length}`);
  console.log(`  Ceiling colors: ${data.colorSummary.ceilings.length}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
