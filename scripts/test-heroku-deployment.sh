#!/bin/bash
# Heroku Deployment Test Script

echo "=== Heroku Deployment Test ==="

# Check if Heroku CLI is installed
echo "1. Checking Heroku CLI installation..."
if command -v heroku &> /dev/null; then
    echo "✓ Heroku CLI is installed"
    heroku --version
else
    echo "✗ Heroku CLI is not installed"
    echo "Installing Heroku CLI..."
    curl https://cli-assets.heroku.com/install.sh | sh
fi

# Check if we're logged in to Heroku
echo "2. Checking Heroku login status..."
if heroku auth:whoami &> /dev/null; then
    echo "✓ Logged in to Heroku"
else
    echo "✗ Not logged in to Heroku"
    echo "Please login to Heroku first:"
    echo "heroku login"
    exit 1
fi

# Check if the app exists
echo "3. Checking if Heroku app exists..."
APP_NAME="eai-schema-api"
if heroku apps:info -a $APP_NAME &> /dev/null; then
    echo "✓ Heroku app '$APP_NAME' exists"
else
    echo "✗ Heroku app '$APP_NAME' does not exist"
    echo "Creating Heroku app..."
    heroku create $APP_NAME
fi

# Check Node.js version
echo "4. Checking Node.js version..."
node --version
npm --version

# Test build process
echo "5. Testing build process..."
if npm run build; then
    echo "✓ Build process successful"
else
    echo "✗ Build process failed"
    exit 1
fi

echo "=== Heroku Deployment Test Complete ==="
echo "You can now deploy to Heroku using:"
echo "git push heroku main"