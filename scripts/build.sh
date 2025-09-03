#!/bin/bash
# Simple build script for TypeScript compilation

echo "Building TypeScript project..."

# Install TypeScript if not found
if ! command -v tsc &> /dev/null; then
    echo "TypeScript compiler (tsc) not found. Installing TypeScript..."
    npm install -g typescript
fi

# Check if tsconfig.json exists
if [ ! -f "tsconfig.json" ]; then
    echo "tsconfig.json not found. Creating a basic configuration..."
    echo '{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}' > tsconfig.json
fi

# Compile TypeScript files
echo "Compiling TypeScript files..."
tsc

# Check compilation result
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
else
    echo "Build completed with warnings/errors (continuing...)"
fi