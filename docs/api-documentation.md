# EAI Schema Toolkit API Documentation

## Overview

The EAI Schema Toolkit provides a comprehensive RESTful API for enterprise application integration tasks including schema conversion, validation, and collaboration.

## Base URL

```
https://your-deployment-url.herokuapp.com/api
```

## Authentication

Most endpoints do not require authentication. However, rate limiting is applied to prevent abuse.

## Rate Limiting

- Limit: 100 requests per 15 minutes
- Responses include rate limit headers

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message"
}
```

## API Endpoints

### Health Check

#### GET `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### File Upload

#### POST `/upload/file`

Upload a schema file.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` - The file to upload

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "unique-file-id",
    "originalName": "schema.xml",
    "size": 12345,
    "mimetype": "application/xml",
    "uploadedAt": "2023-01-01T00:00:00.000Z",
    "expiresAt": "2023-01-02T00:00:00.000Z"
  }
}
```

#### POST `/upload/url`

Fetch a schema from a URL.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "url": "https://example.com/schema.xml"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schema fetched successfully",
  "data": {
    "fileId": "unique-file-id",
    "originalName": "schema.xml",
    "size": 12345,
    "mimetype": "application/xml",
    "sourceUrl": "https://example.com/schema.xml",
    "uploadedAt": "2023-01-01T00:00:00.000Z",
    "expiresAt": "2023-01-02T00:00:00.000Z"
  }
}
```

#### GET `/upload/file/{fileId}`

Get information about an uploaded file.

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "unique-file-id",
    "originalName": "schema.xml",
    "size": 12345,
    "mimetype": "application/xml",
    "uploadedAt": "2023-01-01T00:00:00.000Z",
    "expiresAt": "2023-01-02T00:00:00.000Z"
  }
}
```

#### GET `/upload/file/{fileId}/content`

Download the content of an uploaded file.

**Response:**
- Content-Type: `application/octet-stream`
- Body: File content

#### DELETE `/upload/file/{fileId}`

Delete an uploaded file.

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

#### GET `/upload/files`

Get a list of all uploaded files.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "fileId": "unique-file-id",
      "originalName": "schema.xml",
      "size": 12345,
      "mimetype": "application/xml",
      "uploadedAt": "2023-01-01T00:00:00.000Z",
      "expiresAt": "2023-01-02T00:00:00.000Z"
    }
  ]
}
```

#### POST `/upload/validate-url`

Validate a URL for schema fetching.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "url": "https://example.com/schema.xml"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Valid URL",
  "data": {
    "url": "https://example.com/schema.xml",
    "isValid": true,
    "isSupported": true
  }
}
```

### Message Mapping

#### POST `/message-mapping/generate`

Generate a message mapping.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "configuration": {
    "messageType": "XML",
    "dataType": "json",
    "rootElement": "root",
    "namespace": "http://example.com/schema",
    "encoding": "UTF-8",
    "version": "1.0",
    "statement": "SELECT * FROM data",
    "testData": {}
  },
  "source": "<xml><data>test</data></xml>"
}
```

**Response:**
```json
{
  "id": "mapping_12345",
  "source": "<xml><data>test</data></xml>",
  "target": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><root xmlns=\"http://example.com/schema\"><data>test</data></root>",
  "mappings": {
    "messageType": "XML",
    "dataType": "xml",
    "mappingRules": [...]
  },
  "configuration": {...},
  "metadata": {
    "createdAt": "2023-01-01T00:00:00.000Z",
    "nodeCount": 3,
    "xmlSize": 142,
    "processingTime": 45,
    "validationStatus": true
  }
}
```

#### GET `/message-mapping/{id}`

Get a message mapping by ID.

**Response:**
```json
{
  "id": "mapping_12345",
  "source": "<xml><data>test</data></xml>",
  "target": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><root xmlns=\"http://example.com/schema\"><data>test</data></root>",
  "mappings": {
    "messageType": "XML",
    "dataType": "xml",
    "mappingRules": [...]
  },
  "configuration": {...},
  "metadata": {
    "createdAt": "2023-01-01T00:00:00.000Z",
    "nodeCount": 3,
    "xmlSize": 142,
    "processingTime": 45,
    "validationStatus": true
  }
}
```

#### DELETE `/message-mapping/{id}`

Delete a message mapping by ID.

**Response:**
```json
{
  "message": "Message mapping cleared successfully"
}
```

#### GET `/message-mapping`

Get all message mappings.

**Response:**
```json
[
  {
    "id": "mapping_12345",
    "source": "<xml><data>test</data></xml>",
    "target": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><root xmlns=\"http://example.com/schema\"><data>test</data></root>",
    "mappings": {
      "messageType": "XML",
      "dataType": "xml",
      "mappingRules": [...]
    },
    "configuration": {...},
    "metadata": {
      "createdAt": "2023-01-01T00:00:00.000Z",
      "nodeCount": 3,
      "xmlSize": 142,
      "processingTime": 45,
      "validationStatus": true
    }
  }
]
```

#### POST `/message-mapping/{id}/rules`

Create advanced mapping rules.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "rules": [
    {
      "id": "rule_1",
      "type": "element",
      "sourcePath": "/source/element",
      "targetPath": "/target/element"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Advanced mapping rules created successfully"
}
```

#### GET `/message-mapping/{id}/rules`

Get advanced mapping rules.

**Response:**
```json
[
  {
    "id": "rule_1",
    "type": "element",
    "sourcePath": "/source/element",
    "targetPath": "/target/element"
  }
]
```

#### POST `/message-mapping/{id}/transformations`

Create transformation rules.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "id": "transform_1",
  "name": "uppercase",
  "description": "Convert to uppercase",
  "function": "toUpperCase",
  "parameters": {}
}
```

**Response:**
```json
{
  "message": "Transformation rule created successfully"
}
```

#### GET `/message-mapping/{id}/transformations`

Get transformation rules.

**Response:**
```json
[
  {
    "id": "transform_1",
    "name": "uppercase",
    "description": "Convert to uppercase",
    "function": "toUpperCase",
    "parameters": {}
  }
]
```

#### POST `/message-mapping/{id}/collaboration`

Add collaboration event.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "userId": "user_123",
  "username": "john_doe",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "action": "update",
  "target": "field_name",
  "details": {
    "oldValue": "old",
    "newValue": "new"
  }
}
```

**Response:**
```json
{
  "message": "Collaboration event added successfully"
}
```

#### GET `/message-mapping/{id}/collaboration`

Get collaboration history.

**Response:**
```json
[
  {
    "userId": "user_123",
    "username": "john_doe",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "action": "update",
    "target": "field_name",
    "details": {
      "oldValue": "old",
      "newValue": "new"
    }
  }
]
```

#### POST `/message-mapping/validate-schema`

Validate schema.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "content": "<xml>...</xml>",
  "schemaType": "xsd",
  "schemaContent": "<schema>...</schema>"
}
```

**Response:**
```json
{
  "valid": true
}
```

### MCP Integration

#### GET `/mcp/provider`

Get MCP provider information.

**Response:**
```json
{
  "name": "EAI Schema Toolkit MCP Provider",
  "version": "1.0.0",
  "capabilities": [
    "schema-mapping",
    "schema-validation",
    "data-transformation"
  ],
  "supportedFormats": ["XML", "JSON", "YAML"],
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

#### POST `/mcp/process`

Process MCP request.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "action": "generateMapping",
  "data": {
    "configuration": {...},
    "source": "..."
  }
}
```

**Response:**
```json
{
  // Result based on action
}
```

#### GET `/mcp/health`

Check MCP health.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Collaboration

#### GET `/collaboration/{mappingId}/history`

Get collaboration history for a mapping.

**Response:**
```json
[
  {
    "id": "event_123",
    "userId": "user_123",
    "username": "john_doe",
    "mappingId": "mapping_12345",
    "type": "fieldUpdate",
    "data": {
      "fieldId": "sourceInput",
      "value": "<xml>...</xml>"
    },
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
]
```

#### GET `/collaboration/{mappingId}/users`

Get users in a mapping session.

**Response:**
```json
[
  {
    "id": "user_123",
    "username": "john_doe",
    "mappingId": "mapping_12345",
    "joinedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Schema Validation

#### POST `/schema-validation/validate`

Validate schema.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "data": "<xml>...</xml>",
  "format": "xml",
  "schema": "<schema>...</schema>"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

#### GET `/schema-validation/formats`

Get supported formats.

**Response:**
```json
{
  "formats": ["json", "xml", "yaml", "yml"]
}
```

#### POST `/schema-validation/json`

Validate JSON schema.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "data": {"name": "John"},
  "schema": {"type": "object", "properties": {"name": {"type": "string"}}}
}
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

#### POST `/schema-validation/xml`

Validate XML schema.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "xml": "<person><name>John</name></person>",
  "xsd": "<schema>...</schema>"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

#### POST `/schema-validation/yaml`

Validate YAML schema.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "yaml": "name: John",
  "schema": "..." // Optional
}
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```