import express from "express";
import { SchemaValidationService } from "../services/SchemaValidationService";
import { logger } from "../utils/logger";

const router = express.Router();
const schemaValidationService = new SchemaValidationService();

// Get schema validation info (기본 경로)
router.get("/", async (req, res) => {
  try {
    const formats = schemaValidationService.getSupportedFormats();
    return res.json({
      success: true,
      data: {
        message: "Schema Validation Service",
        supportedFormats: formats,
        endpoints: {
          validate: "POST /validate",
          formats: "GET /formats",
          json: "POST /json",
          xml: "POST /xml",
          yaml: "POST /yaml"
        }
      }
    });
  } catch (error) {
    logger.error("Error retrieving schema validation info", { error });
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

// Validate schema endpoint
router.post("/validate", async (req, res) => {
  try {
    const { data, format, schema } = req.body;

    if (!data || !format) {
      return res.status(400).json({ 
        error: "Data and format are required" 
      });
    }

    // Validate that format is supported
    const supportedFormats = schemaValidationService.getSupportedFormats();
    if (!supportedFormats.includes(format.toLowerCase())) {
      return res.status(400).json({ 
        error: `Unsupported format: ${format}. Supported formats: ${supportedFormats.join(", ")}` 
      });
    }

    const result = schemaValidationService.validateSchema(data, format, schema);
    
    return res.json({
      valid: result.valid,
      errors: result.errors
    });
  } catch (error) {
    logger.error("Error validating schema", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get supported formats endpoint
router.get("/formats", async (req, res) => {
  try {
    const formats = schemaValidationService.getSupportedFormats();
    return res.json({ formats });
  } catch (error) {
    logger.error("Error retrieving supported formats", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Validate JSON schema endpoint
router.post("/json", async (req, res) => {
  try {
    const { data, schema } = req.body;

    if (!data || !schema) {
      return res.status(400).json({ 
        error: "Data and schema are required" 
      });
    }

    const result = schemaValidationService.validateJsonSchema(data, schema);
    
    return res.json({
      valid: result.valid,
      errors: result.errors
    });
  } catch (error) {
    logger.error("Error validating JSON schema", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Validate XML schema endpoint
router.post("/xml", async (req, res) => {
  try {
    const { xml, xsd } = req.body;

    if (!xml || !xsd) {
      return res.status(400).json({ 
        error: "XML and XSD are required" 
      });
    }

    const result = schemaValidationService.validateXmlSchema(xml, xsd);
    
    return res.json({
      valid: result.valid,
      errors: result.errors
    });
  } catch (error) {
    logger.error("Error validating XML schema", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Validate YAML schema endpoint
router.post("/yaml", async (req, res) => {
  try {
    const { yaml, schema } = req.body;

    if (!yaml) {
      return res.status(400).json({ 
        error: "YAML is required" 
      });
    }

    const result = schemaValidationService.validateYamlSchema(yaml, schema);
    
    return res.json({
      valid: result.valid,
      errors: result.errors
    });
  } catch (error) {
    logger.error("Error validating YAML schema", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;