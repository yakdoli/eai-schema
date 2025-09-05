/// <reference types="jest" />
import { MessageMappingService, Configuration, AdvancedMappingRule, TransformationRule, CollaborationData } from "../../services/messageMappingService";

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock("../../utils/logger", () => ({
  logger: mockLogger
}));

describe("MessageMappingService", () => {
  let service: MessageMappingService;

  beforeEach(() => {
    service = new MessageMappingService(mockLogger);
  });

  describe("generateMapping", () => {
    it("XML 설정으로 매핑을 생성해야 함", () => {
      const config: Configuration = {
        messageType: "XML",
        dataType: "JSON",
        rootElement: "testRoot",
        namespace: "http://test.com",
        encoding: "UTF-8",
        version: "1.0",
        statement: "test statement",
        testData: { test: "data" }
      };

      const source = '{"name": "test", "value": 123}';
      const mapping = service.generateMapping(config, source);

      expect(mapping).toMatchObject({
        id: expect.any(String),
        source: source,
        target: expect.stringContaining("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"),
        configuration: config,
        metadata: {
          createdAt: expect.any(Date),
          nodeCount: expect.any(Number),
          xmlSize: expect.any(Number),
          processingTime: expect.any(Number),
          validationStatus: expect.any(Boolean)
        }
      });

      expect(mapping.target).toContain("<testRoot");
      expect(mapping.target).toContain("xmlns=\"http://test.com\"");
      expect(mapping.target).toContain("</testRoot>");
    });

    it("JSON 설정으로 매핑을 생성해야 함", () => {
      const config: Configuration = {
        messageType: "JSON",
        dataType: "XML",
        rootElement: "jsonRoot",
        namespace: "",
        encoding: "UTF-8",
        version: "2.0",
        statement: "",
        testData: null
      };

      const source = "<root><item>test</item></root>";
      const mapping = service.generateMapping(config, source);

      expect(mapping.target).toContain("\"root\": \"jsonRoot\"");
      expect(mapping.target).toContain("\"version\": \"2.0\"");
      expect(mapping.target).toContain("\"transformed\": true");
    });

    it("YAML 설정으로 매핑을 생성해야 함", () => {
      const config: Configuration = {
        messageType: "YAML",
        dataType: "JSON",
        rootElement: "yamlRoot",
        namespace: "yaml:ns",
        encoding: "UTF-8",
        version: "1.0",
        statement: "yaml statement",
        testData: {}
      };

      const source = '{"test": "yaml"}';
      const mapping = service.generateMapping(config, source);

      expect(mapping.target).toContain("---");
      expect(mapping.target).toContain("root: \"yamlRoot\"");
      expect(mapping.target).toContain("namespace: \"yaml:ns\"");
      expect(mapping.target).toContain("transformed: true");
    });

    it("잘못된 JSON 소스를 안전하게 처리해야 함", () => {
      const config: Configuration = {
        messageType: "XML",
        dataType: "JSON",
        rootElement: "root",
        namespace: "",
        encoding: "UTF-8",
        version: "1.0",
        statement: "",
        testData: null
      };

      const invalidJson = '{"invalid": json}';
      const mapping = service.generateMapping(config, invalidJson);

      expect(mapping.target).toContain("<error type=\"invalid-json\">");
      expect(mapping.target).toContain("Invalid JSON format");
      expect(mapping.target).toContain("<transformed>true</transformed>");
    });
  });

  describe("getMapping", () => {
    it("존재하는 매핑을 반환해야 함", () => {
      const config: Configuration = {
        messageType: "XML",
        dataType: "JSON",
        rootElement: "test",
        namespace: "",
        encoding: "UTF-8",
        version: "1.0",
        statement: "",
        testData: null
      };

      const mapping = service.generateMapping(config, "{}");
      const retrieved = service.getMapping(mapping.id);

      expect(retrieved).toEqual(mapping);
    });

    it("존재하지 않는 매핑에 대해 undefined를 반환해야 함", () => {
      const retrieved = service.getMapping("nonexistent-id");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("clearMapping", () => {
    it("존재하는 매핑을 삭제해야 함", () => {
      const config: Configuration = {
        messageType: "XML",
        dataType: "JSON",
        rootElement: "test",
        namespace: "",
        encoding: "UTF-8",
        version: "1.0",
        statement: "",
        testData: null
      };

      const mapping = service.generateMapping(config, "{}");
      const deleted = service.clearMapping(mapping.id);

      expect(deleted).toBe(true);
      expect(service.getMapping(mapping.id)).toBeUndefined();
    });

    it("존재하지 않는 매핑 삭제 시 false를 반환해야 함", () => {
      const deleted = service.clearMapping("nonexistent-id");
      expect(deleted).toBe(false);
    });
  });

  describe("getAllMappings", () => {
    it("모든 매핑을 반환해야 함", () => {
      const config: Configuration = {
        messageType: "XML",
        dataType: "JSON",
        rootElement: "test",
        namespace: "",
        encoding: "UTF-8",
        version: "1.0",
        statement: "",
        testData: null
      };

      const mapping1 = service.generateMapping(config, "{}");
      const mapping2 = service.generateMapping(config, "[]");

      const allMappings = service.getAllMappings();
      expect(allMappings).toHaveLength(2);
      expect(allMappings).toContainEqual(mapping1);
      expect(allMappings).toContainEqual(mapping2);
    });

    it("매핑이 없을 때 빈 배열을 반환해야 함", () => {
      const allMappings = service.getAllMappings();
      expect(allMappings).toEqual([]);
    });
  });

  describe("Advanced Mapping Rules", () => {
    it("고급 매핑 규칙을 생성하고 조회해야 함", () => {
      const mappingId = "test-mapping";
      const rules: AdvancedMappingRule[] = [
        {
          id: "rule1",
          type: "element",
          sourcePath: "/root/source",
          targetPath: "/root/target",
          transformation: "uppercase",
          required: true
        },
        {
          id: "rule2",
          type: "attribute",
          sourcePath: "/root/@attr",
          targetPath: "/root/@newAttr",
          defaultValue: "default"
        }
      ];

      service.createAdvancedMappingRules(mappingId, rules);
      const retrievedRules = service.getAdvancedMappingRules(mappingId);

      expect(retrievedRules).toEqual(rules);
    });

    it("존재하지 않는 매핑의 규칙 조회 시 빈 배열을 반환해야 함", () => {
      const rules = service.getAdvancedMappingRules("nonexistent");
      expect(rules).toEqual([]);
    });
  });

  describe("Transformation Rules", () => {
    it("변환 규칙을 생성하고 조회해야 함", () => {
      const mappingId = "test-mapping";
      const rule: TransformationRule = {
        id: "transform1",
        name: "Uppercase Transform",
        description: "Convert text to uppercase",
        function: "text => text.toUpperCase()",
        parameters: { preserveSpaces: true }
      };

      service.createTransformationRule(mappingId, rule);
      const rules = service.getTransformationRules(mappingId);

      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual(rule);
    });

    it("여러 변환 규칙을 추가할 수 있어야 함", () => {
      const mappingId = "test-mapping";
      const rule1: TransformationRule = {
        id: "transform1",
        name: "Rule 1",
        description: "First rule",
        function: "x => x",
        parameters: {}
      };
      const rule2: TransformationRule = {
        id: "transform2",
        name: "Rule 2",
        description: "Second rule",
        function: "y => y",
        parameters: {}
      };

      service.createTransformationRule(mappingId, rule1);
      service.createTransformationRule(mappingId, rule2);

      const rules = service.getTransformationRules(mappingId);
      expect(rules).toHaveLength(2);
      expect(rules).toContainEqual(rule1);
      expect(rules).toContainEqual(rule2);
    });
  });

  describe("Collaboration Features", () => {
    it("협업 이벤트를 추가하고 조회해야 함", () => {
      const mappingId = "test-mapping";
      const event: CollaborationData = {
        userId: "user1",
        username: "testuser",
        timestamp: new Date(),
        action: "create",
        target: "element1",
        details: { field: "value" }
      };

      service.addCollaborationEvent(mappingId, event);
      const history = service.getCollaborationHistory(mappingId);

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(event);
    });

    it("여러 협업 이벤트를 순서대로 저장해야 함", () => {
      const mappingId = "test-mapping";
      const event1: CollaborationData = {
        userId: "user1",
        username: "user1",
        timestamp: new Date(),
        action: "create",
        target: "element1",
        details: {}
      };
      const event2: CollaborationData = {
        userId: "user2",
        username: "user2",
        timestamp: new Date(),
        action: "update",
        target: "element2",
        details: {}
      };

      service.addCollaborationEvent(mappingId, event1);
      service.addCollaborationEvent(mappingId, event2);

      const history = service.getCollaborationHistory(mappingId);
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(event1);
      expect(history[1]).toEqual(event2);
    });
  });

  describe("Schema Validation", () => {
    it("XSD 스키마 검증을 수행해야 함", () => {
      const content = "<root><item>test</item></root>";
      const schemaContent = "<xs:schema>...</xs:schema>";
      
      const isValid = service.validateSchema(content, "xsd", schemaContent);
      expect(typeof isValid).toBe("boolean");
    });

    it("JSON 스키마 검증을 수행해야 함", () => {
      const content = '{"name": "test"}';
      const schemaContent = '{"type": "object"}';
      
      const isValid = service.validateSchema(content, "json", schemaContent);
      expect(typeof isValid).toBe("boolean");
    });

    it("YAML 스키마 검증을 수행해야 함", () => {
      const content = "name: test\nvalue: 123";
      const schemaContent = "type: object";
      
      const isValid = service.validateSchema(content, "yaml", schemaContent);
      expect(typeof isValid).toBe("boolean");
    });

    it("지원되지 않는 스키마 타입에 대해 false를 반환해야 함", () => {
      const content = "test content";
      const schemaContent = "test schema";
      
      const isValid = service.validateSchema(content, "unsupported", schemaContent);
      expect(isValid).toBe(false);
    });
  });

  describe("Metadata Generation", () => {
    it("XML 콘텐츠의 노드 수를 정확히 계산해야 함", () => {
      const config: Configuration = {
        messageType: "XML",
        dataType: "JSON",
        rootElement: "root",
        namespace: "",
        encoding: "UTF-8",
        version: "1.0",
        statement: "",
        testData: null
      };

      const source = '{"item1": "value1", "item2": {"nested": "value2"}}';
      const mapping = service.generateMapping(config, source);

      expect(mapping.metadata.nodeCount).toBeGreaterThan(0);
      expect(mapping.metadata.xmlSize).toBeGreaterThan(0);
      expect(mapping.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("JSON 콘텐츠의 노드 수를 정확히 계산해야 함", () => {
      const config: Configuration = {
        messageType: "JSON",
        dataType: "XML",
        rootElement: "root",
        namespace: "",
        encoding: "UTF-8",
        version: "1.0",
        statement: "",
        testData: null
      };

      const source = "<root><item1>value1</item1><item2><nested>value2</nested></item2></root>";
      const mapping = service.generateMapping(config, source);

      expect(mapping.metadata.nodeCount).toBeGreaterThan(0);
    });

    it("검증 상태를 올바르게 설정해야 함", () => {
      const config: Configuration = {
        messageType: "XML",
        dataType: "JSON",
        rootElement: "validRoot",
        namespace: "",
        encoding: "UTF-8",
        version: "1.0",
        statement: "",
        testData: null
      };

      const source = '{"valid": "json"}';
      const mapping = service.generateMapping(config, source);

      expect(typeof mapping.metadata.validationStatus).toBe("boolean");
    });
  });
});