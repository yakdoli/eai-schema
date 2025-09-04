import { logger } from "../utils/logger";

interface MessageMapping {
  id: string;
  source: string;
  target: string;
  mappings: Record<string, any>;
  configuration: Configuration;
  metadata: MappingMetadata;
}

interface Configuration {
  messageType: string;
  dataType: string;
  rootElement: string;
  namespace: string;
  encoding: string;
  version: string;
  statement: string;
  testData: any;
}

interface MappingMetadata {
  createdAt: Date;
  nodeCount: number;
  xmlSize: number;
  processingTime: number;
  validationStatus: boolean;
}

// Enhanced interfaces for advanced features
interface AdvancedMappingRule {
  id: string;
  type: "element" | "attribute" | "dataType" | "statement" | "transformation" | "condition";
  sourcePath: string;
  targetPath: string;
  transformation?: string;
  condition?: string;
  defaultValue?: string;
  required?: boolean;
  validation?: ValidationRule;
}

interface ValidationRule {
  type: "regex" | "range" | "enum" | "custom";
  pattern?: string;
  min?: number;
  max?: number;
  values?: string[];
  function?: string;
}

interface TransformationRule {
  id: string;
  name: string;
  description: string;
  function: string;
  parameters: Record<string, any>;
}

interface CollaborationData {
  userId: string;
  username: string;
  timestamp: Date;
  action: "create" | "update" | "delete";
  target: string;
  details: any;
}

// Interface for mapping rules
interface MappingRule {
  type: string;
  name?: string;
  namespace?: string;
  attributes?: Record<string, string>;
  content?: string;
  transformation?: string;
  processing?: string;
}

class MessageMappingService {
  private mappings: Map<string, MessageMapping> = new Map();
  private mappingRules: Map<string, AdvancedMappingRule[]> = new Map();
  private transformationRules: Map<string, TransformationRule[]> = new Map();
  private collaborationHistory: Map<string, CollaborationData[]> = new Map();

  constructor(private logger: any = logger) {}

  generateMapping(config: Configuration, source: string): MessageMapping {
    const startTime = Date.now();
    const id = this.generateId();

    const target = this.transformSource(source, config);
    const mappings = this.createMappings(config);
    const processingTime = Date.now() - startTime;

    const metadata: MappingMetadata = {
      createdAt: new Date(),
      nodeCount: this.countNodes(target),
      xmlSize: target.length,
      processingTime,
      validationStatus: this.validateMapping(target, config),
    };

    const mapping: MessageMapping = {
      id,
      source,
      target,
      mappings,
      configuration: config,
      metadata,
    };

    this.mappings.set(id, mapping);
    this.logger.info(`Generated message mapping with ID: ${id}`);
    return mapping;
  }

  getMapping(id: string): MessageMapping | undefined {
    return this.mappings.get(id);
  }

  clearMapping(id: string): boolean {
    const deleted = this.mappings.delete(id);
    if (deleted) {
      this.logger.info(`Cleared message mapping with ID: ${id}`);
    }
    return deleted;
  }

  getAllMappings(): MessageMapping[] {
    return Array.from(this.mappings.values());
  }

  // Advanced mapping features
  createAdvancedMappingRules(mappingId: string, rules: AdvancedMappingRule[]): void {
    this.mappingRules.set(mappingId, rules);
    this.logger.info(`Created ${rules.length} advanced mapping rules for mapping ID: ${mappingId}`);
  }

  getAdvancedMappingRules(mappingId: string): AdvancedMappingRule[] {
    return this.mappingRules.get(mappingId) || [];
  }

  createTransformationRule(mappingId: string, rule: TransformationRule): void {
    if (!this.transformationRules.has(mappingId)) {
      this.transformationRules.set(mappingId, []);
    }
    this.transformationRules.get(mappingId)!.push(rule);
    this.logger.info(`Created transformation rule for mapping ID: ${mappingId}`);
  }

  getTransformationRules(mappingId: string): TransformationRule[] {
    return this.transformationRules.get(mappingId) || [];
  }

  // Collaboration features
  addCollaborationEvent(mappingId: string, event: CollaborationData): void {
    if (!this.collaborationHistory.has(mappingId)) {
      this.collaborationHistory.set(mappingId, []);
    }
    this.collaborationHistory.get(mappingId)!.push(event);
    this.logger.info(`Added collaboration event for mapping ID: ${mappingId}`);
  }

  getCollaborationHistory(mappingId: string): CollaborationData[] {
    return this.collaborationHistory.get(mappingId) || [];
  }

  // Schema validation features
  validateSchema(content: string, schemaType: string, schemaContent: string): boolean {
    try {
      switch (schemaType.toLowerCase()) {
      case "xsd":
        return this.validateXsdSchema(content, schemaContent);
      case "json":
        return this.validateJsonSchema(content, schemaContent);
      case "yaml":
        return this.validateYamlSchema(content, schemaContent);
      default:
        this.logger.warn(`Unsupported schema type: ${schemaType}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Schema validation error: ${error}`);
      return false;
    }
  }

  private validateXsdSchema(content: string, schemaContent: string): boolean {
    // Placeholder for XSD validation implementation
    // In a real implementation, you would use a library like libxmljs or similar
    this.logger.info("XSD validation performed (placeholder)");
    return true;
  }

  private validateJsonSchema(content: string, schemaContent: string): boolean {
    // Placeholder for JSON schema validation implementation
    // In a real implementation, you would use AJV or similar
    this.logger.info("JSON schema validation performed (placeholder)");
    return true;
  }

  private validateYamlSchema(content: string, schemaContent: string): boolean {
    // Placeholder for YAML schema validation implementation
    this.logger.info("YAML schema validation performed (placeholder)");
    return true;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private transformSource(source: string, config: Configuration): string {
    // Enhanced transformation based on message type and configuration
    switch (config.messageType) {
    case "XML":
      return this.transformXml(source, config);
    case "JSON":
      return this.transformJson(source, config);
    case "YAML":
      return this.transformYaml(source, config);
    default:
      return source;
    }
  }

  private transformXml(source: string, config: Configuration): string {
    const rootElement = config.rootElement || "root";
    const namespace = config.namespace ? ` xmlns="${config.namespace}"` : "";
    const version = config.version || "1.0";
    const encoding = config.encoding || "UTF-8";

    let xmlContent = `<?xml version="${version}" encoding="${encoding}"?>\n`;
    xmlContent += `<${rootElement}${namespace}>\n`;

    // Process source data based on type
    if (config.dataType && config.dataType.toUpperCase() === "JSON") {
      try {
        const jsonData = JSON.parse(source);
        xmlContent += this.jsonToXml(jsonData, 1);
      } catch (error) {
        // Handle invalid JSON gracefully
        xmlContent += "  <error type=\"invalid-json\">Invalid JSON format</error>\n";
        xmlContent += `  <source><![CDATA[${source}]]></source>\n`;
        xmlContent += "  <transformed>true</transformed>\n";
      }
    } else {
      xmlContent += `  <source><![CDATA[${source}]]></source>\n`;
    }

    // Add statement if provided
    if (config.statement) {
      xmlContent += `  <statement><![CDATA[${config.statement}]]></statement>\n`;
    }

    xmlContent += `</${rootElement}>`;
    return xmlContent;
  }

  private transformJson(source: string, config: Configuration): string {
    try {
      const parsed = JSON.parse(source);
      const result = {
        root: config.rootElement || "root",
        namespace: config.namespace || "",
        encoding: config.encoding || "UTF-8",
        version: config.version || "1.0",
        data: parsed,
        statement: config.statement || "",
        transformed: true,
      };
      return JSON.stringify(result, null, 2);
    } catch {
      return JSON.stringify(
        {
          error: "Invalid JSON source",
          source: source,
          config: config,
        },
        null,
        2,
      );
    }
  }

  private transformYaml(source: string, config: Configuration): string {
    // Placeholder for YAML transformation - would require js-yaml dependency
    return `---
root: "${config.rootElement || "root"}"
namespace: "${config.namespace || ""}"
encoding: "${config.encoding || "UTF-8"}"
version: "${config.version || "1.0"}"
data: ${source}
statement: "${config.statement || ""}"
transformed: true
`;
  }

  private createMappings(config: Configuration): Record<string, any> {
    // Enhanced mapping creation based on EAI Work Tool structure
    return {
      messageType: config.messageType,
      dataType: config.dataType,
      rootElement: config.rootElement,
      namespace: config.namespace,
      encoding: config.encoding,
      version: config.version,
      statement: config.statement,
      testData: config.testData,
      mappingRules: this.generateMappingRules(config),
    };
  }

  private generateMappingRules(config: Configuration): MappingRule[] {
    const rules: MappingRule[] = [];

    // Generate rules based on configuration
    if (config.messageType === "XML") {
      rules.push({
        type: "element",
        name: config.rootElement || "root",
        namespace: config.namespace,
        attributes: {
          version: config.version,
          encoding: config.encoding,
        },
      } as MappingRule);
    }

    if (config.dataType) {
      rules.push({
        type: "dataType",
        name: config.dataType,
        transformation: "direct",
      } as MappingRule);
    }

    if (config.statement) {
      rules.push({
        type: "statement",
        content: config.statement,
        processing: "execute",
      } as MappingRule);
    }

    return rules;
  }

  private countNodes(content: string): number {
    if (!content) return 0;

    // Count XML nodes
    const xmlMatches = content.match(/<[^>]+>/g);
    if (xmlMatches) return xmlMatches.length;

    // Count JSON objects/arrays
    try {
      const json = JSON.parse(content);
      return this.countJsonNodes(json);
    } catch {
      return 1; // Plain text
    }
  }

  private countJsonNodes(obj: any): number {
    if (Array.isArray(obj)) {
      return (
        1 + // Count the array itself
        obj.reduce(
          (sum: number, item: any) => sum + this.countJsonNodes(item),
          0,
        )
      );
    } else if (typeof obj === "object" && obj !== null) {
      return (
        1 + // Count the object itself
        Object.values(obj).reduce(
          (sum: number, value: any) => sum + this.countJsonNodes(value),
          0,
        )
      );
    }
    return 1; // Count primitive values
  }

  private validateMapping(content: string, config: Configuration): boolean {
    try {
      switch (config.messageType) {
      case "XML": {
        // Basic XML validation
        const hasXmlDeclaration = content.includes("<?xml");
        const hasRootElement = content.includes(
          `<${config.rootElement || "root"}`,
        );
        const hasClosingTag = content.includes(
          `</${config.rootElement || "root"}>`,
        );
        return hasXmlDeclaration && hasRootElement && hasClosingTag;
      }
      case "JSON": {
        JSON.parse(content);
        return true;
      }
      case "YAML": {
        // Basic YAML validation
        return content.includes("---") || content.trim().length > 0;
      }
      default:
        return false;
      }
    } catch {
      return false;
    }
  }

  private jsonToXml(obj: any, indent: number = 0): string {
    const indentStr = "  ".repeat(indent);
    let xml = "";

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        xml += `${indentStr}<item index="${index}">\n`;
        xml += this.jsonToXml(item, indent + 1);
        xml += `${indentStr}</item index="${index}">\n`;
      });
    } else if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        xml += `${indentStr}<${key}>\n`;
        xml += this.jsonToXml(obj[key], indent + 1);
        xml += `${indentStr}</${key}>\n`;
      });
    } else {
      xml += `${indentStr}${String(obj)}\n`;
    }

    return xml;
  }
}

export { 
  MessageMappingService, 
  MessageMapping, 
  Configuration, 
  AdvancedMappingRule, 
  TransformationRule, 
  CollaborationData,
  MappingRule
};