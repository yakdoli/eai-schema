/**
 * WSDLProtocol 단위 테스트
 */

import { WSDLProtocol } from '../../protocols/wsdl-protocol.js';
import { Logger } from '../../core/logging/Logger';

// Logger 모킹
jest.mock('../../core/logging/Logger');

describe('WSDLProtocol', () => {
  let protocol: WSDLProtocol;

  beforeEach(() => {
    // Logger 모킹 설정
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
    
    protocol = new WSDLProtocol();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const wsdlProtocol = new WSDLProtocol();
      
      expect(wsdlProtocol.getProtocolName()).toBe('WSDL');
      expect(wsdlProtocol.version).toBe('2.0');
    });

    it('should initialize with custom configuration', () => {
      const config = { version: '1.1' };
      const wsdlProtocol = new WSDLProtocol(config);
      
      expect(wsdlProtocol.version).toBe('1.1');
      expect(wsdlProtocol.config).toEqual(config);
    });
  });

  describe('getProtocolName', () => {
    it('should return WSDL as protocol name', () => {
      expect(protocol.getProtocolName()).toBe('WSDL');
    });
  });

  describe('getSupportedFeatures', () => {
    it('should return all supported WSDL features', () => {
      const features = protocol.getSupportedFeatures();
      
      expect(features).toEqual([
        'ServiceDefinition',
        'PortTypeDefinition',
        'BindingDefinition',
        'MessageDefinition',
        'TypesDefinition'
      ]);
      expect(features).toHaveLength(5);
    });
  });

  describe('isValidWSDLType', () => {
    it('should validate standard XSD types', () => {
      const validTypes = [
        'string', 'int', 'integer', 'boolean', 'decimal', 'float', 'double',
        'dateTime', 'date', 'time', 'hexBinary', 'base64Binary', 'anyURI',
        'QName', 'normalizedString', 'token', 'language', 'NMTOKEN', 'Name',
        'NCName', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES', 'NOTATION'
      ];

      validTypes.forEach(type => {
        expect(protocol.isValidWSDLType(type)).toBe(true);
      });
    });

    it('should validate XSD prefixed types', () => {
      const xsdTypes = ['xsd:string', 'xsd:int', 'xsd:boolean', 'xsd:dateTime'];
      
      xsdTypes.forEach(type => {
        expect(protocol.isValidWSDLType(type)).toBe(true);
      });
    });

    it('should reject invalid types', () => {
      const invalidTypes = ['invalidType', 'customType', '', null, undefined];
      
      invalidTypes.forEach(type => {
        expect(protocol.isValidWSDLType(type)).toBe(false);
      });
    });
  });

  describe('validateStructure', () => {
    const validData = {
      rootName: 'UserService',
      targetNamespace: 'http://example.com/userservice',
      gridData: [
        {
          id: 0,
          name: 'userId',
          type: 'xsd:int',
          minOccurs: '1',
          maxOccurs: '1'
        },
        {
          id: 1,
          name: 'userName',
          type: 'xsd:string',
          minOccurs: '1',
          maxOccurs: '1'
        }
      ]
    };

    it('should validate correct WSDL structure', () => {
      const result = protocol.validateStructure(validData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should require root name', () => {
      const invalidData = { ...validData, rootName: '' };
      const result = protocol.validateStructure(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Root name is required');
    });

    it('should require target namespace', () => {
      const invalidData = { ...validData, targetNamespace: '' };
      const result = protocol.validateStructure(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target namespace is required for WSDL');
    });

    it('should validate grid data - require type when name is specified', () => {
      const invalidData = {
        ...validData,
        gridData: [
          { id: 0, name: 'userId', type: '' } // Missing type
        ]
      };
      const result = protocol.validateStructure(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Row 1: Type is required when name is specified');
    });

    it('should validate WSDL types in grid data', () => {
      const invalidData = {
        ...validData,
        gridData: [
          { id: 0, name: 'userId', type: 'invalidType' }
        ]
      };
      const result = protocol.validateStructure(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Row 1: Invalid WSDL type 'invalidType'");
    });

    it('should handle empty grid data', () => {
      const dataWithEmptyGrid = { ...validData, gridData: [] };
      const result = protocol.validateStructure(dataWithEmptyGrid);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle null grid data', () => {
      const dataWithNullGrid = { ...validData, gridData: null };
      const result = protocol.validateStructure(dataWithNullGrid);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('generateOutput', () => {
    const testData = {
      rootName: 'UserService',
      targetNamespace: 'http://example.com/userservice',
      xmlNamespace: 'http://www.w3.org/2001/XMLSchema',
      gridData: [
        {
          id: 0,
          name: 'userId',
          type: 'xsd:int',
          minOccurs: '1',
          maxOccurs: '1',
          structure: '',
          field: ''
        },
        {
          id: 1,
          name: 'userName',
          type: 'xsd:string',
          minOccurs: '0',
          maxOccurs: '1',
          structure: '',
          field: ''
        },
        {
          id: 2,
          name: '',
          type: '',
          structure: '',
          field: '' // Empty row - should be filtered out
        }
      ]
    };

    it('should generate valid WSDL XML structure', () => {
      const result = protocol.generateOutput(testData);
      
      // Check XML declaration
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      
      // Check definitions element with namespaces
      expect(result).toContain('<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"');
      expect(result).toContain('targetNamespace="http://example.com/userservice"');
      expect(result).toContain('name="UserService"');
      
      // Check closing tag
      expect(result).toContain('</definitions>');
    });

    it('should include types section with XSD schema', () => {
      const result = protocol.generateOutput(testData);
      
      expect(result).toContain('<types>');
      expect(result).toContain('<xsd:schema targetNamespace="http://example.com/userservice">');
      expect(result).toContain('</types>');
    });

    it('should generate XSD elements for grid data', () => {
      const result = protocol.generateOutput(testData);
      
      // Check for userId element
      expect(result).toContain('<xsd:element name="userId" type="xsd:int" minOccurs="1"');
      
      // Check for userName element with minOccurs="0"
      expect(result).toContain('<xsd:element name="userName" type="xsd:string" minOccurs="0"');
    });

    it('should filter out empty rows', () => {
      const result = protocol.generateOutput(testData);
      
      // Should only contain elements for filled rows (userId and userName)
      const elementMatches = result.match(/<xsd:element name=/g);
      expect(elementMatches).toHaveLength(2);
    });

    it('should generate message definitions', () => {
      const result = protocol.generateOutput(testData);
      
      expect(result).toContain('<message name="UserServiceRequest">');
      expect(result).toContain('<message name="UserServiceResponse">');
      expect(result).toContain('<part name="parameters" element="tns:UserService"');
    });

    it('should generate portType definition', () => {
      const result = protocol.generateOutput(testData);
      
      expect(result).toContain('<portType name="UserServicePortType">');
      expect(result).toContain('<operation name="UserService">');
      expect(result).toContain('<input message="tns:UserServiceRequest"');
      expect(result).toContain('<output message="tns:UserServiceResponse"');
    });

    it('should generate binding definition', () => {
      const result = protocol.generateOutput(testData);
      
      expect(result).toContain('<binding name="UserServiceBinding" type="tns:UserServicePortType">');
      expect(result).toContain('<soap:binding transport="http://schemas.xmlsoap.org/soap/http" style="document"');
      expect(result).toContain('<soap:operation soapAction="http://example.com/userservice/UserService"');
    });

    it('should generate service definition', () => {
      const result = protocol.generateOutput(testData);
      
      expect(result).toContain('<service name="UserServiceService">');
      expect(result).toContain('<port name="UserServicePort" binding="tns:UserServiceBinding">');
      expect(result).toContain('<soap:address location="http://example.com/UserService"');
    });

    it('should handle empty grid data gracefully', () => {
      const emptyData = { ...testData, gridData: [] };
      const result = protocol.generateOutput(emptyData);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<definitions');
      expect(result).toContain('</definitions>');
      
      // Should still have basic structure but no elements
      expect(result).not.toContain('<xsd:element');
    });

    it('should use default values for missing attributes', () => {
      const dataWithDefaults = {
        ...testData,
        gridData: [
          {
            id: 0,
            name: 'testField',
            type: '', // Should default to xsd:string
            minOccurs: '', // Should default to '0'
            maxOccurs: '', // Should default to '1'
            structure: '',
            field: ''
          }
        ]
      };
      
      const result = protocol.generateOutput(dataWithDefaults);
      expect(result).toContain('type="xsd:string"');
    });
  });

  describe('parseInput', () => {
    const sampleWSDL = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             targetNamespace="http://example.com/userservice"
             name="UserService">
  <types>
    <xsd:schema targetNamespace="http://example.com/userservice">
      <xsd:element name="userId" type="xsd:int"/>
      <xsd:element name="userName" type="xsd:string"/>
    </xsd:schema>
  </types>
  <service name="UserService">
  </service>
</definitions>`;

    it('should parse service name from WSDL', () => {
      const result = protocol.parseInput(sampleWSDL);
      
      expect(result.rootName).toBe('UserService');
    });

    it('should parse target namespace from WSDL', () => {
      const result = protocol.parseInput(sampleWSDL);
      
      expect(result.targetNamespace).toBe('http://example.com/userservice');
    });

    it('should parse XSD elements into grid data', () => {
      const result = protocol.parseInput(sampleWSDL);
      
      expect(result.gridData).toHaveLength(2);
      
      expect(result.gridData[0]).toEqual({
        id: 0,
        name: 'userId',
        type: 'xsd:int',
        minOccurs: '0',
        maxOccurs: '1',
        structure: '',
        field: ''
      });
      
      expect(result.gridData[1]).toEqual({
        id: 1,
        name: 'userName',
        type: 'xsd:string',
        minOccurs: '0',
        maxOccurs: '1',
        structure: '',
        field: ''
      });
    });

    it('should handle malformed WSDL gracefully', () => {
      const malformedWSDL = '<invalid>xml</invalid>';
      const result = protocol.parseInput(malformedWSDL);
      
      expect(result.rootName).toBe('');
      expect(result.targetNamespace).toBe('');
      expect(result.gridData).toEqual([]);
    });

    it('should handle empty input', () => {
      const result = protocol.parseInput('');
      
      expect(result.rootName).toBe('');
      expect(result.targetNamespace).toBe('');
      expect(result.gridData).toEqual([]);
    });

    it('should handle WSDL without service name', () => {
      const wsdlWithoutService = `<?xml version="1.0" encoding="UTF-8"?>
<definitions targetNamespace="http://example.com/test">
</definitions>`;
      
      const result = protocol.parseInput(wsdlWithoutService);
      
      expect(result.rootName).toBe('');
      expect(result.targetNamespace).toBe('http://example.com/test');
    });

    it('should handle WSDL without target namespace', () => {
      const wsdlWithoutNamespace = `<?xml version="1.0" encoding="UTF-8"?>
<definitions>
  <service name="TestService"></service>
</definitions>`;
      
      const result = protocol.parseInput(wsdlWithoutNamespace);
      
      expect(result.rootName).toBe('TestService');
      expect(result.targetNamespace).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle null input in parseInput', () => {
      expect(() => protocol.parseInput(null as any)).not.toThrow();
      const result = protocol.parseInput(null as any);
      expect(result.gridData).toEqual([]);
    });

    it('should handle undefined input in parseInput', () => {
      expect(() => protocol.parseInput(undefined as any)).not.toThrow();
      const result = protocol.parseInput(undefined as any);
      expect(result.gridData).toEqual([]);
    });

    it('should handle null data in validateStructure', () => {
      expect(() => protocol.validateStructure(null as any)).not.toThrow();
      const result = protocol.validateStructure(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null data in generateOutput', () => {
      expect(() => protocol.generateOutput(null as any)).not.toThrow();
    });
  });
});