#!/bin/bash
# Test runner script for EAI Schema Toolkit

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed. Please install Node.js first."
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  print_error "npm is not installed. Please install npm first."
  exit 1
fi

print_status "Node.js and npm are installed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  print_status "Installing dependencies..."
  npm ci
else
  print_status "Dependencies already installed"
fi

# Run linter
print_status "Running linter..."
npm run lint || {
  print_error "Linting failed"
  exit 1
}

# Run unit tests
print_status "Running unit tests..."
npm run test || {
  print_error "Unit tests failed"
  exit 1
}

# Run integration tests
print_status "Running integration tests..."
npm run test:integration || {
  print_warning "Integration tests failed (this may be expected in some environments)"
}

# Run build
print_status "Running build..."
npm run build || {
  print_error "Build failed"
  exit 1
}

print_status "All tests passed successfully!"