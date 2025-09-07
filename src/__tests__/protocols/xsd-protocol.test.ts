import { XSDProtocol } from '../../protocols/xsd-protocol';

describe('XSDProtocol', () => {
  let protocol;

  beforeEach(() => {
    protocol = new XSDProtocol();
  });

  describe('generateOutput', () => {
    it('should generate a valid XSD string from valid data', () => {
      const data = {
        rootName: 'TestElement',
        targetNamespace: 'http://test.com',
        gridData: [
          { name: 'field1', type: 'string' },
          { name: 'field2', type: 'int', minOccurs: '0', maxOccurs: 'unbounded' }
        ]
      };
      const result = protocol.generateOutput(data);
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<xsd:schema');
      expect(result).toContain('targetNamespace="http://test.com"');
      expect(result).toContain('<xsd:element name="TestElement"');
      expect(result).toContain('name="field1" type="xsd:string"');
      expect(result).toContain('name="field2" type="xsd:int" minOccurs="0" maxOccurs="unbounded"');
    });

    it('should return an error string if validation fails', () => {
      const data = {
        rootName: '', // Missing rootName
        targetNamespace: 'http://test.com',
        gridData: []
      };
      const result = protocol.generateOutput(data);
      expect(result).toContain('Error generating XSD:');
      expect(result).toContain('Root element name is required for XSD.');
    });
  });

  describe('validateStructure', () => {
    it('should return isValid: true for valid data', () => {
      const data = {
        rootName: 'Test',
        targetNamespace: 'http://test.com',
        gridData: [{ name: 'field1', type: 'string' }]
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should return isValid: false if rootName is missing', () => {
      const data = {
        rootName: '',
        targetNamespace: 'http://test.com'
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(false);
      expect(errors[0]).toContain('Root element name is required');
    });

     it('should return isValid: false if targetNamespace is missing', () => {
      const data = {
        rootName: 'Test',
        targetNamespace: ''
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(false);
      expect(errors[0]).toContain('Target namespace is required');
    });
  });

  describe('parseInput', () => {
    it('should parse a valid XSD string into the correct data structure', () => {
      const input = `
        <?xml version="1.0" encoding="UTF-8"?>
        <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                    targetNamespace="http://example.com/user"
                    xmlns:tns="http://example.com/user"
                    elementFormDefault="qualified">
          <xsd:element name="UserRequest">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element name="username" type="xsd:string" />
                <xsd:element name="age" type="xsd:integer" />
              </xsd:sequence>
            </xsd:complexType>
          </xsd:element>
        </xsd:schema>
      `;
      const { rootName, targetNamespace, gridData, error } = protocol.parseInput(input);
      expect(error).toBeNull();
      expect(rootName).toBe('UserRequest');
      expect(targetNamespace).toBe('http://example.com/user');
      expect(gridData).toHaveLength(2);
      expect(gridData[0]).toMatchObject({ name: 'username', type: 'string' });
      expect(gridData[1]).toMatchObject({ name: 'age', type: 'integer' });
    });

    it('should return an error for malformed XSD input', () => {
      const input = '<xsd:schema></xsd:schema>'; // Missing required attributes
      const { error } = protocol.parseInput(input);
      expect(error).not.toBeNull();
      expect(error).toContain('Failed to parse XSD');
    });
  });
});
