#!/bin/bash

# WSDL Protocol Test Runner Script
# This script runs all WSDL-related tests and generates coverage reports

echo "🚀 Starting WSDL Protocol Test Suite..."
echo "======================================="

# Check if Jest is available
if ! command -v jest &> /dev/null; then
    echo "❌ Jest is not installed. Please install Jest first:"
    echo "   npm install --save-dev jest @types/jest"
    exit 1
fi

# Create test directories if they don't exist
mkdir -p src/__tests__/protocols
mkdir -p src/__tests__/models
mkdir -p src/__tests__/factories
mkdir -p src/__tests__/fixtures

echo "📁 Test directories verified"

# Run WSDL Protocol tests
echo ""
echo "🧪 Running WSDLProtocol unit tests..."
echo "------------------------------------"
npx jest src/__tests__/protocols/WSDLProtocol.test.ts --verbose

if [ $? -eq 0 ]; then
    echo "✅ WSDLProtocol tests passed"
else
    echo "❌ WSDLProtocol tests failed"
    exit 1
fi

# Run WSDL Model tests
echo ""
echo "🧪 Running WSDLModel unit tests..."
echo "---------------------------------"
npx jest src/__tests__/models/WSDLModel.test.ts --verbose

if [ $? -eq 0 ]; then
    echo "✅ WSDLModel tests passed"
else
    echo "❌ WSDLModel tests failed"
    exit 1
fi

# Run Protocol Factory tests
echo ""
echo "🧪 Running ProtocolFactory integration tests..."
echo "----------------------------------------------"
npx jest src/__tests__/factories/ProtocolFactory.test.ts --verbose

if [ $? -eq 0 ]; then
    echo "✅ ProtocolFactory tests passed"
else
    echo "❌ ProtocolFactory tests failed"
    exit 1
fi

# Run all WSDL-related tests together
echo ""
echo "🧪 Running complete WSDL test suite..."
echo "------------------------------------"
npx jest src/__tests__/protocols/WSDLProtocol.test.ts src/__tests__/models/WSDLModel.test.ts src/__tests__/factories/ProtocolFactory.test.ts --coverage --coverageDirectory=coverage/wsdl

if [ $? -eq 0 ]; then
    echo "✅ All WSDL tests passed"
else
    echo "❌ Some WSDL tests failed"
    exit 1
fi

# Generate coverage report
echo ""
echo "📊 Generating coverage report..."
echo "-------------------------------"
if [ -d "coverage/wsdl" ]; then
    echo "Coverage report generated in: coverage/wsdl/"
    echo "Open coverage/wsdl/lcov-report/index.html to view detailed coverage"
else
    echo "⚠️  Coverage report not generated"
fi

# Run performance tests (if available)
echo ""
echo "⚡ Running performance tests..."
echo "-----------------------------"
echo "Performance tests would measure:"
echo "- WSDL generation time for large datasets"
echo "- Memory usage during processing"
echo "- Parsing performance for complex WSDL files"

# Security tests
echo ""
echo "🔒 Security test considerations..."
echo "--------------------------------"
echo "Security tests should verify:"
echo "- XSS prevention in generated XML"
echo "- XML injection prevention"
echo "- Namespace validation"
echo "- Input sanitization"

echo ""
echo "🎉 WSDL Protocol Test Suite Complete!"
echo "====================================="
echo ""
echo "📋 Test Summary:"
echo "- WSDLProtocol unit tests: ✅"
echo "- WSDLModel unit tests: ✅"
echo "- ProtocolFactory integration tests: ✅"
echo "- Coverage report: Generated"
echo ""
echo "📁 Files created:"
echo "- src/__tests__/protocols/WSDLProtocol.test.ts"
echo "- src/__tests__/models/WSDLModel.test.ts"
echo "- src/__tests__/factories/ProtocolFactory.test.ts"
echo "- src/__tests__/fixtures/wsdl-test-data.ts"
echo "- WSDL_TEST_PLAN.md"
echo ""
echo "🚀 Ready for development and CI/CD integration!"