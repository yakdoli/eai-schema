/// <reference types="jest" />
import { MCPIntegrationService } from "../../mcp/MCPIntegrationService";
import { MessageMappingService } from "../../services/messageMappingService";

// Mock dependencies
jest.mock("../../utils/logger");
jest.mock("../../services/messageMappingService");

const MockedMessageMappingService = MessageMappingService as jest.MockedClass<typeof MessageMappingService>;

describe("MCPIntegrationService", () => {
  let mcpService: MCPIntegrationService;
  let mockMessageMappingService: jest.Mocked<MessageMappingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageMappingService = new MockedMessageMappingService() as jest.Mocked<MessageMappingService>;
    mcpService = new MCPIntegrationService(mockMessageMappingService);
  });

  describe("processRequest", () => {
    it("generateMapping 액션을 처리해야 함", async () => {
      const mockMapping = {
        id: "test-id",
        source: "test source",
        target: "test target",
        mappings: {},
        configuration: {},
        metadata: {}
      };

      mockMessageMappingService.generateMapping.mockReturnValue(mockMapping);

      const request = {
        action: "generateMapping",
        data: {
          configuration: { messageType: "XML" },
          source: "<?xml version=\"1.0\"?><root></root>"
        }
      };

      const result = await mcpService.processRequest(request);

      expect(result).toEqual(mockMapping);
      expect(mockMessageMappingService.generateMapping).toHaveBeenCalledWith(
        request.data.configuration,
        request.data.source
      );
    });

    it("validateSchema 액션을 처리해야 함", async () => {
      mockMessageMappingService.validateSchema.mockReturnValue(true);

      const request = {
        action: "validateSchema",
        data: {
          content: "<root></root>",
          schemaType: "xml",
          schemaContent: "<xs:schema></xs:schema>"
        }
      };

      const result = await mcpService.processRequest(request);

      expect(result).toEqual({ valid: true });
      expect(mockMessageMappingService.validateSchema).toHaveBeenCalledWith(
        request.data.content,
        request.data.schemaType,
        request.data.schemaContent
      );
    });

    it("transformData 액션을 처리해야 함", async () => {
      const request = {
        action: "transformData",
        data: {
          source: "test data",
          targetType: "json"
        }
      };

      const result = await mcpService.processRequest(request);

      expect(result).toMatchObject({
        source: "test data",
        targetType: "json",
        transformed: "test data",
        timestamp: expect.any(String)
      });
    });

    it("지원되지 않는 액션에 대해 에러를 발생시켜야 함", async () => {
      const request = {
        action: "unsupportedAction",
        data: {}
      };

      await expect(mcpService.processRequest(request)).rejects.toThrow("Unsupported action: unsupportedAction");
    });

    it("generateMapping에서 필수 데이터가 없을 때 에러를 발생시켜야 함", async () => {
      const request = {
        action: "generateMapping",
        data: {
          configuration: null,
          source: "test"
        }
      };

      await expect(mcpService.processRequest(request)).rejects.toThrow("Configuration and source are required");
    });

    it("validateSchema에서 필수 데이터가 없을 때 에러를 발생시켜야 함", async () => {
      const request = {
        action: "validateSchema",
        data: {
          content: "test",
          schemaType: null,
          schemaContent: "schema"
        }
      };

      await expect(mcpService.processRequest(request)).rejects.toThrow("Content, schemaType, and schemaContent are required");
    });

    it("transformData에서 필수 데이터가 없을 때 에러를 발생시켜야 함", async () => {
      const request = {
        action: "transformData",
        data: {
          source: null,
          targetType: "json"
        }
      };

      await expect(mcpService.processRequest(request)).rejects.toThrow("Source and targetType are required");
    });
  });

  describe("getProviderInfo", () => {
    it("프로바이더 정보를 반환해야 함", () => {
      const providerInfo = mcpService.getProviderInfo();

      expect(providerInfo).toMatchObject({
        name: "EAI Schema Toolkit MCP Provider",
        version: "1.0.0",
        capabilities: [
          "schema-mapping",
          "schema-validation",
          "data-transformation"
        ],
        supportedFormats: ["XML", "JSON", "YAML"],
        timestamp: expect.any(String)
      });
    });

    it("타임스탬프가 유효한 ISO 형식이어야 함", () => {
      const providerInfo = mcpService.getProviderInfo();
      const timestamp = new Date(providerInfo.timestamp);
      
      expect(timestamp.toISOString()).toBe(providerInfo.timestamp);
    });
  });

  describe("Error Handling", () => {
    it("서비스 에러를 적절히 전파해야 함", async () => {
      mockMessageMappingService.generateMapping.mockImplementation(() => {
        throw new Error("Service error");
      });

      const request = {
        action: "generateMapping",
        data: {
          configuration: { messageType: "XML" },
          source: "test"
        }
      };

      await expect(mcpService.processRequest(request)).rejects.toThrow("Service error");
    });

    it("잘못된 요청 형식을 처리해야 함", async () => {
      const invalidRequests = [
        null,
        undefined,
        {},
        { action: null },
        { data: null }
      ];

      for (const request of invalidRequests) {
        await expect(mcpService.processRequest(request)).rejects.toThrow();
      }
    });
  });

  describe("Integration Tests", () => {
    it("전체 매핑 생성 워크플로우를 처리해야 함", async () => {
      const mockMapping = {
        id: "integration-test",
        source: '{"test": "data"}',
        target: "<?xml version=\"1.0\"?><root><test>data</test></root>",
        mappings: { test: "data" },
        configuration: { messageType: "XML", dataType: "JSON" },
        metadata: {
          createdAt: new Date(),
          nodeCount: 3,
          xmlSize: 100,
          processingTime: 50,
          validationStatus: true
        }
      };

      mockMessageMappingService.generateMapping.mockReturnValue(mockMapping);

      const request = {
        action: "generateMapping",
        data: {
          configuration: {
            messageType: "XML",
            dataType: "JSON",
            rootElement: "root",
            namespace: "",
            encoding: "UTF-8",
            version: "1.0",
            statement: "",
            testData: null
          },
          source: '{"test": "data"}'
        }
      };

      const result = await mcpService.processRequest(request);

      expect(result).toEqual(mockMapping);
      expect(mockMessageMappingService.generateMapping).toHaveBeenCalledWith(
        request.data.configuration,
        request.data.source
      );
    });

    it("스키마 검증 워크플로우를 처리해야 함", async () => {
      mockMessageMappingService.validateSchema.mockReturnValue(true);

      const request = {
        action: "validateSchema",
        data: {
          content: "<?xml version=\"1.0\"?><root><item>test</item></root>",
          schemaType: "xsd",
          schemaContent: "<?xml version=\"1.0\"?><xs:schema>...</xs:schema>"
        }
      };

      const result = await mcpService.processRequest(request);

      expect(result.valid).toBe(true);
      expect(mockMessageMappingService.validateSchema).toHaveBeenCalledWith(
        request.data.content,
        request.data.schemaType,
        request.data.schemaContent
      );
    });
  });
});