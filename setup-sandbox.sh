#!/bin/bash

# Setup sandbox testing environment

echo "Setting up sandbox testing environment..."

# Create sandbox directory
mkdir -p sandbox
cd sandbox

# Copy necessary files
echo "Copying files to sandbox..."
cp -r ../src/protocols ./ 2>/dev/null || echo "No protocols directory to copy"
cp -r ../src/models ./ 2>/dev/null || echo "No models directory to copy"
cp -r ../src/factories ./ 2>/dev/null || echo "No factories directory to copy"
cp -r ../src/utils ./ 2>/dev/null || echo "No utils directory to copy"

# Create a basic package.json for the sandbox
cat > package.json << EOF
{
  "name": "eai-sandbox",
  "version": "1.0.0",
  "description": "Sandbox environment for EAI Work Tool testing",
  "type": "module",
  "scripts": {
    "test": "node test-example.js"
  },
  "dependencies": {
    "fast-xml-parser": "^4.2.5",
    "xmlbuilder2": "^3.1.1"
  }
}
EOF

# Create example test file
cat > test-example.js << EOF
// Example test file for sandbox environment
import { readFileSync } from 'fs';

console.log('Sandbox test environment ready!');
console.log('Run your tests here without affecting the main project.');

// Example test
function exampleTest() {
  console.log('Running example test...');
  // Add your test code here
  return true;
}

// Run the example
const result = exampleTest();
console.log('Example test result:', result ? 'PASS' : 'FAIL');
EOF

echo "Sandbox environment setup complete!"
echo "To use:"
echo "  cd sandbox"
echo "  npm install  # or pnpm install"
echo "  node test-example.js"
echo ""
echo "See README.md for more details."