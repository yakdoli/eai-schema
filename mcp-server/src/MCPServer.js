const express = require("express");
const fs = require("fs");
const path = require("path");

class MCPServer {
  constructor(port = 3002) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS for development
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get("/", (req, res) => {
      res.json({
        name: "EAI Schema Toolkit MCP Server",
        version: "1.0.0",
        description: "Model Context Provider for EAI Schema Toolkit development assistance",
        status: "running"
      });
    });

    // MCP context endpoint
    this.app.get("/mcp", (req, res) => {
      this.provideContext(req, res);
    });

    // MCP context endpoint (POST as well for compatibility)
    this.app.post("/mcp", (req, res) => {
      this.provideContext(req, res);
    });

    // Fallback for all other routes
    this.app.all("*", (req, res) => {
      res.status(404).json({
        error: "Route not found",
        message: "Available endpoint: GET/POST /mcp for context provision"
      });
    });
  }

  provideContext(req, res) {
    try {
      // Read project information
      const packageJsonPath = path.join(__dirname, "..", "..", "package.json");
      const readmePath = path.join(__dirname, "..", "..", "README.md");
      const qwenPath = path.join(__dirname, "..", "..", "QWEN.md");
      
      let packageJson = {};
      let readme = "";
      let qwen = "";
      
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      }
      
      if (fs.existsSync(readmePath)) {
        readme = fs.readFileSync(readmePath, "utf8");
      }
      
      if (fs.existsSync(qwenPath)) {
        qwen = fs.readFileSync(qwenPath, "utf8");
      }

      // Provide comprehensive context
      const context = {
        name: "EAI Schema Toolkit",
        version: packageJson.version || "1.0.0",
        description: packageJson.description || "EAI Schema Toolkit - Enterprise Application Integration Schema Conversion and Validation Tool",
        documentation: {
          overview: readme ? readme.substring(0, Math.min(1000, readme.length)) + (readme.length > 1000 ? "..." : "") : "README.md not found",
          technical: qwen ? qwen.substring(0, Math.min(2000, qwen.length)) + (qwen.length > 2000 ? "..." : "") : "QWEN.md not found"
        },
        architecture: {
          backend: "Node.js/Express server with TypeScript",
          frontend: "Vanilla JavaScript with GitHub Pages hosting",
          api: "RESTful API with JSON endpoints",
          features: [
            "Multi-format schema support (XML, JSON, YAML)",
            "File upload via drag-and-drop",
            "URL-based schema import",
            "Real-time validation and conversion",
            "Message mapping generation",
            "Real-time collaboration",
            "Performance monitoring"
          ]
        },
        directories: {
          src: "Backend source code (services, routes, middleware)",
          docs: "Frontend web interface (HTML, CSS, JS)",
          dist: "Compiled output",
          temp: "Temporary file storage"
        },
        api_endpoints: {
          health: "GET /api/health - Health check endpoint",
          file_upload: "POST /api/upload/file - File upload endpoint",
          url_import: "POST /api/upload/url - URL import endpoint",
          message_mapping: "POST /api/message-mapping/generate - Message mapping generation",
          collaboration: "WebSocket /socket.io/ - Real-time collaboration",
          performance: "GET /api/performance/metrics - Performance metrics"
        },
        services: {
          fileUploadService: "Handles file validation, storage, and retrieval",
          messageMappingService: "Generates mapping rules between schema formats",
          collaborationService: "Manages real-time collaboration between users",
          performanceMonitoringService: "Collects and exposes Prometheus metrics"
        },
        deployment: {
          frontend: "GitHub Pages via GitHub Actions",
          backend: "Heroku, Vercel, Railway, or Render"
        }
      };

      res.json(context);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to provide context",
        message: error.message || "Unknown error"
      });
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`EAI Schema Toolkit MCP Server running on port ${this.port}`);
      console.log(`MCP endpoint available at http://localhost:${this.port}/mcp`);
    });
  }
}

module.exports = MCPServer;