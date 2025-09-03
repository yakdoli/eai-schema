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
└── package.json          # Node.js package configuration
```

## Backend Architecture

The backend is a Node.js/Express server that provides RESTful APIs for:
- File upload and management
- URL-based schema fetching
- Schema validation
- Message mapping generation

### Core Components

1. **File Upload Service** (`src/services/fileUploadService.ts`)
   - Handles file validation, storage, and retrieval
   - Supports XML, JSON, YAML formats with security checks
   - Implements file expiration and cleanup

2. **Message Mapping Service** (`src/services/messageMappingService.ts`)
   - Transforms schemas between different formats
   - Generates mapping rules based on EAI Work Tool structure
   - Creates metadata for transformations

3. **Routes** (`src/routes/`)
   - `/api/upload/*` - File handling endpoints
   - `/api/message-mapping/*` - Schema conversion endpoints
   - `/api/health` - Health check endpoint

## Web Interface

The web interface is a client-side application that provides:
- Tab-based navigation (File Upload, URL Import, Message Mapping)
- Drag-and-drop file upload zone
- File management (list, download, delete)
- Message mapping configuration
- Dark mode support
- Responsive design

### Key Components

1. **Configuration Section** - Set message type, data type, root element, namespace, encoding, version
2. **Source Section** - Input source data for transformation
3. **Statement Section** - SQL queries or processing instructions
4. **Test Data Section** - Sample data for validation
5. **Message Mapping Section** - Generated mapping rules visualization
6. **Result Section** - Transformed output in XML, JSON, or preview formats

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
The backend can be deployed to:
- Heroku: `git push heroku main`
- Vercel: `vercel --prod`
- Railway: `railway up`
- Render: GitHub integration for automatic deployment

## API Endpoints

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

## Development Guidelines

- Written in TypeScript with strict type checking
- Follows ESLint rules for code quality
- Uses Jest for unit testing
- Implements conventional commits for version control
- Includes comprehensive error handling and logging

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