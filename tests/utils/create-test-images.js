/**
 * Create test image fixtures
 * Generates small but real photos (a simple room: wall, floor, door, window)
 * so uploads go through the full sharp optimization pipeline.
 *
 * Run: node tests/utils/create-test-images.js
 */

const path = require('path');
const sharp = require('sharp');

const fixturesDir = path.join(__dirname, '../fixtures/images');

function roomSvg(width, height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#e8dcc8"/>
  <rect y="${height * 0.75}" width="${width}" height="${height * 0.25}" fill="#8b6f47"/>
  <rect x="${width * 0.1}" y="${height * 0.2}" width="${width * 0.25}" height="${height * 0.55}"
        fill="#f7f7f2" stroke="#5a5a5a" stroke-width="${width / 100}"/>
  <rect x="${width * 0.55}" y="${height * 0.15}" width="${width * 0.3}" height="${height * 0.35}"
        fill="#9fc5e8" stroke="#ffffff" stroke-width="${width / 60}"/>
</svg>`);
}

async function main() {
  await sharp(roomSvg(800, 600)).jpeg({ quality: 85 }).toFile(path.join(fixturesDir, 'small-photo.jpg'));
  console.log('✅ Created small-photo.jpg (800x600)');

  await sharp(roomSvg(1600, 1200)).jpeg({ quality: 90 }).toFile(path.join(fixturesDir, 'medium-photo.jpg'));
  console.log('✅ Created medium-photo.jpg (1600x1200)');

  await sharp(roomSvg(800, 600)).png().toFile(path.join(fixturesDir, 'medium-photo.png'));
  console.log('✅ Created medium-photo.png (800x600)');

  console.log('\n✅ Test image fixtures created successfully!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
