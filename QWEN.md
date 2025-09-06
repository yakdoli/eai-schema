# EAI Schema Toolkit - Project Context for Qwen Code

## Project Overview

The **EAI Schema Toolkit** is a comprehensive Enterprise Application Integration tool designed for schema conversion and validation. It supports multiple schema formats including XML, JSON, and YAML, and provides both a RESTful API and a web interface.

### Key Features
- Multi-schema format support (XML, JSON, YAML)
- File upload via drag-and-drop or URL import
- Real-time schema validation and conversion
- RESTful API with comprehensive endpoints
- Web interface hosted on GitHub Pages
- Real-time collaboration capabilities
- Performance monitoring with Prometheus/Grafana integration
- MCP (Model-View-Controller-Provider) pattern integration

### Technology Stack
- **Language**: TypeScript
- **Runtime**: Node.js v22
- **Package Manager**: npm
- **Framework**: Express.js
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **Code Quality**: ESLint, Prettier
- **CI/CD**: GitHub Actions
- **Documentation**: GitHub Pages

## Project Structure

```
eai-schema/
├── .github/workflows/     # GitHub Actions CI/CD workflows
├── docs/                  # Documentation and web interface
├── src/                   # Source code
│   ├── __tests__/         # Test files (unit, integration, E2E)
│   ├── components/        # Reusable components
│   ├── core/              # Core functionality (config, logging, etc.)
│   ├── mcp/               # MCP integration
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── app.ts             # Main application setup
│   └── index.ts           # Entry point
├── dist/                  # Compiled output
├── scripts/               # Utility scripts
└── temp/                  # Temporary files
```

## Development Environment

### Prerequisites
- Node.js v22+
- npm v10+

### Setup
```bash
# Clone repository
git clone https://github.com/yakdoli/eai-schema.git
cd eai-schema

# Install dependencies
npm install
```

## Building and Running

### Development
```bash
# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run with coverage
npm run test:coverage
```

### Code Quality
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Check code formatting
npm run format:check

# Format code
npm run format

# Type checking
npm run type-check
```

## API Endpoints

### File Upload
- `POST /api/upload/file` - Upload file
- `POST /api/upload/url` - Import from URL
- `GET /api/upload/file/{fileId}` - Get file info
- `GET /api/upload/file/{fileId}/content` - Download file
- `DELETE /api/upload/file/{fileId}` - Delete file
- `GET /api/upload/files` - List uploaded files

### Message Mapping
- `POST /api/message-mapping/generate` - Generate message mapping

### Collaboration
- WebSocket connection for real-time collaboration

### Performance Monitoring
- `GET /api/performance/metrics` - Get performance metrics

## Configuration

Environment variables can be set in a `.env` file:
```env
PORT=3001
FRONTEND_URL=https://[username].github.io
LOG_LEVEL=info
UPLOAD_PATH=./temp
FILE_EXPIRY_HOURS=24
```

## Deployment

### GitHub Pages
The web interface is automatically deployed to GitHub Pages via GitHub Actions.

### Backend API
The backend API can be deployed to:
- Heroku: `git push heroku main`
- Vercel: `vercel --prod`
- Railway: `railway up`
- Render: GitHub integration for automatic deployment

## Development Conventions

### Code Style
- TypeScript with strict typing
- ESLint for code quality
- Prettier for code formatting
- Conventional Commits for commit messages

### Testing
- Unit tests for services and components
- Integration tests for API endpoints
- E2E tests for user workflows
- Performance tests for critical paths
- Minimum 80% code coverage

### Architecture
- MVC-like pattern with services layer
- MCP (Model-View-Controller-Provider) integration
- Modular design with clear separation of concerns
- Real-time features via WebSocket

### Security
- CORS protection
- Rate limiting
- File type validation
- SSRF prevention
- XXE prevention
- Helmet.js for security headers

## CI/CD Pipeline

GitHub Actions workflow includes:
1. Code quality checks (TypeScript, ESLint, Prettier)
2. Security scanning (npm audit, Snyk, CodeQL)
3. Unit tests (Node.js 20 and 22)
4. Integration tests
5. E2E tests with Playwright
6. Performance tests
7. Build verification
8. Test result summary

## Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

Follow TypeScript best practices, maintain test coverage, and use Conventional Commits.