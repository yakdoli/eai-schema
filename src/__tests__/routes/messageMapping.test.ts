/// <reference types="jest" />
import request from "supertest";
import express from "express";
import messageMappingRoutes from "../../routes/messageMapping";
import { MessageMappingService } from "../../services/messageMappingService";

// Mock the MessageMappingService
jest.mock("../../services/messageMappingService");
jest.mock("../../utils/logger");

const MockedMessageMappingService = MessageMappingService as jest.MockedClass<typeof MessageMappingService>;

const app = express();
app.use(express.json());
app.use("/api/message-mapping", messageMappingRoutes);

describe("Message Mapping Routes", () => {
  let mockService: jest.Mocked<MessageMappingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = new MockedMessageMappingService() as jest.Mocked<MessageMappingService>;
  });

  describe("GET /api/message-mapping", () => {
    it("모든 메시지 매핑을 반환해야 함", async () => {
      const mockMappings = [
        { id: "1", name: "Test Mapping 1" },
        { id: "2", name: "Test Mapping 2" }
      ];

      mockService.getAllMappings.mockReturnValue(mockMappings);

      const response = await request(app)
        .get("/api/message-mapping");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMappings);
    });
  });

  describe("POST /api/message-mapping/generate", () => {
    it("유효한 설정으로 매핑을 생성해야 함", async () => {
      const mockConfiguration = {
        sourceFormat: "xml",
        targetFormat: "json",
        mappingRules: []
      };
      const mockSource = "<?xml version=\"1.0\"?><root></root>";
      const mockMapping = { id: "test-id", mapping: "generated mapping" };

      mockService.generateMapping.mockReturnValue(mockMapping);

      const response = await request(app)
        .post("/api/message-mapping/generate")
        .send({
          configuration: mockConfiguration,
          source: mockSource
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockMapping);
      expect(mockService.generateMapping).toHaveBeenCalledWith(mockConfiguration, mockSource);
    });

    it("설정이 없을 때 에러를 반환해야 함", async () => {
      const response = await request(app)
        .post("/api/message-mapping/generate")
        .send({ source: "test" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Configuration and source are required");
    });

    it("소스가 없을 때 에러를 반환해야 함", async () => {
      const response = await request(app)
        .post("/api/message-mapping/generate")
        .send({ configuration: {} });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Configuration and source are required");
    });
  });

  describe("GET /api/message-mapping/:id", () => {
    it("존재하는 매핑을 반환해야 함", async () => {
      const mockMapping = { id: "test-id", name: "Test Mapping" };
      mockService.getMapping.mockReturnValue(mockMapping);

      const response = await request(app)
        .get("/api/message-mapping/test-id");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMapping);
      expect(mockService.getMapping).toHaveBeenCalledWith("test-id");
    });

    it("존재하지 않는 매핑에 대해 404를 반환해야 함", async () => {
      mockService.getMapping.mockReturnValue(null);

      const response = await request(app)
        .get("/api/message-mapping/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Message mapping not found");
    });
  });

  describe("DELETE /api/message-mapping/:id", () => {
    it("매핑을 성공적으로 삭제해야 함", async () => {
      mockService.clearMapping.mockReturnValue(true);

      const response = await request(app)
        .delete("/api/message-mapping/test-id");

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Message mapping cleared successfully");
      expect(mockService.clearMapping).toHaveBeenCalledWith("test-id");
    });

    it("존재하지 않는 매핑 삭제 시 404를 반환해야 함", async () => {
      mockService.clearMapping.mockReturnValue(false);

      const response = await request(app)
        .delete("/api/message-mapping/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Message mapping not found");
    });
  });

  describe("POST /api/message-mapping/:id/rules", () => {
    it("고급 매핑 규칙을 생성해야 함", async () => {
      const mockRules = [
        { sourceField: "field1", targetField: "field2", transformation: "none" }
      ];

      const response = await request(app)
        .post("/api/message-mapping/test-id/rules")
        .send({ rules: mockRules });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("Advanced mapping rules created successfully");
      expect(mockService.createAdvancedMappingRules).toHaveBeenCalledWith("test-id", mockRules);
    });

    it("규칙이 없을 때 에러를 반환해야 함", async () => {
      const response = await request(app)
        .post("/api/message-mapping/test-id/rules")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Rules array is required");
    });
  });

  describe("POST /api/message-mapping/validate-schema", () => {
    it("스키마 검증을 수행해야 함", async () => {
      mockService.validateSchema.mockReturnValue(true);

      const response = await request(app)
        .post("/api/message-mapping/validate-schema")
        .send({
          content: "test content",
          schemaType: "xml",
          schemaContent: "schema content"
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(mockService.validateSchema).toHaveBeenCalledWith("test content", "xml", "schema content");
    });

    it("필수 필드가 없을 때 에러를 반환해야 함", async () => {
      const response = await request(app)
        .post("/api/message-mapping/validate-schema")
        .send({ content: "test" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Content, schemaType, and schemaContent are required");
    });
  });
});