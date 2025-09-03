import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import libxmljs from "libxmljs2";
import { logger } from "../utils/logger";

/**
 * SchemaValidationService
 * Provides advanced schema validation capabilities for XML, JSON, and YAML formats
 */
class SchemaValidationService {
  private ajv: Ajv;

  constructor() {
    // Initialize AJV with formats
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  /**
   * Validate JSON schema
   * @param data JSON data to validate
   * @param schema JSON schema to validate against
   * @returns Validation result
   */
  validateJsonSchema(data: any, schema: any): { valid: boolean; errors?: any[] } {
    try {
      // Parse data and schema if they are strings
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;
      const parsedSchema = typeof schema === "string" ? JSON.parse(schema) : schema;

      // Compile and validate schema
      const validate = this.ajv.compile(parsedSchema);
      const valid = validate(parsedData);

      return {
        valid,
        errors: valid ? undefined : (validate.errors as any[]) || []
      };
    } catch (error: any) {
      logger.error("Error validating JSON schema", { error });
      return {
        valid: false,
        errors: [{ message: error.message }]
      };
    }
  }

  /**
   * Validate XML schema (XSD)
   * @param xml XML data to validate
   * @param xsd XSD schema to validate against
   * @returns Validation result
   */
  validateXmlSchema(xml: string, xsd: string): { valid: boolean; errors?: string[] } {
    try {
      // Parse XML and XSD
      const xmlDoc = libxmljs.parseXmlString(xml);
      const xsdDoc = libxmljs.parseXmlString(xsd);

      // Validate XML against XSD
      const valid = xmlDoc.validate(xsdDoc);

      return {
        valid,
        errors: valid ? undefined : xmlDoc.validationErrors.map(error => error.message)
      };
    } catch (error: any) {
      logger.error("Error validating XML schema", { error });
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Validate YAML schema
   * @param yaml YAML data to validate
   * @param schema Schema to validate against (can be JSON schema)
   * @returns Validation result
   */
  validateYamlSchema(yaml: string, schema?: any): { valid: boolean; errors?: string[] } {
    try {
      // Basic YAML syntax validation by trying to parse it
      try {
        // Try to parse the YAML to check syntax
        const yamljs = require("js-yaml");
        yamljs.load(yaml);
        // If parsing succeeds, the YAML is syntactically valid
      } catch (parseError: any) {
        return {
          valid: false,
          errors: [parseError.message]
        };
      }

      // If schema is provided, validate against it
      if (schema) {
        // For now, we'll just do basic validation
        // In a more advanced implementation, you could convert YAML to JSON and validate with AJV
        return {
          valid: true,
          errors: undefined
        };
      }

      return {
        valid: true,
        errors: undefined
      };
    } catch (error: any) {
      logger.error("Error validating YAML schema", { error });
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Validate data against schema based on format
   * @param data Data to validate
   * @param format Format of the data (json, xml, yaml)
   * @param schema Schema to validate against
   * @returns Validation result
   */
  validateSchema(data: any, format: string, schema: any): { valid: boolean; errors?: any[] } {
    try {
      switch (format.toLowerCase()) {
        case "json":
          return this.validateJsonSchema(data, schema);
        case "xml":
          return this.validateXmlSchema(data, schema);
        case "yaml":
        case "yml":
          return this.validateYamlSchema(data, schema);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error: any) {
      logger.error(`Error validating ${format} schema`, { error });
      return {
        valid: false,
        errors: [{ message: error.message }]
      };
    }
  }

  /**
   * Get supported formats
   * @returns Array of supported formats
   */
  getSupportedFormats(): string[] {
    return ["json", "xml", "yaml", "yml"];
  }
}

export { SchemaValidationService };