# EAI Schema Toolkit Test Suite

## Overview

This document describes the comprehensive test suite for the EAI Schema Toolkit, covering all major components and functionalities.

## Test Structure

```
src/
├── __tests__/
│   ├── integration/
│   │   ├── api.test.ts
│   │   ├── fileUpload.test.ts
│   │   ├── messageMapping.test.ts
│   │   ├── collaboration.test.ts
│   │   └── schemaValidation.test.ts
│   └── setup.ts
├── services/
│   ├── __tests__/
│   │   ├── MessageMappingService.test.ts
│   │   ├── FileUploadService.test.ts
│   │   ├── CollaborationService.test.ts
│   │   ├── SchemaValidationService.test.ts
│   │   └── MCPIntegrationService.test.ts
│   └── ...
├── routes/
│   ├── __tests__/
│   │   ├── upload.test.ts
│   │   ├── messageMapping.test.ts
│   │   ├── collaboration.test.ts
│   │   ├── mcp.test.ts
│   │   └── schemaValidation.test.ts
│   └── ...
└── mcp/
    ├── __tests__/
    │   └── MCPIntegrationService.test.ts
    └── ...
```

## Test Categories

### 1. Unit Tests

Unit tests focus on individual functions and classes, ensuring they work correctly in isolation.

#### MessageMappingService
- Test mapping generation for different formats (XML, JSON, YAML)
- Test configuration validation
- Test mapping rule generation
- Test metadata generation
- Test error handling

#### FileUploadService
- Test file validation (size, type, content)
- Test file storage and retrieval
- Test file expiration and cleanup
- Test security features (XXE prevention)

#### CollaborationService
- Test user joining and leaving
- Test collaboration event handling
- Test WebSocket communication
- Test user management

#### SchemaValidationService
- Test JSON schema validation
- Test XML schema validation
- Test YAML schema validation
- Test error handling

#### MCPIntegrationService
- Test request processing
- Test provider information
- Test error handling

### 2. Integration Tests

Integration tests verify that different components work together correctly.

#### API Endpoints
- Test all RESTful endpoints
- Test request/response formats
- Test error responses
- Test authentication and authorization

#### File Upload Integration
- Test file upload workflow
- Test URL fetching workflow
- Test file management (list, download, delete)

#### Message Mapping Integration
- Test complete mapping generation workflow
- Test mapping retrieval and deletion
- Test advanced features (rules, transformations)

#### Collaboration Integration
- Test real-time collaboration features
- Test WebSocket communication
- Test multi-user scenarios

#### Schema Validation Integration
- Test end-to-end schema validation
- Test different format combinations
- Test validation error handling

### 3. End-to-End Tests

End-to-end tests simulate real user scenarios.

#### File Processing Workflow
1. Upload a schema file
2. Generate a message mapping
3. Validate the mapping
4. Download the result

#### Collaboration Workflow
1. User A creates a mapping
2. User B joins the collaboration session
3. Both users make changes
4. Verify synchronization

#### Schema Validation Workflow
1. Upload a schema file
2. Validate against a schema
3. Check validation results

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/services/__tests__/MessageMappingService.test.ts

# Run tests in watch mode
npm test -- --watch
```

### Test Configuration

The test suite uses Jest as the testing framework with the following configuration:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000
};
```

## Test Data

### Sample Files

The test suite includes sample files for different formats:

1. **XML Sample**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:tns="http://example.com/test"
             targetNamespace="http://example.com/test">
  <types>
    <schema xmlns="http://www.w3.org/2001/XMLSchema"
            targetNamespace="http://example.com/test">
      <element name="TestElement" type="string"/>
    </schema>
  </types>
  <message name="TestMessage">
    <part name="parameter" element="tns:TestElement"/>
  </message>
  <portType name="TestPortType">
    <operation name="TestOperation">
      <input message="tns:TestMessage"/>
    </operation>
  </portType>
</definitions>
```

2. **JSON Sample**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Test API",
    "version": "1.0.0"
  },
  "paths": {
    "/test": {
      "get": {
        "summary": "Test endpoint",
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}
```

3. **YAML Sample**
```yaml
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Test endpoint
      responses:
        '200':
          description: Success
```

### Test Configuration

Sample configurations for testing different scenarios:

1. **XML Configuration**
```json
{
  "messageType": "XML",
  "dataType": "xml",
  "rootElement": "root",
  "namespace": "http://example.com/schema",
  "encoding": "UTF-8",
  "version": "1.0",
  "statement": "SELECT * FROM data"
}
```

2. **JSON Configuration**
```json
{
  "messageType": "JSON",
  "dataType": "json",
  "rootElement": "data",
  "statement": "SELECT * FROM data"
}
```

## Continuous Integration

The test suite is integrated with GitHub Actions for continuous integration:

```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Run build
        run: npm run build
```

## Code Coverage

The test suite aims for the following coverage targets:

- **Overall**: 80%+ coverage
- **Services**: 90%+ coverage
- **Routes**: 85%+ coverage
- **Critical paths**: 100% coverage

Coverage reports are generated in multiple formats:
- Text output in the terminal
- HTML reports in the `coverage/` directory
- LCOV reports for CI integration

## Performance Testing

Performance tests ensure the application can handle expected loads:

### Load Testing Scenarios

1. **Concurrent File Uploads**
   - 100 concurrent users uploading files
   - Measure response times and success rates

2. **Mapping Generation**
   - 50 concurrent users generating mappings
   - Measure processing times and resource usage

3. **Collaboration Sessions**
   - 20 concurrent collaboration sessions
   - Measure WebSocket performance and synchronization

### Benchmark Tests

Benchmark tests track performance over time:

```javascript
// Example benchmark test
describe('MessageMappingService Performance', () => {
  it('should generate mapping within 100ms for small data', async () => {
    const config = { messageType: 'XML', dataType: 'json' };
    const source = '{"test": "data"}';
    
    const start = performance.now();
    const result = service.generateMapping(config, source);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
    expect(result).toBeDefined();
  });
});
```

## Security Testing

Security tests ensure the application is protected against common vulnerabilities:

### Input Validation Tests

- Test for SQL injection attempts
- Test for XSS attacks
- Test for XXE attacks
- Test for file upload restrictions

### Authentication Tests

- Test CORS policies
- Test rate limiting
- Test secure headers

## Testing Best Practices

### Test Organization

1. **Arrange-Act-Assert Pattern**
```typescript
it('should validate valid JSON', () => {
  // Arrange
  const data = { name: 'John' };
  const schema = { type: 'object' };
  
  // Act
  const result = service.validateJson(data, schema);
  
  // Assert
  expect(result.valid).toBe(true);
});
```

### Mocking and Stubbing

Use mocks to isolate units under test:

```typescript
// Mock external dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

// Test with mock
const service = new MessageMappingService(mockLogger);
```

### Test Data Management

- Use factory functions for test data
- Clean up test data after each test
- Use realistic but minimal test data

### Asynchronous Testing

Handle asynchronous operations properly:

```typescript
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

## Test Reporting

Test results are reported in multiple formats:

1. **Console Output**: Real-time test progress
2. **HTML Reports**: Detailed test results with coverage
3. **CI Integration**: Automated test results in pull requests

## Maintenance

### Test Updates

- Update tests when functionality changes
- Add tests for new features
- Remove obsolete tests

### Test Performance

- Monitor test execution times
- Optimize slow tests
- Run tests in parallel when possible

This comprehensive test suite ensures the EAI Schema Toolkit is reliable, secure, and performs well under various conditions.