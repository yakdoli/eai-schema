# EAI Work Tool Schema Mapping

## Overview

This document provides a comprehensive mapping between the EAI Work Tool interface structure and the EAI Schema Toolkit implementation. The EAI Schema Toolkit has been designed to reflect and enhance the functionality of the original EAI Work Tool while providing additional features and improved user experience.

## EAI Work Tool Structure Analysis

Based on the fetched content from https://eai-work-tool.com/, the tool consists of the following main sections:

### Core Sections
- **Configuration**: Setup and configuration parameters
- **Source**: Input data source definition
- **Message Type**: Message format specification (XML, JSON, YAML)
- **Data Type**: Data type definitions
- **Statement**: Processing statements or queries
- **Test Data**: Sample data for validation
- **Message Mapping**: Core mapping functionality
- **Generate**: Action to generate mappings
- **Clear**: Action to reset the interface
- **Result**: Output display area
- **Download**: Export functionality
- **Copy**: Clipboard functionality

## EAI Schema Toolkit Implementation

### Architecture Overview

The EAI Schema Toolkit implements a client-server architecture with:

- **Frontend**: HTML/CSS/JavaScript single-page application
- **Backend**: Node.js/Express API server
- **Database**: In-memory storage with file persistence
- **Deployment**: GitHub Pages for frontend, cloud hosting for backend

### Core Components Mapping

| EAI Work Tool Section | EAI Schema Toolkit Implementation | Description |
|----------------------|-----------------------------------|-------------|
| Configuration | `Configuration` interface + UI form | Enhanced with additional fields like namespace, encoding, version |
| Source | Source textarea + file upload | Supports multiple input methods (direct, file, URL) |
| Message Type | Message type selector buttons | XML, JSON, YAML with dynamic validation |
| Data Type | Data type input field | Auto-populated from message type selection |
| Statement | Statement textarea | SQL/XSLT/query input with syntax highlighting |
| Test Data | Test data textarea | JSON validation and preview |
| Message Mapping | Mapping rules display | Dynamic rule generation with visual feedback |
| Generate | Generate button | Triggers mapping creation with progress indication |
| Clear | Clear button | Resets all form fields and results |
| Result | Multi-tab result display | XML, JSON, Preview, Mapping tabs |
| Download | Download button | Multiple format export (XML, JSON, mapping rules) |
| Copy | Copy button | Clipboard functionality for all result formats |

## Detailed Schema Mapping

### Configuration Schema

```typescript
interface Configuration {
  messageType: string;      // Maps to EAI Work Tool "Message Type"
  dataType: string;         // Maps to EAI Work Tool "Data Type"
  rootElement: string;      // Enhanced field for XML root element
  namespace: string;        // Enhanced field for XML namespace
  encoding: string;         // Enhanced field for character encoding
  version: string;          // Enhanced field for schema version
  statement: string;        // Maps to EAI Work Tool "Statement"
  testData: any;           // Maps to EAI Work Tool "Test Data"
}
```

### Message Mapping Schema

```typescript
interface MessageMapping {
  id: string;              // Unique identifier for the mapping
  source: string;          // Original source data
  target: string;          // Transformed output
  mappings: Record<string, any>;  // Generated mapping rules
  configuration: Configuration;   // Configuration used
  metadata: MappingMetadata;      // Processing metadata
}

interface MappingMetadata {
  createdAt: Date;         // Creation timestamp
  nodeCount: number;       // Number of nodes in output
  xmlSize: number;         // Size of generated XML
  processingTime: number;  // Processing duration in ms
  validationStatus: boolean; // Validation result
}
```

### Mapping Rules Schema

```typescript
interface MappingRule {
  type: string;           // Rule type (element, dataType, statement)
  name: string;           // Rule name/identifier
  namespace?: string;     // XML namespace (if applicable)
  attributes?: Record<string, any>; // XML attributes
  transformation?: string; // Transformation type
  processing?: string;    // Processing instruction
  content?: string;       // Rule content
}
```

## UI/UX Mapping

### Layout Structure

The EAI Schema Toolkit mirrors the EAI Work Tool layout:

```
┌─────────────────────────────────────────────────┐
│                    Header                       │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐                 │
│ │             │ │             │                 │
│ │ Configuration│ │   Source    │                 │
│ │             │ │             │                 │
│ └─────────────┘ └─────────────┘                 │
├─────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────────┐ │
│ │Msg  │ │Data │ │Stmt │ │Test │ │Message      │ │
│ │Type │ │Type │ │     │ │Data │ │Mapping      │ │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────────────┘ │
├─────────────────────────────────────────────────┤
│            [Generate] [Validate] [Clear]       │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │                Result Tabs                  │ │
│ │ [XML] [JSON] [Preview] [Mapping]            │ │
│ ├─────────────────────────────────────────────┤ │
│ │                                             │ │
│ │              Result Content                  │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│            [Download] [Copy] [Share]           │
└─────────────────────────────────────────────────┘
```

### Enhanced Features

Compared to the original EAI Work Tool, the EAI Schema Toolkit includes:

1. **Multi-format Support**: XML, JSON, YAML processing
2. **File Upload**: Drag-and-drop file upload functionality
3. **URL Import**: Direct schema import from URLs
4. **Real-time Validation**: Input validation with feedback
5. **Progress Indicators**: Loading states and progress feedback
6. **Dark Mode**: Theme switching capability
7. **Responsive Design**: Mobile-friendly interface
8. **API Integration**: RESTful API for programmatic access
9. **Export Options**: Multiple download formats
10. **Share Functionality**: Web Share API integration

## API Endpoints Mapping

### Core API Endpoints

| Endpoint | Method | Purpose | EAI Work Tool Equivalent |
|----------|--------|---------|--------------------------|
| `/api/message-mapping/generate` | POST | Generate message mapping | Generate button |
| `/api/message-mapping/:id` | GET | Retrieve mapping by ID | Result display |
| `/api/message-mapping/:id` | DELETE | Delete mapping | Clear functionality |
| `/api/upload/file` | POST | Upload schema file | File input |
| `/api/upload/url` | POST | Import from URL | URL input |
| `/api/upload/file/:id/content` | GET | Download file | Download button |
| `/api/upload/files` | GET | List uploaded files | File management |

### Request/Response Schemas

#### Generate Mapping Request
```json
{
  "configuration": {
    "messageType": "XML",
    "dataType": "xml",
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

#### Generate Mapping Response
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
    "createdAt": "2024-01-15T10:30:00Z",
    "nodeCount": 3,
    "xmlSize": 142,
    "processingTime": 45,
    "validationStatus": true
  }
}
```

## Data Transformation Logic

### XML Transformation

```typescript
private transformXml(source: string, config: Configuration): string {
  const rootElement = config.rootElement || "root";
  const namespace = config.namespace ? ` xmlns="${config.namespace}"` : "";
  const version = config.version || "1.0";
  const encoding = config.encoding || "UTF-8";

  let xmlContent = `<?xml version="${version}" encoding="${encoding}"?>\n`;
  xmlContent += `<${rootElement}${namespace}>\n`;

  // Process source data
  if (config.dataType === "JSON") {
    try {
      const jsonData = JSON.parse(source);
      xmlContent += this.jsonToXml(jsonData, 1);
    } catch {
      xmlContent += `  <source><![CDATA[${source}]]></source>\n`;
    }
  } else {
    xmlContent += `  <source><![CDATA[${source}]]></source>\n`;
  }

  // Add statement if provided
  if (config.statement) {
    xmlContent += `  <statement><![CDATA[${config.statement}]]></statement>\n`;
  }

  xmlContent += `</${rootElement}>`;
  return xmlContent;
}
```

### JSON Transformation

```typescript
private transformJson(source: string, config: Configuration): string {
  try {
    const parsed = JSON.parse(source);
    const result = {
      root: config.rootElement || "root",
      namespace: config.namespace || "",
      encoding: config.encoding || "UTF-8",
      version: config.version || "1.0",
      data: parsed,
      statement: config.statement || "",
      transformed: true,
    };
    return JSON.stringify(result, null, 2);
  } catch {
    return JSON.stringify({
      error: "Invalid JSON source",
      source: source,
      config: config,
    }, null, 2);
  }
}
```

## Validation and Error Handling

### Input Validation

The toolkit implements comprehensive validation:

1. **Message Type Validation**: Ensures selected type is supported
2. **Source Data Validation**: Validates format based on message type
3. **Configuration Validation**: Checks required fields
4. **Schema Validation**: Validates generated output against standards

### Error Handling

```typescript
// Example error response
{
  "error": "ValidationError",
  "message": "Invalid XML format in source data",
  "details": {
    "field": "source",
    "expected": "Valid XML string",
    "received": "Invalid XML content"
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Components loaded on demand
2. **Caching**: API responses cached for repeated requests
3. **Debouncing**: Input validation debounced for performance
4. **Streaming**: Large file processing with streaming
5. **Compression**: Response compression for large payloads

### Metrics Tracking

The system tracks key performance metrics:

- Processing time for transformations
- Memory usage for large files
- API response times
- Error rates by endpoint
- User interaction patterns

## Security Considerations

### Input Sanitization

1. **XSS Prevention**: All user inputs sanitized
2. **SQL Injection Prevention**: Parameterized queries
3. **File Upload Security**: Type validation and size limits
4. **Rate Limiting**: API request throttling
5. **CORS Configuration**: Proper cross-origin policies

### Data Protection

1. **Encryption**: Sensitive data encrypted in transit
2. **Access Control**: API authentication and authorization
3. **Audit Logging**: All operations logged for security
4. **Data Retention**: Automatic cleanup of temporary files

## Testing Strategy

### Unit Tests

```typescript
describe("MessageMappingService", () => {
  test("should generate valid XML mapping", () => {
    const config: Configuration = {
      messageType: "XML",
      dataType: "json",
      rootElement: "root",
      statement: "SELECT * FROM data"
    };
    const source = '{"data": "test"}';

    const result = service.generateMapping(config, source);

    expect(result.target).toContain("<?xml");
    expect(result.target).toContain("<root>");
    expect(result.metadata.validationStatus).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe("API Integration", () => {
  test("should handle complete mapping workflow", async () => {
    const response = await request(app)
      .post("/api/message-mapping/generate")
      .send({
        configuration: validConfig,
        source: validSource
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("target");
  });
});
```

## Deployment and Scaling

### Development Environment

```bash
# Local development setup
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run test suite
```

### Production Deployment

```bash
# Build and deploy
npm run build
npm start           # Production server
# Or deploy to cloud platforms
```

### Scaling Considerations

1. **Horizontal Scaling**: Multiple server instances
2. **Load Balancing**: Distribute requests across instances
3. **Caching Layer**: Redis for session and data caching
4. **CDN**: Static asset delivery optimization
5. **Database**: Persistent storage for large-scale deployments

## Future Enhancements

### Planned Features

1. **Advanced Mapping Rules**: Visual mapping designer
2. **Schema Validation**: XSD/JSON Schema validation
3. **Real-time Collaboration**: Multi-user editing
4. **Plugin System**: Extensible transformation plugins
5. **Analytics Dashboard**: Usage and performance analytics
6. **Mobile App**: Native mobile application
7. **API Gateway**: Centralized API management
8. **Machine Learning**: AI-powered mapping suggestions

### Technology Roadmap

1. **Q1 2024**: Advanced validation and error reporting
2. **Q2 2024**: Visual mapping designer
3. **Q3 2024**: Real-time collaboration features
4. **Q4 2024**: Mobile application release
5. **2025**: AI-powered features and advanced analytics

## Conclusion

The EAI Schema Toolkit successfully captures and enhances the core functionality of the EAI Work Tool while providing a modern, scalable, and user-friendly implementation. The comprehensive schema mapping ensures compatibility with existing workflows while introducing powerful new features for enterprise application integration.

The modular architecture and extensive API support make it suitable for integration into larger enterprise systems, while the intuitive UI maintains the simplicity of the original tool. Ongoing development will continue to enhance the toolkit with advanced features and improved performance.