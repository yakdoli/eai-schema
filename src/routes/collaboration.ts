import express from "express";
import { CollaborationService } from "../services/CollaborationService";
import { MessageMappingService } from "../services/messageMappingService";
import { logger } from "../utils/logger";

const router = express.Router();

// Initialize services
const messageMappingService = new MessageMappingService(logger);
const collaborationService = new CollaborationService(messageMappingService);

// Get collaboration history for a mapping
router.get("/:mappingId/history", async (req, res) => {
  try {
    const { mappingId } = req.params;
    
    if (!mappingId) {
      return res.status(400).json({ error: "Mapping ID is required" });
    }
    
    const history = collaborationService.getCollaborationHistory(mappingId);
    res.json(history);
  } catch (error) {
    logger.error("Error retrieving collaboration history", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get users in a mapping session
router.get("/:mappingId/users", async (req, res) => {
  try {
    const { mappingId } = req.params;
    
    if (!mappingId) {
      return res.status(400).json({ error: "Mapping ID is required" });
    }
    
    const users = collaborationService.getMappingUsers(mappingId);
    res.json(users);
  } catch (error) {
    logger.error("Error retrieving mapping users", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;