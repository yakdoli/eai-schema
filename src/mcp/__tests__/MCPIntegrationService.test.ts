import { MCPIntegrationService } from "../MCPIntegrationService";
import { MessageMappingService } from "../../services/messageMappingService";
import { logger } from "../../utils/logger";

// Mock logger for testing
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe("MCPIntegrationService", () => {
  let mcpService: MCPIntegrationService;
  let messageMappingService: MessageMappingService;

  beforeEach(() => {
    messageMappingService = new MessageMappingService(mockLogger as any);
    mcpService = new MCPIntegrationService(messageMappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProviderInfo", () => {
    it("should return provider information", () => {
      const providerInfo = mcpService.getProviderInfo();
      
      expect(providerInfo).toHaveProperty("name");
      expect(providerInfo).toHaveProperty("version");
      expect(providerInfo).toHaveProperty("capabilities");
      expect(providerInfo).toHaveProperty("supportedFormats");
      expect(providerInfo).toHaveProperty("timestamp");
      
      expect(providerInfo.name).toBe("EAI Schema Toolkit MCP Provider");
      expect(providerInfo.capabilities).toContain("schema-mapping");
      expect(providerInfo.supportedFormats).toContain("XML");
    });
  });

  describe("processRequest", () => {
    it("should process generateMapping request", async () => {
      const request = {
        action: "generateMapping",
        data: {
          configuration: {
            messageType: "XML",
            dataType: "json",
            rootElement: "root"
          },
          source: "{\"test\": \"data\"}"
        }
      };
      
      const result = await mcpService.processRequest(request);
      
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("source");
      expect(result).toHaveProperty("target");
      expect(result).toHaveProperty("mappings");
      expect(result).toHaveProperty("configuration");
      expect(result).toHaveProperty("metadata");
    });
    
    it("should process validateSchema request", async () => {
      const request = {
        action: "validateSchema",
        data: {
          content: "<root>test</root>",
          schemaType: "xsd",
          schemaContent: "<schema>test</schema>"
        }
      };
      
      const result = await mcpService.processRequest(request);
      
      expect(result).toHaveProperty("valid");
      expect(typeof result.valid).toBe("boolean");
    });
    
    it("should process transformData request", async () => {
      const request = {
        action: "transformData",
        data: {
          source: "{\"test\": \"data\"}",
          targetType: "XML"
        }
      };
      
      const result = await mcpService.processRequest(request);
      
      expect(result).toHaveProperty("source");
      expect(result).toHaveProperty("targetType");
      expect(result).toHaveProperty("transformed");
      expect(result).toHaveProperty("timestamp");
    });
    
    it("should throw error for unsupported action", async () => {
      const request = {
        action: "unsupportedAction",
        data: {}
      };
      
      await expect(mcpService.processRequest(request)).rejects.toThrow("Unsupported action: unsupportedAction");
    });
  });
});