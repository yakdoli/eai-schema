// EAI Schema Toolkit - EAI Work Tool Mapping Test Suite
// This test file verifies the enhanced EAI Work Tool mapping functionality

const {
  MessageMappingService,
  MessageMapping,
  Configuration,
} = require("./dist/services/messageMappingService");
// Simple logger for testing
const logger = {
  info: (message, meta) => console.log(`[INFO] ${message}`, meta || ""),
  error: (message, meta) => console.error(`[ERROR] ${message}`, meta || ""),
  warn: (message, meta) => console.warn(`[WARN] ${message}`, meta || ""),
  debug: (message, meta) => console.debug(`[DEBUG] ${message}`, meta || ""),
};

class EAIMappingTester {
  constructor() {
    this.service = new MessageMappingService(logger);
    this.testResults = [];
  }

  // Test basic XML mapping functionality
  testBasicXmlMapping() {
    console.log("🧪 Testing Basic XML Mapping...");

    const config = {
      messageType: "XML",
      dataType: "xml",
      rootElement: "Order",
      namespace: "http://example.com/order",
      encoding: "UTF-8",
      version: "1.0",
      statement: 'SELECT * FROM orders WHERE status = "active"',
      testData: {},
    };

    const sourceXml =
      "<order><id>123</id><customer>John Doe</customer><amount>100.00</amount></order>";

    try {
      const mapping = this.service.generateMapping(config, sourceXml);

      // Verify mapping structure
      this.assert(mapping.id, "Mapping should have an ID");
      this.assert(mapping.source === sourceXml, "Source should match input");
      this.assert(
        mapping.target.includes("<?xml"),
        "Target should be valid XML",
      );
      this.assert(
        mapping.target.includes("<Order"),
        "Target should use configured root element",
      );
      this.assert(
        mapping.configuration.messageType === "XML",
        "Configuration should be preserved",
      );
      this.assert(
        mapping.metadata.validationStatus === true,
        "Mapping should be valid",
      );

      console.log("✅ Basic XML Mapping test passed");
      this.testResults.push({ test: "Basic XML Mapping", status: "PASS" });
    } catch (error) {
      console.log("❌ Basic XML Mapping test failed:", error.message);
      this.testResults.push({
        test: "Basic XML Mapping",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Test JSON to XML transformation
  testJsonToXmlTransformation() {
    console.log("🧪 Testing JSON to XML Transformation...");

    const config = {
      messageType: "XML",
      dataType: "json",
      rootElement: "Product",
      namespace: "http://example.com/product",
      encoding: "UTF-8",
      version: "1.0",
      statement: "",
      testData: {},
    };

    const sourceJson =
      '{"name": "Widget", "price": 29.99, "category": "Electronics"}';

    try {
      const mapping = this.service.generateMapping(config, sourceJson);

      // Verify JSON to XML conversion
      this.assert(
        mapping.target.includes("<Product"),
        "Should contain root element",
      );
      this.assert(
        mapping.target.includes("<name>") &&
          mapping.target.includes("Widget") &&
          mapping.target.includes("</name>"),
        "Should convert JSON properties to XML elements",
      );
      this.assert(
        mapping.target.includes("<price>") &&
          mapping.target.includes("29.99") &&
          mapping.target.includes("</price>"),
        "Should handle numeric values",
      );
      this.assert(
        mapping.target.includes('xmlns="http://example.com/product"'),
        "Should include namespace",
      );

      console.log("✅ JSON to XML Transformation test passed");
      this.testResults.push({
        test: "JSON to XML Transformation",
        status: "PASS",
      });
    } catch (error) {
      console.log("❌ JSON to XML Transformation test failed:", error.message);
      this.testResults.push({
        test: "JSON to XML Transformation",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Test JSON mapping functionality
  testJsonMapping() {
    console.log("🧪 Testing JSON Mapping...");

    const config = {
      messageType: "JSON",
      dataType: "json",
      rootElement: "Invoice",
      namespace: "",
      encoding: "UTF-8",
      version: "1.0",
      statement: "SELECT * FROM invoices",
      testData: { sample: "data" },
    };

    const sourceJson =
      '{"invoiceNumber": "INV-001", "total": 250.00, "items": [{"name": "Item 1", "quantity": 2}]}';

    try {
      const mapping = this.service.generateMapping(config, sourceJson);

      // Parse the JSON output
      const output = JSON.parse(mapping.target);

      // Verify JSON structure
      this.assert(
        output.root === "Invoice",
        "Should include root element info",
      );
      this.assert(
        output.data.invoiceNumber === "INV-001",
        "Should preserve original data",
      );
      this.assert(
        output.statement === config.statement,
        "Should include statement",
      );
      this.assert(output.transformed === true, "Should mark as transformed");

      console.log("✅ JSON Mapping test passed");
      this.testResults.push({ test: "JSON Mapping", status: "PASS" });
    } catch (error) {
      console.log("❌ JSON Mapping test failed:", error.message);
      this.testResults.push({
        test: "JSON Mapping",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Test configuration validation
  testConfigurationValidation() {
    console.log("🧪 Testing Configuration Validation...");

    // Test missing required fields
    const invalidConfig = {
      messageType: "", // Missing message type
      dataType: "xml",
      rootElement: "",
      statement: "",
    };

    const source = "<test></test>";

    try {
      const mapping = this.service.generateMapping(invalidConfig, source);

      // Should still generate mapping but with defaults
      this.assert(
        mapping.id,
        "Should generate mapping even with invalid config",
      );
      this.assert(
        mapping.configuration.messageType === "",
        "Should preserve empty message type",
      );

      console.log("✅ Configuration Validation test passed");
      this.testResults.push({
        test: "Configuration Validation",
        status: "PASS",
      });
    } catch (error) {
      console.log("❌ Configuration Validation test failed:", error.message);
      this.testResults.push({
        test: "Configuration Validation",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Test metadata generation
  testMetadataGeneration() {
    console.log("🧪 Testing Metadata Generation...");

    const config = {
      messageType: "XML",
      dataType: "xml",
      rootElement: "Test",
      namespace: "",
      encoding: "UTF-8",
      version: "1.0",
      statement: "",
      testData: {},
    };

    const source = "<test><item>value</item></test>";

    try {
      const mapping = this.service.generateMapping(config, source);

      // Verify metadata
      this.assert(
        mapping.metadata.createdAt instanceof Date,
        "Should have creation timestamp",
      );
      this.assert(
        typeof mapping.metadata.nodeCount === "number",
        "Should have node count",
      );
      this.assert(
        typeof mapping.metadata.xmlSize === "number",
        "Should have XML size",
      );
      this.assert(
        typeof mapping.metadata.processingTime === "number",
        "Should have processing time",
      );
      this.assert(
        typeof mapping.metadata.validationStatus === "boolean",
        "Should have validation status",
      );

      console.log("✅ Metadata Generation test passed");
      this.testResults.push({ test: "Metadata Generation", status: "PASS" });
    } catch (error) {
      console.log("❌ Metadata Generation test failed:", error.message);
      this.testResults.push({
        test: "Metadata Generation",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Test mapping rules generation
  testMappingRulesGeneration() {
    console.log("🧪 Testing Mapping Rules Generation...");

    const config = {
      messageType: "XML",
      dataType: "json",
      rootElement: "Document",
      namespace: "http://example.com",
      encoding: "UTF-8",
      version: "1.0",
      statement: "SELECT * FROM documents",
      testData: {},
    };

    const source = '{"title": "Test Document", "content": "Test content"}';

    try {
      const mapping = this.service.generateMapping(config, source);

      // Verify mapping rules
      this.assert(mapping.mappings.mappingRules, "Should have mapping rules");
      this.assert(
        Array.isArray(mapping.mappings.mappingRules),
        "Mapping rules should be an array",
      );

      const rules = mapping.mappings.mappingRules;
      const elementRule = rules.find((rule) => rule.type === "element");
      const statementRule = rules.find((rule) => rule.type === "statement");

      this.assert(elementRule, "Should have element rule");
      this.assert(
        elementRule.name === "Document",
        "Element rule should use root element name",
      );
      this.assert(
        elementRule.namespace === "http://example.com",
        "Element rule should include namespace",
      );

      this.assert(statementRule, "Should have statement rule");
      this.assert(
        statementRule.content === config.statement,
        "Statement rule should include statement content",
      );

      console.log("✅ Mapping Rules Generation test passed");
      this.testResults.push({
        test: "Mapping Rules Generation",
        status: "PASS",
      });
    } catch (error) {
      console.log("❌ Mapping Rules Generation test failed:", error.message);
      this.testResults.push({
        test: "Mapping Rules Generation",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Test error handling
  testErrorHandling() {
    console.log("🧪 Testing Error Handling...");

    const config = {
      messageType: "XML",
      dataType: "json",
      rootElement: "Test",
      statement: "",
      testData: {},
    };

    const invalidJson = '{"invalid": json content}';

    try {
      const mapping = this.service.generateMapping(config, invalidJson);

      // Should handle invalid JSON gracefully
      this.assert(
        mapping.target.includes("transformed"),
        "Should still generate output for invalid input",
      );

      console.log("✅ Error Handling test passed");
      this.testResults.push({ test: "Error Handling", status: "PASS" });
    } catch (error) {
      console.log("❌ Error Handling test failed:", error.message);
      this.testResults.push({
        test: "Error Handling",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Test performance with large data
  testLargeDataPerformance() {
    console.log("🧪 Testing Large Data Performance...");

    const config = {
      messageType: "XML",
      dataType: "json",
      rootElement: "LargeData",
      statement: "",
      testData: {},
    };

    // Generate large JSON data
    const largeData = {
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`.repeat(10),
        data: { nested: { value: Math.random() } },
      })),
    };

    const sourceJson = JSON.stringify(largeData);

    try {
      const startTime = Date.now();
      const mapping = this.service.generateMapping(config, sourceJson);
      const endTime = Date.now();

      // Verify performance
      this.assert(
        mapping.metadata.processingTime < 5000,
        "Should process large data within 5 seconds",
      );
      this.assert(
        mapping.target.length > sourceJson.length,
        "XML output should be larger than JSON input",
      );
      this.assert(
        mapping.metadata.nodeCount > 1000,
        "Should have many XML nodes",
      );

      console.log(
        `✅ Large Data Performance test passed (${endTime - startTime}ms)`,
      );
      this.testResults.push({
        test: "Large Data Performance",
        status: "PASS",
        time: endTime - startTime,
      });
    } catch (error) {
      console.log("❌ Large Data Performance test failed:", error.message);
      this.testResults.push({
        test: "Large Data Performance",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  // Utility assertion method
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log("🚀 Starting EAI Work Tool Mapping Tests...\n");

    const tests = [
      "testBasicXmlMapping",
      "testJsonToXmlTransformation",
      "testJsonMapping",
      "testConfigurationValidation",
      "testMetadataGeneration",
      "testMappingRulesGeneration",
      "testErrorHandling",
      "testLargeDataPerformance",
    ];

    for (const testName of tests) {
      try {
        await this[testName]();
      } catch (error) {
        console.log(`❌ ${testName} failed with error:`, error.message);
        this.testResults.push({
          test: testName,
          status: "ERROR",
          error: error.message,
        });
      }
      console.log(""); // Add spacing between tests
    }

    this.printTestSummary();
  }

  // Print test summary
  printTestSummary() {
    console.log("📊 Test Summary");
    console.log("================");

    const passed = this.testResults.filter(
      (result) => result.status === "PASS",
    ).length;
    const failed = this.testResults.filter(
      (result) => result.status === "FAIL",
    ).length;
    const errors = this.testResults.filter(
      (result) => result.status === "ERROR",
    ).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔥 Errors: ${errors}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0 || errors > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults
        .filter((result) => result.status !== "PASS")
        .forEach((result) => {
          console.log(`  - ${result.test}: ${result.error || "Unknown error"}`);
        });
    }

    console.log("\n🎉 EAI Work Tool Mapping Tests Complete!");
  }
}

// Export for use in other test files
module.exports = EAIMappingTester;

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new EAIMappingTester();
  tester.runAllTests().catch(console.error);
}
