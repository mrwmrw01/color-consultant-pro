# Test Image Fixtures

Place test images here for upload testing.

## Required Test Images

1. **small-photo.jpg** (< 1MB)
   - Purpose: Fast upload tests, basic functionality
   - Resolution: ~800x600 pixels
   - Format: JPEG

2. **medium-photo.jpg** (1-5MB)
   - Purpose: Normal upload scenario
   - Resolution: ~2000x1500 pixels
   - Format: JPEG

3. **large-photo.jpg** (> 5MB)
   - Purpose: Large file handling tests
   - Resolution: ~4000x3000 pixels or larger
   - Format: JPEG

4. **invalid.txt**
   - Purpose: Error handling for invalid file types
   - Content: Plain text file

## Adding Test Images

You can:
1. Use your own photos (ensure no sensitive content)
2. Download free stock photos from Unsplash or Pexels
3. Generate test images using image generation tools

### Quick Setup
```bash
# Download sample images (example using curl)
curl -o small-photo.jpg "https://picsum.photos/800/600"
curl -o medium-photo.jpg "https://picsum.photos/2000/1500"
curl -o large-photo.jpg "https://picsum.photos/4000/3000"
echo "This is not an image" > invalid.txt
```

## Usage in Tests

```typescript
import { test } from '@playwright/test';
import path from 'path';

test('upload photo', async ({ page }) => {
  const filePath = path.join(__dirname, '../fixtures/images/small-photo.jpg');
  await page.setInputFiles('input[type="file"]', filePath);
});
```
