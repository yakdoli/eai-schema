# EAI Schema Toolkit - Project Context

## Project Overview

The EAI Schema Toolkit is an enterprise application integration tool for schema conversion and validation. It provides both a web interface (hosted on GitHub Pages) and a backend API server for processing various schema formats including XML, JSON, and YAML.

## Key Features

- Multi-format schema support (XML, JSON, YAML)
- File upload via drag-and-drop or file selection
- URL-based schema import
- Real-time validation and conversion
- RESTful API interface
- Web interface with GitHub Pages hosting
- Message mapping functionality for EAI Work Tool integration
- Real-time collaboration capabilities
- Performance monitoring with Prometheus metrics

## Project Structure

```
eai-schema/
├── src/                    # Backend source code
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Middleware functions
│   ├── utils/             # Utility functions
│   └── __tests__/         # Unit tests
├── docs/                  # GitHub Pages web interface
│   ├── index.html        # Main web page
│   ├── style.css         # Stylesheet
│   ├── script.js         # Client JavaScript
│   └── README.md         # Web interface documentation
├── dist/                 # Build output
├── temp/                 # Temporary file storage
├── .github/workflows/    # GitHub Actions workflows
├── mcp-server/           # Model Context Provider server for AI agent assistance
└── package.json          # Node.js package configuration
```

## Backend Architecture

The backend is a Node.js/Express server that provides RESTful APIs for:
- File upload and management
- URL-based schema fetching
- Schema validation
- Message mapping generation
- Real-time collaboration
- Performance monitoring

### Core Components

1. **File Upload Service** (`src/services/fileUploadService.ts`)
   - Handles file validation, storage, and retrieval
   - Supports XML, JSON, YAML formats with security checks
   - Implements file expiration and cleanup

2. **Message Mapping Service** (`src/services/messageMappingService.ts`)
   - Transforms schemas between different formats
   - Generates mapping rules based on EAI Work Tool structure
   - Creates metadata for transformations

3. **Collaboration Service** (`src/services/CollaborationService.ts`)
   - Manages real-time collaboration between multiple users
   - Handles WebSocket connections for live updates
   - Tracks user presence and activities

4. **Performance Monitoring Service** (`src/services/PerformanceMonitoringService.ts`)
   - Collects and exposes Prometheus metrics
   - Monitors HTTP requests, memory usage, CPU usage
   - Tracks garbage collection and active connections

5. **Schema Validation Service** (`src/services/SchemaValidationService.ts`)
   - Validates XML schemas against XSD
   - Validates JSON schemas against JSON Schema
   - Validates YAML schemas

6. **Routes** (`src/routes/`)
   - `/api/health` - Health check endpoint
   - `/api/upload/*` - File handling endpoints
   - `/api/message-mapping/*` - Schema conversion endpoints
   - `/api/collaboration/*` - Real-time collaboration endpoints
   - `/api/schema-validation/*` - Schema validation endpoints
   - `/api/performance/*` - Performance monitoring endpoints

## Web Interface

The web interface is a client-side application that provides:
- Tab-based navigation (File Upload, URL Import, Message Mapping)
- Drag-and-drop file upload zone
- File management (list, download, delete)
- Message mapping configuration
- Real-time collaboration features
- Dark mode support
- Responsive design

### Key Components

1. **Configuration Section** - Set message type, data type, root element, namespace, encoding, version
2. **Source Section** - Input source data for transformation
3. **Statement Section** - SQL queries or processing instructions
4. **Test Data Section** - Sample data for validation
5. **Message Mapping Section** - Generated mapping rules visualization
6. **Result Section** - Transformed output in XML, JSON, or preview formats
7. **Collaboration Section** - Real-time collaboration features

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Start production server:
   ```bash
   npm start
   ```

## Testing

- Unit tests: `npm test`
- Test coverage: `npm run test:coverage`
- E2E tests: `npm run test:e2e`
- Run all tests: `npm run test:all`

## Configuration

Environment variables can be set in a `.env` file:
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - CORS allowed origins
- `LOG_LEVEL` - Logging level
- `UPLOAD_PATH` - File storage path
- `FILE_EXPIRY_HOURS` - File expiration time

## Deployment

### GitHub Pages Deployment
The web interface is automatically deployed to GitHub Pages via GitHub Actions when pushing to the main branch.

### Backend API Deployment

#### Heroku Deployment
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login to Heroku: `heroku login`
3. Create a new app or use existing app:
   ```bash
   # Create new app
   heroku create your-app-name
   
   # Or use existing app
   heroku git:remote -a your-existing-app-name
   ```
4. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PORT=3001
   heroku config:set FRONTEND_URL=https://your-username.github.io/eai-schema/
   ```
5. Deploy: `git push heroku main`

#### Vercel Deployment
- `vercel --prod`

#### Railway Deployment
- `railway up`

#### Render Deployment
- GitHub integration for automatic deployment

## API Endpoints

### Health Check
```
GET /api/health
```

### File Upload
```
POST /api/upload/file
Content-Type: multipart/form-data
```

### URL Import
```
POST /api/upload/url
Content-Type: application/json
{
  "url": "https://example.com/schema.xml"
}
```

### File Information
```
GET /api/upload/file/{fileId}
```

### File Download
```
GET /api/upload/file/{fileId}/content
```

### File Deletion
```
DELETE /api/upload/file/{fileId}
```

### File List
```
GET /api/upload/files
```

### Message Mapping Generation
```
POST /api/message-mapping/generate
Content-Type: application/json
{
  "configuration": { ... },
  "source": "..."
}
```

### Real-time Collaboration
```
WebSocket connection to /socket.io/
Endpoints for collaboration management
```

### Schema Validation
```
POST /api/schema-validation/validate
POST /api/schema-validation/json
POST /api/schema-validation/xml
POST /api/schema-validation/yaml
```

### Performance Monitoring
```
GET /api/performance/metrics
GET /api/performance/health
```

## Development Guidelines

- Written in TypeScript with strict type checking
- Follows ESLint rules for code quality
- Uses Jest for unit testing
- Implements conventional commits for version control
- Includes comprehensive error handling and logging
- Follows microservices-ready architecture

## Supported Formats

### Input Formats
- XML (.xml)
- JSON (.json)
- YAML (.yaml, .yml)

### File Limitations
- Maximum file size: 50MB
- File retention period: 24 hours (default)

## Security Features

- CORS protection
- Rate limiting
- File type validation
- SSRF prevention for URL imports
- Helmet.js for security headers
- XXE attack prevention for XML files
- Input sanitization
- Secure WebSocket connections

## Performance Monitoring

The application includes built-in performance monitoring through Prometheus metrics:

- HTTP request duration and count
- Memory and CPU usage
- Garbage collection tracking
- Active connections monitoring
- Custom business metrics

Metrics are exposed at `/api/performance/metrics` and can be scraped by Prometheus for visualization in Grafana.

## Real-time Collaboration

WebSocket-based real-time collaboration features enable multiple users to work together:

- Live user presence tracking
- Real-time change synchronization
- Session management
- Conflict resolution

## AI Agent Assistance (Development Only)

During development, the EAI Schema Toolkit includes a Model Context Provider (MCP) server to assist AI coding agents:

### MCP Server
- Located in `mcp-server/` directory
- Provides project context to AI agents
- Helps agents understand codebase structure and APIs
- Not part of production deployment

### Starting the MCP Server
```bash
npm run mcp:install  # Install MCP server dependencies
npm run mcp:start     # Start MCP server on port 3002
```

Or use the convenience script:
```bash
./scripts/start-mcp-server.sh
```

### MCP Endpoint
- Available at `http://localhost:3002/mcp` during development
- Provides context about project structure, APIs, and services
- Intended for AI agent assistance only
- **NOT** used for deployment or production purposes

**Note**: The MCP integration is purely for development assistance and has no role in the deployment or production operation of the EAI Schema Toolkit.