import express from "express";
import {
  MessageMappingService,
  Configuration,
  AdvancedMappingRule,
  TransformationRule,
  CollaborationData
} from "../services/messageMappingService";
import { logger } from "../utils/logger";

const router = express.Router();
const messageMappingService = new MessageMappingService(logger);

// Get all message mappings (기본 경로)
router.get("/", async (req, res) => {
  try {
    const mappings = messageMappingService.getAllMappings();
    return res.json({
      success: true,
      data: mappings
    });
  } catch (error) {
    logger.error("Error retrieving message mappings", { error });
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

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
    return res.status(201).json(mapping);
  } catch (error) {
    logger.error("Error generating message mapping", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get message mapping by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = messageMappingService.getMapping(id);

    if (!mapping) {
      return res.status(404).json({ error: "Message mapping not found" });
    }

    return res.json(mapping);
  } catch (error) {
    logger.error("Error retrieving message mapping", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Clear message mapping by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = messageMappingService.clearMapping(id);

    if (!deleted) {
      return res.status(404).json({ error: "Message mapping not found" });
    }

    return res.json({ message: "Message mapping cleared successfully" });
  } catch (error) {
    logger.error("Error clearing message mapping", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all message mappings (중복 제거됨)

// Advanced mapping routes
// Create advanced mapping rules
router.post("/:id/rules", async (req, res) => {
  try {
    const { id } = req.params;
    const { rules }: { rules: AdvancedMappingRule[] } = req.body;

    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({ error: "Rules array is required" });
    }

    messageMappingService.createAdvancedMappingRules(id, rules);
    return res.status(201).json({ message: "Advanced mapping rules created successfully" });
  } catch (error) {
    logger.error("Error creating advanced mapping rules", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get advanced mapping rules
router.get("/:id/rules", async (req, res) => {
  try {
    const { id } = req.params;
    const rules = messageMappingService.getAdvancedMappingRules(id);
    return res.json(rules);
  } catch (error) {
    logger.error("Error retrieving advanced mapping rules", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create transformation rule
router.post("/:id/transformations", async (req, res) => {
  try {
    const { id } = req.params;
    const rule: TransformationRule = req.body;

    if (!rule) {
      return res.status(400).json({ error: "Transformation rule is required" });
    }

    messageMappingService.createTransformationRule(id, rule);
    return res.status(201).json({ message: "Transformation rule created successfully" });
  } catch (error) {
    logger.error("Error creating transformation rule", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get transformation rules
router.get("/:id/transformations", async (req, res) => {
  try {
    const { id } = req.params;
    const rules = messageMappingService.getTransformationRules(id);
    return res.json(rules);
  } catch (error) {
    logger.error("Error retrieving transformation rules", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Collaboration routes
// Add collaboration event
router.post("/:id/collaboration", async (req, res) => {
  try {
    const { id } = req.params;
    const event: CollaborationData = req.body;

    if (!event) {
      return res.status(400).json({ error: "Collaboration event is required" });
    }

    messageMappingService.addCollaborationEvent(id, event);
    return res.status(201).json({ message: "Collaboration event added successfully" });
  } catch (error) {
    logger.error("Error adding collaboration event", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get collaboration history
router.get("/:id/collaboration", async (req, res) => {
  try {
    const { id } = req.params;
    const history = messageMappingService.getCollaborationHistory(id);
    return res.json(history);
  } catch (error) {
    logger.error("Error retrieving collaboration history", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Schema validation route
router.post("/validate-schema", async (req, res) => {
  try {
    const { content, schemaType, schemaContent } = req.body;

    if (!content || !schemaType || !schemaContent) {
      return res.status(400).json({ error: "Content, schemaType, and schemaContent are required" });
    }

    const isValid = messageMappingService.validateSchema(content, schemaType, schemaContent);
    return res.json({ valid: isValid });
  } catch (error) {
    logger.error("Error validating schema", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;