/**
 * WSDLModel 단위 테스트
 */

import { WSDLModel } from '../../models/wsdl-model.js';
import { Logger } from '../../core/logging/Logger';

// Logger 모킹
jest.mock('../../core/logging/Logger');

describe('WSDLModel', () => {
  let model: WSDLModel;

  beforeEach(() => {
    // Logger 모킹 설정
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
    
    model = new WSDLModel();
  });

  describe('Constructor', () => {
    it('should initialize with WSDL-specific defaults', () => {
      expect(model.protocol).toBe('wsdl');
      expect(model.version).toBe('2.0');
      expect(model.bindings).toEqual([]);
      expect(model.services).toEqual([]);
    });

    it('should inherit from BaseModel', () => {
      expect(model.rootName).toBe('');
      expect(model.xmlNamespace).toBe('');
      expect(model.targetNamespace).toBe('');
      expect(model.gridData).toBeDefined();
      expect(Array.isArray(model.gridData)).toBe(true);
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      model.setRootName('TestService');
      model.setTargetNamespace('http://example.com/test');
    });

    it('should validate successfully with complete data', () => {
      const result = model.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should require target namespace for WSDL', () => {
      model.setTargetNamespace('');
      const result = model.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target namespace is required for WSDL');
    });

    it('should require root name (inherited from BaseModel)', () => {
      model.setRootName('');
      const result = model.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Root name is required');
    });

    it('should validate grid data - require type when name is specified', () => {
      model.updateGridCell(0, 'name', 'testField');
      model.updateGridCell(0, 'type', ''); // Missing type
      
      const result = model.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Row 1: Type is required when name is specified');
    });

    it('should validate multiple grid rows', () => {
      model.updateGridCell(0, 'name', 'field1');
      model.updateGridCell(0, 'type', ''); // Missing type
      model.updateGridCell(1, 'name', 'field2');
      model.updateGridCell(1, 'type', ''); // Missing type
      
      const result = model.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Row 1: Type is required when name is specified');
      expect(result.errors).toContain('Row 2: Type is required when name is specified');
    });

    it('should allow empty grid rows', () => {
      // Don't add any grid data
      const result = model.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should allow grid rows with both name and type', () => {
      model.updateGridCell(0, 'name', 'testField');
      model.updateGridCell(0, 'type', 'xsd:string');
      
      const result = model.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('addBinding', () => {
    it('should add binding to bindings array', () => {
      const binding = { name: 'TestBinding', type: 'soap' };
      
      model.addBinding(binding);
      
      expect(model.bindings).toContain(binding);
      expect(model.bindings).toHaveLength(1);
    });

    it('should add multiple bindings', () => {
      const binding1 = { name: 'Binding1', type: 'soap' };
      const binding2 = { name: 'Binding2', type: 'http' };
      
      model.addBinding(binding1);
      model.addBinding(binding2);
      
      expect(model.bindings).toHaveLength(2);
      expect(model.bindings).toContain(binding1);
      expect(model.bindings).toContain(binding2);
    });
  });

  describe('addService', () => {
    it('should add service to services array', () => {
      const service = { name: 'TestService', port: 'TestPort' };
      
      model.addService(service);
      
      expect(model.services).toContain(service);
      expect(model.services).toHaveLength(1);
    });

    it('should add multiple services', () => {
      const service1 = { name: 'Service1', port: 'Port1' };
      const service2 = { name: 'Service2', port: 'Port2' };
      
      model.addService(service1);
      model.addService(service2);
      
      expect(model.services).toHaveLength(2);
      expect(model.services).toContain(service1);
      expect(model.services).toContain(service2);
    });
  });

  describe('toJSON', () => {
    it('should serialize WSDL-specific properties', () => {
      model.setRootName('TestService');
      model.setTargetNamespace('http://example.com/test');
      model.addBinding({ name: 'TestBinding' });
      model.addService({ name: 'TestService' });
      
      const json = model.toJSON();
      
      expect(json.protocol).toBe('wsdl');
      expect(json.version).toBe('2.0');
      expect(json.bindings).toEqual([{ name: 'TestBinding' }]);
      expect(json.services).toEqual([{ name: 'TestService' }]);
      expect(json.rootName).toBe('TestService');
      expect(json.targetNamespace).toBe('http://example.com/test');
    });

    it('should include inherited BaseModel properties', () => {
      const json = model.toJSON();
      
      expect(json).toHaveProperty('rootName');
      expect(json).toHaveProperty('xmlNamespace');
      expect(json).toHaveProperty('targetNamespace');
      expect(json).toHaveProperty('dataTypeName');
      expect(json).toHaveProperty('messageType');
      expect(json).toHaveProperty('gridData');
    });
  });

  describe('fromJSON', () => {
    it('should deserialize WSDL-specific properties', () => {
      const data = {
        protocol: 'wsdl',
        version: '1.1',
        bindings: [{ name: 'TestBinding' }],
        services: [{ name: 'TestService' }],
        rootName: 'TestService',
        targetNamespace: 'http://example.com/test'
      };
      
      model.fromJSON(data);
      
      expect(model.protocol).toBe('wsdl');
      expect(model.version).toBe('1.1');
      expect(model.bindings).toEqual([{ name: 'TestBinding' }]);
      expect(model.services).toEqual([{ name: 'TestService' }]);
      expect(model.rootName).toBe('TestService');
      expect(model.targetNamespace).toBe('http://example.com/test');
    });

    it('should use defaults for missing properties', () => {
      const data = {
        rootName: 'TestService'
      };
      
      model.fromJSON(data);
      
      expect(model.protocol).toBe('wsdl');
      expect(model.version).toBe('2.0');
      expect(model.bindings).toEqual([]);
      expect(model.services).toEqual([]);
    });

    it('should handle empty data object', () => {
      const data = {};
      
      model.fromJSON(data);
      
      expect(model.protocol).toBe('wsdl');
      expect(model.version).toBe('2.0');
      expect(model.bindings).toEqual([]);
      expect(model.services).toEqual([]);
      expect(model.rootName).toBe('');
    });

    it('should call parent fromJSON method', () => {
      const data = {
        rootName: 'TestService',
        xmlNamespace: 'http://www.w3.org/2001/XMLSchema',
        targetNamespace: 'http://example.com/test',
        dataTypeName: 'TestType',
        messageType: 'Request',
        gridData: [
          { id: 0, name: 'field1', type: 'string' }
        ]
      };
      
      model.fromJSON(data);
      
      expect(model.rootName).toBe('TestService');
      expect(model.xmlNamespace).toBe('http://www.w3.org/2001/XMLSchema');
      expect(model.targetNamespace).toBe('http://example.com/test');
      expect(model.dataTypeName).toBe('TestType');
      expect(model.messageType).toBe('Request');
      expect(model.gridData).toEqual([{ id: 0, name: 'field1', type: 'string' }]);
    });
  });

  describe('Integration with BaseModel methods', () => {
    it('should work with updateGridCell', () => {
      model.updateGridCell(0, 'name', 'testField');
      model.updateGridCell(0, 'type', 'xsd:string');
      
      expect(model.gridData[0].name).toBe('testField');
      expect(model.gridData[0].type).toBe('xsd:string');
    });

    it('should work with getFilledRows', () => {
      model.updateGridCell(0, 'name', 'field1');
      model.updateGridCell(0, 'type', 'string');
      model.updateGridCell(1, 'name', 'field2');
      model.updateGridCell(2, 'structure', 'complex');
      // Row 3 is empty
      
      const filledRows = model.getFilledRows();
      
      expect(filledRows).toHaveLength(3);
      expect(filledRows[0].name).toBe('field1');
      expect(filledRows[1].name).toBe('field2');
      expect(filledRows[2].structure).toBe('complex');
    });

    it('should work with setter methods', () => {
      model.setRootName('TestService');
      model.setXmlNamespace('http://www.w3.org/2001/XMLSchema');
      model.setTargetNamespace('http://example.com/test');
      model.setDataTypeName('TestType');
      model.setMessageType('Request');
      
      expect(model.rootName).toBe('TestService');
      expect(model.xmlNamespace).toBe('http://www.w3.org/2001/XMLSchema');
      expect(model.targetNamespace).toBe('http://example.com/test');
      expect(model.dataTypeName).toBe('TestType');
      expect(model.messageType).toBe('Request');
    });
  });
});