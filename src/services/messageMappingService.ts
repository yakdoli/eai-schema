import { logger } from "../utils/logger";

interface MessageMapping {
  id: string;
  source: string;
  target: string;
  mappings: Record<string, any>;
  configuration: Configuration;
}

interface Configuration {
  messageType: string;
  dataType: string;
  statement: string;
  testData: any;
}

class MessageMappingService {
  private mappings: Map<string, MessageMapping> = new Map();

  constructor(private logger: any = logger) {}

  generateMapping(config: Configuration, source: string): MessageMapping {
    const id = this.generateId();
    const mapping: MessageMapping = {
      id,
      source,
      target: this.transformSource(source, config),
      mappings: this.createMappings(config),
      configuration: config,
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
    // Simple transformation based on message type
    switch (config.messageType) {
      case "XML":
        return this.transformXml(source, config);
      case "JSON":
        return this.transformJson(source, config);
      default:
        return source;
    }
  }

  private transformXml(source: string, config: Configuration): string {
    // Placeholder for XML transformation
    return `<transformed>${source}</transformed>`;
  }

  private transformJson(source: string, config: Configuration): string {
    // Placeholder for JSON transformation
    try {
      const parsed = JSON.parse(source);
      return JSON.stringify({ transformed: parsed, config }, null, 2);
    } catch {
      return source;
    }
  }

  private createMappings(config: Configuration): Record<string, any> {
    // Create mappings based on configuration
    return {
      messageType: config.messageType,
      dataType: config.dataType,
      statement: config.statement,
      testData: config.testData,
    };
  }
}

export { MessageMappingService, MessageMapping, Configuration };
