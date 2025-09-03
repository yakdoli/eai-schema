import express from "express";
import {
  MessageMappingService,
  Configuration,
} from "../services/messageMappingService";
import { logger } from "../utils/logger";

const router = express.Router();
const messageMappingService = new MessageMappingService(logger);

// Generate message mapping
router.post("/generate", async (req, res) => {
  try {
    const {
      configuration,
      source,
    }: { configuration: Configuration; source: string } = req.body;

    if (!configuration || !source) {
      return res
        .status(400)
        .json({ error: "Configuration and source are required" });
    }

    const mapping = messageMappingService.generateMapping(
      configuration,
      source,
    );
    res.status(201).json(mapping);
  } catch (error) {
    logger.error("Error generating message mapping", { error });
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

// Get message mapping by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = messageMappingService.getMapping(id);

    if (!mapping) {
      return res.status(404).json({ error: "Message mapping not found" });
    }

    res.json(mapping);
  } catch (error) {
    logger.error("Error retrieving message mapping", { error });
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

// Clear message mapping by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = messageMappingService.clearMapping(id);

    if (!deleted) {
      return res.status(404).json({ error: "Message mapping not found" });
    }

    res.json({ message: "Message mapping cleared successfully" });
  } catch (error) {
    logger.error("Error clearing message mapping", { error });
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

// Get all message mappings
router.get("/", async (req, res) => {
  try {
    const mappings = messageMappingService.getAllMappings();
    res.json(mappings);
  } catch (error) {
    logger.error("Error retrieving message mappings", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
