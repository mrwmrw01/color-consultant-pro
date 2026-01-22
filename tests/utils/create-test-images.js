/**
 * Create test image fixtures
 * This script creates minimal valid image files for testing
 */

const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 pixel PNG (base64 decoded)
const SMALL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal valid 1x1 pixel JPG (base64 decoded)
const SMALL_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wAg/9k=',
  'base64'
);

const fixturesDir = path.join(__dirname, '../fixtures/images');

// Create small-photo.jpg (< 1MB)
fs.writeFileSync(path.join(fixturesDir, 'small-photo.jpg'), SMALL_JPG);
console.log('✅ Created small-photo.jpg');

// Create medium-photo.png (for PNG test)
fs.writeFileSync(path.join(fixturesDir, 'medium-photo.png'), SMALL_PNG);
console.log('✅ Created medium-photo.png');

// Create medium-photo.jpg by duplicating small
fs.writeFileSync(path.join(fixturesDir, 'medium-photo.jpg'), SMALL_JPG);
console.log('✅ Created medium-photo.jpg');

console.log('\n✅ Test image fixtures created successfully!');
