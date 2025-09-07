// Protocol Factory
import { WSDLProtocol } from '../protocols/wsdl-protocol.js';
import { JSONRPCProtocol } from '../protocols/json-rpc-protocol.js';
import { XSDProtocol } from '../protocols/xsd-protocol.js';
import { SAPProtocol } from '../protocols/sap-protocol.js';
import { BaseProtocol } from '../protocols/base-protocol.js';

export class ProtocolFactory {
  static createProtocol(protocolType, config = {}) {
    switch (protocolType.toLowerCase()) {
      case 'wsdl':
        return new WSDLProtocol(config);
      case 'soap':
        // Placeholder for SOAP protocol
        throw new Error('SOAP protocol not yet implemented');
      case 'jsonrpc':
        return new JSONRPCProtocol(config);
      case 'xsd':
        return new XSDProtocol(config);
      case 'sap':
        return new SAPProtocol(config);
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