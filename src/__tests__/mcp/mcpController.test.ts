/// <reference types="jest" />
import request from "supertest";
import express from "express";
import mcpRoutes from "../../mcp/mcpController";
import { MCPIntegrationService } from "../../mcp/MCPIntegrationService";

// Mock the MCPIntegrationService
jest.mock("../../mcp/MCPIntegrationService");
jest.mock("../../services/messageMappingService");
jest.mock("../../utils/logger");

const MockedMCPIntegrationService = MCPIntegrationService as jest.MockedClass<typeof MCPIntegrationService>;

const app = express();
app.use(express.json());
app.use("/api/mcp", mcpRoutes);

describe("MCP Controller Routes", () => {
  let mockService: jest.Mocked<MCPIntegrationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = new MockedMCPIntegrationService() as jest.Mocked<MCPIntegrationService>;
  });

  describe("GET /api/mcp", () => {
    it("MCP 서비스 정보를 반환해야 함", async () => {
      const response = await request(app)
        .get("/api/mcp");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: "EAI Schema Toolkit MCP Service",
        version: "1.0.0",
        description: "Model Context Protocol integration for EAI Schema Toolkit",
        endpoints: {
          provider: "/api/mcp/provider",
          process: "/api/mcp/process",
          health: "/api/mcp/health"
        },
        capabilities: [
          "schema-transformation",
          "schema-validation",
          "format-detection"
        ],
        status: "active"
      });
    });
  });

  describe("GET /api/mcp/provider", () => {
    it("MCP 프로바이더 정보를 반환해야 함", async () => {
      const mockProviderInfo = {
        name: "EAI Schema Toolkit",
        version: "1.0.0",
        capabilities: ["schema-transformation", "schema-validation"]
      };

      mockService.getProviderInfo.mockReturnValue(mockProviderInfo);

      const response = await request(app)
        .get("/api/mcp/provider");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProviderInfo);
      expect(mockService.getProviderInfo).toHaveBeenCalled();
    });

    it("서비스 에러 시 500을 반환해야 함", async () => {
      mockService.getProviderInfo.mockImplementation(() => {
        throw new Error("Provider error");
      });

      const response = await request(app)
        .get("/api/mcp/provider");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });

  describe("POST /api/mcp/process", () => {
    it("유효한 MCP 요청을 처리해야 함", async () => {
      const mockRequest = {
        method: "transform",
        params: {
          source: "<?xml version=\"1.0\"?><root></root>",
          targetFormat: "json"
        }
      };

      const mockResult = {
        success: true,
        result: { "root": {} }
      };

      mockService.processRequest.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/mcp/process")
        .send(mockRequest);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockService.processRequest).toHaveBeenCalledWith(mockRequest);
    });

    it("요청 본문이 없을 때 에러를 반환해야 함", async () => {
      const response = await request(app)
        .post("/api/mcp/process");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Request body is required");
    });

    it("서비스 에러 시 500을 반환해야 함", async () => {
      const mockRequest = { method: "invalid" };
      mockService.processRequest.mockRejectedValue(new Error("Process error"));

      const response = await request(app)
        .post("/api/mcp/process")
        .send(mockRequest);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });

  describe("GET /api/mcp/health", () => {
    it("MCP 헬스체크를 반환해야 함", async () => {
      const response = await request(app)
        .get("/api/mcp/health");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "OK",
        timestamp: expect.any(String)
      });
    });

    it("타임스탬프가 유효한 ISO 형식이어야 함", async () => {
      const response = await request(app)
        .get("/api/mcp/health");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });
});