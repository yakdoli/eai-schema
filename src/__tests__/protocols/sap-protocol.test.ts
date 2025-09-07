import { SAPProtocol } from '../../protocols/sap-protocol';

describe('SAPProtocol', () => {
  let protocol;

  beforeEach(() => {
    protocol = new SAPProtocol();
  });

  describe('generateOutput', () => {
    it('should generate a basic IDoc XML structure', () => {
      const data = {
        rootName: 'ORDERS05',
        messageType: 'ORDERS',
        gridData: [
          { name: 'E1EDK01', type: 'SegmentData' },
          { name: 'E1EDP01', type: 'SegmentData' }
        ]
      };
      const result = protocol.generateOutput(data);
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<ORDERS05>');
      expect(result).toContain('<IDOC BEGIN="1">');
      expect(result).toContain('<EDI_DC40 SEGMENT="1">');
      expect(result).toContain('<IDOCTYP>ORDERS05</IDOCTYP>');
      expect(result).toContain('<MESTYP>ORDERS</MESTYP>');
      expect(result).toContain('<E1ORDERS SEGMENT="1">');
      expect(result).toContain('<E1EDK01>SegmentData</E1EDK01>');
      expect(result).toContain('<E1EDP01>SegmentData</E1EDP01>');
      expect(result).toContain('</IDOC>');
      expect(result).toContain('</ORDERS05>');
    });

    it('should return an error string if validation fails', () => {
      const data = {
        rootName: '', // Missing IDoc Type
      };
      const result = protocol.generateOutput(data);
      expect(result).toContain('Error generating IDoc:');
      expect(result).toContain('IDoc Type (e.g., ORDERS05) is required');
    });
  });

  describe('validateStructure', () => {
    it('should return isValid: true for valid data', () => {
      const data = {
        rootName: 'ORDERS05',
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should return isValid: false if rootName is missing', () => {
      const data = {
        rootName: '',
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(false);
      expect(errors[0]).toContain('IDoc Type (e.g., ORDERS05) is required');
    });
  });

  describe('parseInput', () => {
    it('should return a "not implemented" error', () => {
      const { error } = protocol.parseInput('');
      expect(error).toContain('SAP IDoc parsing is not yet implemented.');
    });
  });
});
