#!/bin/bash
# Deployment Verification Script for EAI Schema Toolkit

echo "==========================================="
echo "EAI Schema Toolkit Deployment Verification"
echo "==========================================="

echo ""
echo "Checking backend API..."
BACKEND_URL="${BACKEND_URL:-"https://eai-schema-api-8128681f739e.herokuapp.com"}"
echo "Backend URL: $BACKEND_URL"

# Test backend health endpoint
echo ""
echo "1. Testing backend health endpoint..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo "   ✓ Backend health check PASSED (HTTP $HEALTH_STATUS)"
else
    echo "   ✗ Backend health check FAILED (HTTP $HEALTH_STATUS)"
fi

# Test message mapping endpoint
echo ""
echo "2. Testing message mapping endpoint..."
MAPPING_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"configuration":{"messageType":"XML","dataType":"json","rootElement":"test"},"source":"{\"test\":\"data\"}"}' \
  "$BACKEND_URL/api/message-mapping/generate")
if echo "$MAPPING_RESPONSE" | grep -q '"id"'; then
    echo "   ✓ Message mapping endpoint PASSED"
else
    echo "   ✗ Message mapping endpoint FAILED"
    echo "   Response: $MAPPING_RESPONSE"
fi

echo ""
echo "Checking frontend..."
FRONTEND_URL="${FRONTEND_URL:-"https://yakdoli.github.io/eai-schema"}"
echo "Frontend URL: $FRONTEND_URL"

# Test frontend accessibility
echo ""
echo "3. Testing frontend accessibility..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/")
if [ "$FRONTEND_STATUS" -eq 200 ]; then
    echo "   ✓ Frontend accessibility PASSED (HTTP $FRONTEND_STATUS)"
elif [ "$FRONTEND_STATUS" -eq 301 ]; then
    echo "   ! Frontend redirects (HTTP $FRONTEND_STATUS) - May be configured to redirect elsewhere"
else
    echo "   ✗ Frontend accessibility FAILED (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "==========================================="
echo "Deployment verification complete"
echo "==========================================="
echo ""
echo "Next steps:"
echo "1. If backend tests passed, the API is working correctly"
echo "2. If frontend redirects, check GitHub Pages settings in repository"
echo "3. For full functionality, ensure frontend can connect to backend"
echo ""