/// <reference types="jest" />
import { UrlFetchService } from "../../services/urlFetchService";
import { SecurityError, ValidationError, NetworkError } from "../../middleware/errorHandler";
import * as https from "https";
import * as http from "http";

// Mock HTTP modules
jest.mock("https");
jest.mock("http");
jest.mock("../../utils/logger");

const mockHttps = https as jest.Mocked<typeof https>;
const mockHttp = http as jest.Mocked<typeof http>;

describe("UrlFetchService Security Tests", () => {
  let service: UrlFetchService;
  let mockRequest: any;

  beforeEach(() => {
    service = new UrlFetchService();
    jest.clearAllMocks();

    // Mock request object
    mockRequest = {
      on: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn()
    };

    mockHttps.request.mockReturnValue(mockRequest);
    mockHttp.request.mockReturnValue(mockRequest);
  });

  describe("URL 보안 검증", () => {
    it("HTTPS URL만 허용해야 함 (프로덕션 환경)", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await expect(service.fetchFromUrl("http://example.com/schema.xml"))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl("ftp://example.com/schema.xml"))
        .rejects.toThrow(SecurityError);

      process.env.NODE_ENV = originalEnv;
    });

    it("개발 환경에서는 HTTP도 허용해야 함", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Mock successful response
      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from("<?xml version=\"1.0\"?><root></root>"));
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttp.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      // Should not throw for HTTP in development
      try {
        await service.fetchFromUrl("http://example.com/schema.xml");
      } catch (error) {
        // May fail for other reasons, but not security
        expect(error).not.toBeInstanceOf(SecurityError);
      }

      process.env.NODE_ENV = originalEnv;
    });

    it("차단된 호스트에 대한 접근을 거부해야 함", async () => {
      const blockedUrls = [
        "https://localhost/schema.xml",
        "https://127.0.0.1/schema.xml",
        "https://0.0.0.0/schema.xml",
        "https://metadata.google.internal/schema.xml",
        "https://169.254.169.254/schema.xml",
        "https://10.0.0.1/schema.xml",
        "https://172.16.0.1/schema.xml",
        "https://192.168.1.1/schema.xml"
      ];

      for (const url of blockedUrls) {
        await expect(service.fetchFromUrl(url))
          .rejects.toThrow(SecurityError);
      }
    });

    it("IP 주소로의 직접 접근을 차단해야 함", async () => {
      const ipUrls = [
        "https://8.8.8.8/schema.xml",
        "https://1.1.1.1/schema.xml",
        "https://[2001:db8::1]/schema.xml"
      ];

      for (const url of ipUrls) {
        await expect(service.fetchFromUrl(url))
          .rejects.toThrow(SecurityError);
      }
    });

    it("허용되지 않은 포트에 대한 접근을 거부해야 함", async () => {
      const invalidPortUrls = [
        "https://example.com:22/schema.xml",    // SSH
        "https://example.com:23/schema.xml",    // Telnet
        "https://example.com:3389/schema.xml",  // RDP
        "https://example.com:5432/schema.xml"   // PostgreSQL
      ];

      for (const url of invalidPortUrls) {
        await expect(service.fetchFromUrl(url))
          .rejects.toThrow(SecurityError);
      }
    });

    it("허용된 포트는 접근을 허용해야 함", async () => {
      const validPortUrls = [
        "https://example.com:443/schema.xml",
        "https://example.com:8080/schema.xml",
        "https://example.com:8443/schema.xml"
      ];

      // Mock successful response
      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from("<?xml version=\"1.0\"?><root></root>"));
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      for (const url of validPortUrls) {
        try {
          await service.fetchFromUrl(url);
          // Should not throw SecurityError for valid ports
        } catch (error) {
          expect(error).not.toBeInstanceOf(SecurityError);
        }
      }
    });

    it("잘못된 URL 형식을 거부해야 함", async () => {
      const invalidUrls = [
        "not-a-url",
        "://invalid",
        "https://",
        "https:///path",
        ""
      ];

      for (const url of invalidUrls) {
        await expect(service.fetchFromUrl(url))
          .rejects.toThrow(ValidationError);
      }
    });
  });

  describe("응답 크기 제한", () => {
    it("Content-Length가 너무 클 때 요청을 거부해야 함", async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 
          "content-type": "application/xml",
          "content-length": (60 * 1024 * 1024).toString() // 60MB
        },
        on: jest.fn()
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      await expect(service.fetchFromUrl("https://example.com/large.xml"))
        .rejects.toThrow(ValidationError);
    });

    it("실시간 데이터 크기가 제한을 초과할 때 요청을 중단해야 함", async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            // Simulate large chunk
            const largeChunk = Buffer.alloc(60 * 1024 * 1024); // 60MB
            callback(largeChunk);
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      await expect(service.fetchFromUrl("https://example.com/streaming-large.xml"))
        .rejects.toThrow(ValidationError);
      
      expect(mockRequest.destroy).toHaveBeenCalled();
    });
  });

  describe("콘텐츠 보안 검증", () => {
    it("XXE 공격이 포함된 XML을 거부해야 함", async () => {
      const maliciousXml = `<?xml version="1.0"?>
        <!DOCTYPE root [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <root>&xxe;</root>`;

      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from(maliciousXml));
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      await expect(service.fetchFromUrl("https://example.com/malicious.xml"))
        .rejects.toThrow(SecurityError);
    });

    it("빈 응답을 거부해야 함", async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            // No data
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      await expect(service.fetchFromUrl("https://example.com/empty.xml"))
        .rejects.toThrow(ValidationError);
    });

    it("유효하지 않은 XML 형식을 거부해야 함", async () => {
      const invalidXml = "This is not XML content";

      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from(invalidXml));
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      await expect(service.fetchFromUrl("https://example.com/invalid.xml"))
        .rejects.toThrow(ValidationError);
    });

    it("유효하지 않은 JSON 형식을 거부해야 함", async () => {
      const invalidJson = "This is not JSON content";

      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from(invalidJson));
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      await expect(service.fetchFromUrl("https://example.com/invalid.json"))
        .rejects.toThrow(ValidationError);
    });
  });

  describe("네트워크 에러 처리", () => {
    it("HTTP 에러 상태 코드를 처리해야 함", async () => {
      const errorCodes = [400, 401, 403, 404, 500, 502, 503];

      for (const statusCode of errorCodes) {
        const mockResponse = {
          statusCode,
          statusMessage: "Error",
          headers: {},
          on: jest.fn()
        };

        mockHttps.request.mockImplementation((options, callback) => {
          if (callback) callback(mockResponse);
          return mockRequest;
        });

        await expect(service.fetchFromUrl("https://example.com/error.xml"))
          .rejects.toThrow(NetworkError);
      }
    });

    it("요청 타임아웃을 처리해야 함", async () => {
      mockHttps.request.mockImplementation(() => {
        const request = {
          on: jest.fn((event, callback) => {
            if (event === "timeout") {
              setTimeout(callback, 10); // Simulate timeout
            }
          }),
          end: jest.fn(),
          destroy: jest.fn()
        };
        return request;
      });

      await expect(service.fetchFromUrl("https://example.com/timeout.xml"))
        .rejects.toThrow(NetworkError);
    });

    it("네트워크 연결 에러를 처리해야 함", async () => {
      mockHttps.request.mockImplementation(() => {
        const request = {
          on: jest.fn((event, callback) => {
            if (event === "error") {
              setTimeout(() => callback(new Error("Connection failed")), 10);
            }
          }),
          end: jest.fn(),
          destroy: jest.fn()
        };
        return request;
      });

      await expect(service.fetchFromUrl("https://example.com/connection-error.xml"))
        .rejects.toThrow(NetworkError);
    });
  });

  describe("isSupportedUrl", () => {
    it("지원되는 URL 스키마를 올바르게 식별해야 함", () => {
      expect(service.isSupportedUrl("https://example.com/schema.xml")).toBe(true);
      expect(service.isSupportedUrl("http://example.com/schema.xml")).toBe(true);
      expect(service.isSupportedUrl("ftp://example.com/schema.xml")).toBe(false);
      expect(service.isSupportedUrl("file:///etc/passwd")).toBe(false);
      expect(service.isSupportedUrl("javascript:alert(1)")).toBe(false);
      expect(service.isSupportedUrl("data:text/plain,hello")).toBe(false);
      expect(service.isSupportedUrl("not-a-url")).toBe(false);
    });
  });

  describe("성공적인 요청", () => {
    it("유효한 XML 스키마를 성공적으로 가져와야 함", async () => {
      const validXml = "<?xml version=\"1.0\"?><schema><element name=\"test\"/></schema>";

      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from(validXml));
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      const result = await service.fetchFromUrl("https://example.com/valid.xml");

      expect(result).toMatchObject({
        content: expect.any(Buffer),
        contentType: "application/xml",
        size: validXml.length,
        url: "https://example.com/valid.xml",
        fetchedAt: expect.any(Date)
      });

      expect(result.content.toString()).toBe(validXml);
    });

    it("유효한 JSON 스키마를 성공적으로 가져와야 함", async () => {
      const validJson = '{"type": "object", "properties": {"name": {"type": "string"}}}';

      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from(validJson));
          } else if (event === "end") {
            callback();
          }
        })
      };

      mockHttps.request.mockImplementation((options, callback) => {
        if (callback) callback(mockResponse);
        return mockRequest;
      });

      const result = await service.fetchFromUrl("https://example.com/valid.json");

      expect(result).toMatchObject({
        content: expect.any(Buffer),
        contentType: "application/json",
        size: validJson.length,
        url: "https://example.com/valid.json",
        fetchedAt: expect.any(Date)
      });

      expect(result.content.toString()).toBe(validJson);
    });
  });
});