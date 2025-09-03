#!/bin/bash
# Heroku deployment script

# Exit on any error
set -e

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production

# Build the application
echo "Building the application..."
npm run build

echo "Deployment script completed successfully!"