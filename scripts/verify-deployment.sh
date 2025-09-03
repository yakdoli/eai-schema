#!/bin/bash
# Deployment Verification Script for EAI Schema Toolkit

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check if required tools are installed
print_info "Checking prerequisites..."

if ! command -v curl &> /dev/null; then
  print_error "curl is not installed. Please install curl to run this script."
  exit 1
fi

if ! command -v jq &> /dev/null; then
  print_warning "jq is not installed. Some checks may be less detailed."
fi

print_status "Prerequisites check passed"

# Get URLs from user input or environment variables
FRONTEND_URL=${FRONTEND_URL:-$1}
BACKEND_URL=${BACKEND_URL:-$2}

if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ]; then
  echo ""
  print_info "Please provide the frontend and backend URLs:"
  read -p "Frontend URL (e.g., https://username.github.io/eai-schema/): " FRONTEND_URL
  read -p "Backend URL (e.g., https://your-app.herokuapp.com): " BACKEND_URL
fi

echo ""
print_info "Starting verification process..."
print_info "Frontend URL: $FRONTEND_URL"
print_info "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Frontend accessibility
print_info "1. Testing frontend accessibility..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$HTTP_STATUS" -eq 200 ]; then
  print_status "Frontend is accessible (HTTP $HTTP_STATUS)"
else
  print_error "Frontend is not accessible (HTTP $HTTP_STATUS)"
fi

# Test 2: Backend health endpoint
print_info "2. Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "\"status\":\"OK\""; then
  print_status "Backend health check passed"
else
  print_error "Backend health check failed"
  echo "Response: $HEALTH_RESPONSE"
fi

# Test 3: MCP provider endpoint
print_info "3. Testing MCP provider endpoint..."
MCP_PROVIDER_RESPONSE=$(curl -s "$BACKEND_URL/api/mcp/provider")
if echo "$MCP_PROVIDER_RESPONSE" | grep -q "\"name\":\"EAI Schema Toolkit MCP Provider\""; then
  print_status "MCP provider endpoint is working"
else
  print_error "MCP provider endpoint failed"
  echo "Response: $MCP_PROVIDER_RESPONSE"
fi

# Test 4: Performance metrics endpoint
print_info "4. Testing performance metrics endpoint..."
METRICS_RESPONSE=$(curl -s "$BACKEND_URL/api/performance/metrics")
if echo "$METRICS_RESPONSE" | grep -q "# HELP"; then
  print_status "Performance metrics endpoint is working"
else
  print_error "Performance metrics endpoint failed"
  echo "Response: $METRICS_RESPONSE"
fi

# Test 5: Message mapping endpoint
print_info "5. Testing message mapping endpoint..."
MAPPING_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"configuration":{"messageType":"XML","dataType":"json","rootElement":"test"},"source":"{\"test\":\"data\"}"}' \
  "$BACKEND_URL/api/message-mapping/generate")
if echo "$MAPPING_RESPONSE" | grep -q "\"id\""; then
  print_status "Message mapping endpoint is working"
else
  print_error "Message mapping endpoint failed"
  echo "Response: $MAPPING_RESPONSE"
fi

# Test 6: Collaboration endpoint
print_info "6. Testing collaboration endpoint..."
COLLABORATION_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/collaboration/formats")
if echo "$COLLABORATION_RESPONSE" | grep -q "\["; then
  print_status "Collaboration endpoint is working"
else
  print_warning "Collaboration endpoint might not be implemented yet"
  echo "Response: $COLLABORATION_RESPONSE"
fi

# Test 7: Schema validation endpoint
print_info "7. Testing schema validation endpoint..."
VALIDATION_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"data":"{\"name\":\"John\"}","format":"json","schema":{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}}' \
  "$BACKEND_URL/api/schema-validation/validate")
if echo "$VALIDATION_RESPONSE" | grep -q "\"valid\""; then
  print_status "Schema validation endpoint is working"
else
  print_error "Schema validation endpoint failed"
  echo "Response: $VALIDATION_RESPONSE"
fi

echo ""
print_info "Verification process completed."
print_info "Please check the results above for any issues that need to be addressed."

# Additional information
echo ""
print_info "Next steps:"
print_info "- If all tests passed, your deployment is successful!"
print_info "- If any tests failed, check the specific error messages above"
print_info "- For ongoing monitoring, you can periodically run this script"
print_info "- For detailed performance insights, connect Prometheus to $BACKEND_URL/api/performance/metrics"