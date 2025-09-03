import express from "express";
import { MCPIntegrationService } from "./MCPIntegrationService";
import { MessageMappingService } from "../services/messageMappingService";
import { logger } from "../utils/logger";

const router = express.Router();

// Initialize services
const messageMappingService = new MessageMappingService(logger);
const mcpService = new MCPIntegrationService(messageMappingService);

// MCP Provider Info endpoint
router.get("/provider", async (req, res) => {
  try {
    const providerInfo = mcpService.getProviderInfo();
    return res.json(providerInfo);
  } catch (error) {
    logger.error("Error retrieving MCP provider info", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// MCP Process Request endpoint
router.post("/process", async (req, res) => {
  try {
    const request = req.body;
    
    if (!request) {
      return res.status(400).json({ error: "Request body is required" });
    }
    
    const result = await mcpService.processRequest(request);
    return res.json(result);
  } catch (error) {
    logger.error("Error processing MCP request", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    return res.json({ status: "OK", timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error("Error in MCP health check", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;