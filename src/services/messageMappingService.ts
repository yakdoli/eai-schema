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

class MessageMappingService {
  private mappings: Map<string, MessageMapping> = new Map();

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
        xmlContent += `  <error type="invalid-json">Invalid JSON format</error>\n`;
        xmlContent += `  <source><![CDATA[${source}]]></source>\n`;
        xmlContent += `  <transformed>true</transformed>\n`;
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

  private generateMappingRules(config: Configuration): any[] {
    const rules = [];

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
      });
    }

    if (config.dataType) {
      rules.push({
        type: "dataType",
        name: config.dataType,
        transformation: "direct",
      });
    }

    if (config.statement) {
      rules.push({
        type: "statement",
        content: config.statement,
        processing: "execute",
      });
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
        case "XML":
          // Basic XML validation
          const hasXmlDeclaration = content.includes("<?xml");
          const hasRootElement = content.includes(
            `<${config.rootElement || "root"}`,
          );
          const hasClosingTag = content.includes(
            `</${config.rootElement || "root"}>`,
          );
          return hasXmlDeclaration && hasRootElement && hasClosingTag;
        case "JSON":
          JSON.parse(content);
          return true;
        case "YAML":
          // Basic YAML validation
          return content.includes("---") || content.trim().length > 0;
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
        xml += `${indentStr}</item>\n`;
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

export { MessageMappingService, MessageMapping, Configuration };
