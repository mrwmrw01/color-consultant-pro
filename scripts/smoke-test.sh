#!/bin/bash
# Post-deployment smoke test
# Run this after deploying to verify the app is working

set -e

BASE_URL="${1:-https://paint.weadtech.net}"

echo "=== Color Consultant Pro - Smoke Test ==="
echo "Target: ${BASE_URL}"
echo ""

PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected="$3"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${url}" 2>/dev/null || echo "000")

  if [ "${STATUS}" = "${expected}" ]; then
    echo "✓ ${name}: ${STATUS}"
    PASS=$((PASS + 1))
  else
    echo "✗ ${name}: expected ${expected}, got ${STATUS}"
    FAIL=$((FAIL + 1))
  fi
}

echo "Checking endpoints..."
check "Homepage" "/" "200"
check "Health API" "/api/health" "200"
check "Signin Page" "/auth/signin" "200"
check "Signup Page (exists)" "/auth/signup" "200"
check "Dashboard (redirects if not logged in)" "/dashboard" "302"
check "Projects API (401 if not logged in)" "/api/projects" "401"
check "Clients API (401 if not logged in)" "/api/clients" "401"
check "Colors API (401 if not logged in)" "/api/colors" "401"
check "404 Page" "/nonexistent-page-12345" "404"

echo ""
echo "=== Results ==="
echo "Passed: ${PASS}"
echo "Failed: ${FAIL}"
echo ""

if [ ${FAIL} -gt 0 ]; then
  echo "⚠ Some checks failed. Investigate before field testing."
  exit 1
else
  echo "✓ All smoke tests passed. App is ready for field testing."
  exit 0
fi
