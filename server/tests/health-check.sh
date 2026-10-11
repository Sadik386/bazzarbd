#!/bin/bash
# ═══════════════════════════════════════
#  Thelagari — API Health Check Script
#  Run on VPS: bash health-check.sh
# ═══════════════════════════════════════

BASE="${1:-http://localhost:5001/api}"
PASS=0
FAIL=0

check() {
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$1")
  if [ "$STATUS" = "$2" ]; then
    echo "  ✅ PASS [$STATUS] $3"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL [$STATUS] $3 (Expected: $2)"
    FAIL=$((FAIL + 1))
  fi
}

timing() {
  TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$1")
  echo "  ⏱  Response time: ${TIME}s"
}

echo ""
echo "═══════════════════════════════════════════════"
echo "  ঠেলাগাড়ী (Thelagari) — API Health Check"
echo "  Target: $BASE"
echo "═══════════════════════════════════════════════"
echo ""

echo "── Public Endpoints ──"
check "$BASE/products" 200 "GET /products"
timing "$BASE/products"
check "$BASE/products?page=1&limit=5" 200 "GET /products?page=1&limit=5"
check "$BASE/categories" 200 "GET /categories"
check "$BASE/settings/banners" 200 "GET /settings/banners"
check "$BASE/coupons" 401 "GET /coupons (Security Auth Block)"
check "$BASE/jobs" 200 "GET /jobs"

echo ""
echo "── Compression ──"
# Fetch with page size of 50 to ensure payload size exceeds the 1KB gzip threshold
ENCODING=$(curl -sI -H "Accept-Encoding: gzip" "$BASE/products?limit=50" | grep -i "content-encoding" | tr -d '\r')
if echo "$ENCODING" | grep -qi "gzip\|br"; then
  echo "  ✅ PASS Gzip/Brotli compression active ($ENCODING)"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL Compression not detected (Note: Payload must exceed 1KB threshold to compress)"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════"
echo ""

if [ $FAIL -gt 0 ]; then
  exit 1
else
  exit 0
fi
