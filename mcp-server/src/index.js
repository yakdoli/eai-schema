const MCPServer = require("./MCPServer");

// Create and start the MCP server
const port = parseInt(process.env.MCP_PORT || "3002", 10);
const mcpServer = new MCPServer(port);
mcpServer.start();