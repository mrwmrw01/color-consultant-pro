# Test Automation Plan - Color Consultant Pro

## Priority 1: Test Infrastructure Setup

- [ ] Install and configure Playwright for E2E testing
- [ ] Create test configuration files (playwright.config.ts)
- [ ] Set up test database configuration (.env.test)
- [ ] Create test fixtures directory with sample images
- [ ] Set up test utilities and helper functions
- [ ] Create Page Object Model base classes

## Priority 2: Core Authentication Tests

- [ ] Test user signup flow with valid inputs
- [ ] Test user signup validation (invalid email, weak password)
- [ ] Test user login with correct credentials
- [ ] Test user login with incorrect credentials
- [ ] Test session persistence across page refreshes
- [ ] Test user logout functionality

## Priority 3: Project Management Tests

- [ ] Test create new project
- [ ] Test project appears in project list
- [ ] Test open existing project
- [ ] Test rename project
- [ ] Test delete project

## Priority 4: Photo Upload Tests

- [ ] Test upload JPG photo successfully
- [ ] Test upload PNG photo successfully
- [ ] Test upload progress indicator displays
- [ ] Test invalid file type rejection
- [ ] Test large file handling (> 5MB)
- [ ] Test photo displays correctly after upload

## Priority 5: Color Annotation Tests

- [ ] Test click on photo to select color
- [ ] Test selected color appears in palette
- [ ] Test color picker shows RGB/HEX values
- [ ] Test add multiple color annotations
- [ ] Test annotations display on photo
- [ ] Test edit existing annotation
- [ ] Test delete annotation

## Priority 6: Recent Colors Tests

- [ ] Test recent colors appear after selection
- [ ] Test recent colors in chronological order
- [ ] Test recent colors show correct swatches
- [ ] Test clicking recent color applies it
- [ ] Test recent colors persist after refresh
- [ ] Test recent colors are user-specific

## Priority 7: Favorites Tests

- [ ] Test mark color as favorite
- [ ] Test favorited colors appear in Favorites section
- [ ] Test unfavorite a color
- [ ] Test favorites persist after logout/login
- [ ] Test favorites show visual indicator
- [ ] Test organize/reorder favorites

## Priority 8: Auto-save Tests

- [ ] Test auto-save triggers after inactivity
- [ ] Test auto-save indicator appears
- [ ] Test no data loss when navigating away
- [ ] Test auto-save with annotations
- [ ] Test auto-save with project metadata
- [ ] Test auto-save conflict handling

## Notes

### Test Data Setup
- Create test user: test@colorguru.com / TestPassword123!
- Prepare test images in tests/fixtures/images/
  - small-photo.jpg (< 1MB)
  - medium-photo.jpg (1-5MB)
  - large-photo.jpg (> 5MB)
  - invalid.txt (for error testing)

### Test Execution Strategy
- Implement one test file per loop
- Run tests 3 times to check for flakiness
- Update @AGENT.md with test commands
- Document any blockers or issues
- Mark completed items with [x]

### Success Criteria
- All Priority 1-3 tests passing (core flows)
- Tests run in < 5 minutes
- Zero flaky tests
- Clear test reports generated
- Test documentation complete
