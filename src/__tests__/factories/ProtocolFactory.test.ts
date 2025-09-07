/**
 * ProtocolFactory 단위 테스트
 */

import { ProtocolFactory } from '../../factories/protocol-factory.js';
import { WSDLProtocol } from '../../protocols/wsdl-protocol.js';
import { BaseProtocol } from '../../protocols/base-protocol.js';
import { Logger } from '../../core/logging/Logger';

// Logger 모킹
jest.mock('../../core/logging/Logger');

describe('ProtocolFactory', () => {
  beforeEach(() => {
    // Logger 모킹 설정
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
  });

  describe('createProtocol', () => {
    it('should create WSDLProtocol instance for wsdl type', () => {
      const protocol = ProtocolFactory.createProtocol('wsdl');
      
      expect(protocol).toBeInstanceOf(WSDLProtocol);
      expect(protocol).toBeInstanceOf(BaseProtocol);
      expect(protocol.getProtocolName()).toBe('WSDL');
    });

    it('should create WSDLProtocol with custom configuration', () => {
      const config = { version: '1.1', customOption: 'test' };
      const protocol = ProtocolFactory.createProtocol('wsdl', config);
      
      expect(protocol).toBeInstanceOf(WSDLProtocol);
      expect(protocol.version).toBe('1.1');
      expect(protocol.config).toEqual(config);
    });

    it('should handle case-insensitive protocol type', () => {
      const protocols = [
        ProtocolFactory.createProtocol('WSDL'),
        ProtocolFactory.createProtocol('wsdl'),
        ProtocolFactory.createProtocol('Wsdl'),
        ProtocolFactory.createProtocol('WsDl')
      ];
      
      protocols.forEach(protocol => {
        expect(protocol).toBeInstanceOf(WSDLProtocol);
        expect(protocol.getProtocolName()).toBe('WSDL');
      });
    });

    it('should throw error for unsupported protocol types', () => {
      const unsupportedTypes = ['soap', 'jsonrpc', 'xsd', 'sap'];
      
      unsupportedTypes.forEach(type => {
        expect(() => ProtocolFactory.createProtocol(type))
          .toThrow(`${type.toUpperCase()} protocol not yet implemented`);
      });
    });

    it('should throw error for unknown protocol type', () => {
      expect(() => ProtocolFactory.createProtocol('unknown'))
        .toThrow('Unsupported protocol type: unknown');
    });

    it('should handle empty string protocol type', () => {
      expect(() => ProtocolFactory.createProtocol(''))
        .toThrow('Unsupported protocol type: ');
    });

    it('should handle null protocol type', () => {
      expect(() => ProtocolFactory.createProtocol(null as any))
        .toThrow();
    });

    it('should handle undefined protocol type', () => {
      expect(() => ProtocolFactory.createProtocol(undefined as any))
        .toThrow();
    });
  });

  describe('getSupportedProtocols', () => {
    it('should return array of supported protocol types', () => {
      const supportedProtocols = ProtocolFactory.getSupportedProtocols();
      
      expect(Array.isArray(supportedProtocols)).toBe(true);
      expect(supportedProtocols).toContain('wsdl');
      expect(supportedProtocols).toContain('soap');
      expect(supportedProtocols).toContain('jsonrpc');
      expect(supportedProtocols).toContain('xsd');
      expect(supportedProtocols).toContain('sap');
      expect(supportedProtocols).toHaveLength(5);
    });

    it('should return consistent results on multiple calls', () => {
      const protocols1 = ProtocolFactory.getSupportedProtocols();
      const protocols2 = ProtocolFactory.getSupportedProtocols();
      
      expect(protocols1).toEqual(protocols2);
    });
  });

  describe('isProtocolSupported', () => {
    it('should return true for supported protocols', () => {
      const supportedProtocols = ['wsdl', 'soap', 'jsonrpc', 'xsd', 'sap'];
      
      supportedProtocols.forEach(protocol => {
        expect(ProtocolFactory.isProtocolSupported(protocol)).toBe(true);
      });
    });

    it('should return false for unsupported protocols', () => {
      const unsupportedProtocols = ['rest', 'graphql', 'grpc', 'unknown'];
      
      unsupportedProtocols.forEach(protocol => {
        expect(ProtocolFactory.isProtocolSupported(protocol)).toBe(false);
      });
    });

    it('should handle case-insensitive protocol checking', () => {
      const variations = ['WSDL', 'wsdl', 'Wsdl', 'WsDl'];
      
      variations.forEach(variation => {
        expect(ProtocolFactory.isProtocolSupported(variation)).toBe(true);
      });
    });

    it('should handle empty string', () => {
      expect(ProtocolFactory.isProtocolSupported('')).toBe(false);
    });

    it('should handle null input', () => {
      expect(ProtocolFactory.isProtocolSupported(null as any)).toBe(false);
    });

    it('should handle undefined input', () => {
      expect(ProtocolFactory.isProtocolSupported(undefined as any)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should create functional WSDL protocol instance', () => {
      const protocol = ProtocolFactory.createProtocol('wsdl');
      
      // Test that the created protocol works correctly
      expect(protocol.getProtocolName()).toBe('WSDL');
      expect(protocol.getSupportedFeatures()).toContain('ServiceDefinition');
      
      // Test validation functionality
      const testData = {
        rootName: 'TestService',
        targetNamespace: 'http://example.com/test',
        gridData: []
      };
      
      const validation = protocol.validateStructure(testData);
      expect(validation.isValid).toBe(true);
    });

    it('should create protocol with configuration that affects behavior', () => {
      const config = { version: '1.1' };
      const protocol = ProtocolFactory.createProtocol('wsdl', config);
      
      expect(protocol.version).toBe('1.1');
    });

    it('should maintain protocol independence', () => {
      const protocol1 = ProtocolFactory.createProtocol('wsdl', { version: '1.1' });
      const protocol2 = ProtocolFactory.createProtocol('wsdl', { version: '2.0' });
      
      expect(protocol1.version).toBe('1.1');
      expect(protocol2.version).toBe('2.0');
      expect(protocol1).not.toBe(protocol2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should provide meaningful error messages', () => {
      try {
        ProtocolFactory.createProtocol('soap');
      } catch (error) {
        expect(error.message).toBe('SOAP protocol not yet implemented');
      }
      
      try {
        ProtocolFactory.createProtocol('invalidProtocol');
      } catch (error) {
        expect(error.message).toBe('Unsupported protocol type: invalidProtocol');
      }
    });

    it('should handle special characters in protocol type', () => {
      const specialCases = ['wsdl!', 'wsdl@', 'wsdl#', 'wsdl$'];
      
      specialCases.forEach(type => {
        expect(() => ProtocolFactory.createProtocol(type))
          .toThrow(`Unsupported protocol type: ${type}`);
      });
    });

    it('should handle numeric protocol type', () => {
      expect(() => ProtocolFactory.createProtocol('123'))
        .toThrow('Unsupported protocol type: 123');
    });

    it('should handle whitespace in protocol type', () => {
      expect(() => ProtocolFactory.createProtocol(' wsdl '))
        .toThrow('Unsupported protocol type:  wsdl ');
    });
  });

  describe('Future Protocol Support', () => {
    it('should be ready for SOAP protocol implementation', () => {
      expect(ProtocolFactory.getSupportedProtocols()).toContain('soap');
      expect(ProtocolFactory.isProtocolSupported('soap')).toBe(true);
      
      expect(() => ProtocolFactory.createProtocol('soap'))
        .toThrow('SOAP protocol not yet implemented');
    });

    it('should be ready for JSON-RPC protocol implementation', () => {
      expect(ProtocolFactory.getSupportedProtocols()).toContain('jsonrpc');
      expect(ProtocolFactory.isProtocolSupported('jsonrpc')).toBe(true);
      
      expect(() => ProtocolFactory.createProtocol('jsonrpc'))
        .toThrow('JSON-RPC protocol not yet implemented');
    });

    it('should be ready for XSD protocol implementation', () => {
      expect(ProtocolFactory.getSupportedProtocols()).toContain('xsd');
      expect(ProtocolFactory.isProtocolSupported('xsd')).toBe(true);
      
      expect(() => ProtocolFactory.createProtocol('xsd'))
        .toThrow('XSD protocol not yet implemented');
    });

    it('should be ready for SAP protocol implementation', () => {
      expect(ProtocolFactory.getSupportedProtocols()).toContain('sap');
      expect(ProtocolFactory.isProtocolSupported('sap')).toBe(true);
      
      expect(() => ProtocolFactory.createProtocol('sap'))
        .toThrow('SAP protocol not yet implemented');
    });
  });
});