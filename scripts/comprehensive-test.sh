#!/bin/bash
# Comprehensive Test Script for EAI Schema Toolkit

echo "==========================================="
echo "EAI Schema Toolkit Comprehensive Test"
echo "==========================================="

echo ""
echo "Testing backend API endpoints..."

BACKEND_URL="${BACKEND_URL:-"https://eai-schema-api-8128681f739e.herokuapp.com"}"
echo "Backend URL: $BACKEND_URL"

# Test 1: Health endpoint
echo ""
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"OK"'; then
    echo "   ✓ Health endpoint PASSED"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ✗ Health endpoint FAILED"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test 2: Upload routes - List files (should be empty)
echo ""
echo "2. Testing file list endpoint..."
FILES_RESPONSE=$(curl -s "$BACKEND_URL/api/upload/files")
if echo "$FILES_RESPONSE" | grep -q '"success"'; then
    echo "   ✓ File list endpoint PASSED"
else
    echo "   ✗ File list endpoint FAILED"
    echo "   Response: $FILES_RESPONSE"
fi

# Test 3: Message mapping - Generate mapping
echo ""
echo "3. Testing message mapping generation..."
MAPPING_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"configuration":{"messageType":"XML","dataType":"json","rootElement":"test"},"source":"{\"test\":\"data\"}"}' \
  "$BACKEND_URL/api/message-mapping/generate")
  
if echo "$MAPPING_RESPONSE" | grep -q '"id"'; then
    echo "   ✓ Message mapping generation PASSED"
    MAPPING_ID=$(echo "$MAPPING_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Generated mapping ID: $MAPPING_ID"
else
    echo "   ✗ Message mapping generation FAILED"
    echo "   Response: $MAPPING_RESPONSE"
fi

# Test 4: Message mapping - Get mapping by ID (if we have an ID)
if [ ! -z "$MAPPING_ID" ]; then
    echo ""
    echo "4. Testing get mapping by ID..."
    GET_MAPPING_RESPONSE=$(curl -s "$BACKEND_URL/api/message-mapping/$MAPPING_ID")
    if echo "$GET_MAPPING_RESPONSE" | grep -q '"id"'; then
        echo "   ✓ Get mapping by ID PASSED"
    else
        echo "   ✗ Get mapping by ID FAILED"
        echo "   Response: $GET_MAPPING_RESPONSE"
    fi
else
    echo ""
    echo "4. Skipping get mapping by ID (no mapping ID available)"
fi

# Test 5: Message mapping - List all mappings
echo ""
echo "5. Testing list all mappings..."
LIST_MAPPINGS_RESPONSE=$(curl -s "$BACKEND_URL/api/message-mapping/")
if echo "$LIST_MAPPINGS_RESPONSE" | grep -q '\['; then
    echo "   ✓ List all mappings PASSED"
else
    echo "   ✗ List all mappings FAILED"
    echo "   Response: $LIST_MAPPINGS_RESPONSE"
fi

# Test 6: Schema validation
echo ""
echo "6. Testing schema validation..."
VALIDATION_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"data":"{\"name\":\"John\"}","format":"json","schema":{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}}' \
  "$BACKEND_URL/api/schema-validation/validate")
  
if echo "$VALIDATION_RESPONSE" | grep -q '"valid"'; then
    echo "   ✓ Schema validation PASSED"
else
    echo "   ✗ Schema validation FAILED"
    echo "   Response: $VALIDATION_RESPONSE"
fi

# Test 7: Performance monitoring
echo ""
echo "7. Testing performance monitoring..."
PERFORMANCE_RESPONSE=$(curl -s "$BACKEND_URL/api/performance/metrics")
if echo "$PERFORMANCE_RESPONSE" | grep -q '# HELP'; then
    echo "   ✓ Performance monitoring PASSED"
else
    echo "   ✗ Performance monitoring FAILED"
    echo "   Response: $PERFORMANCE_RESPONSE"
fi

echo ""
echo "==========================================="
echo "Comprehensive test complete"
echo "==========================================="
echo ""
echo "Summary:"
echo "- Health check: Essential for verifying the API is running"
echo "- File operations: For uploading and managing schema files"
echo "- Message mapping: Core functionality for schema conversion"
echo "- Schema validation: For verifying schema correctness"
echo "- Performance monitoring: For tracking API performance"
echo ""
echo "If all tests passed, the backend API is functioning correctly."
echo "The frontend should be able to connect to this API for full functionality."
echo ""