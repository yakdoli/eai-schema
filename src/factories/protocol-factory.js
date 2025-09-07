// Protocol Factory
import { WSDLProtocol } from './wsdl-protocol.js';
import { BaseProtocol } from './base-protocol.js';

export class ProtocolFactory {
  static createProtocol(protocolType, config = {}) {
    switch (protocolType.toLowerCase()) {
      case 'wsdl':
        return new WSDLProtocol(config);
      case 'soap':
        // Placeholder for SOAP protocol
        throw new Error('SOAP protocol not yet implemented');
      case 'jsonrpc':
        // Placeholder for JSON-RPC protocol
        throw new Error('JSON-RPC protocol not yet implemented');
      case 'xsd':
        // Placeholder for XSD protocol
        throw new Error('XSD protocol not yet implemented');
      case 'sap':
        // Placeholder for SAP protocol
        throw new Error('SAP protocol not yet implemented');
      default:
        throw new Error(`Unsupported protocol type: ${protocolType}`);
    }
  }
  
  static getSupportedProtocols() {
    return ['wsdl', 'soap', 'jsonrpc', 'xsd', 'sap'];
  }
  
  static isProtocolSupported(protocolType) {
    return this.getSupportedProtocols().includes(protocolType.toLowerCase());
  }
}