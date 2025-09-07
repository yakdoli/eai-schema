// Protocol Detection Utility
export class ProtocolDetector {
  static detectProtocol(content) {
    if (!content) return null;
    
    // Check for WSDL
    if (content.includes('<definitions') && content.includes('xmlns="http://schemas.xmlsoap.org/wsdl/"')) {
      return 'wsdl';
    }
    
    // Check for SOAP
    if (content.includes('<soap:Envelope') || content.includes('xmlns:soap=')) {
      return 'soap';
    }
    
    // Check for JSON-RPC
    if (content.includes('"jsonrpc"') && (content.includes('"method"') || content.includes('"result"'))) {
      return 'jsonrpc';
    }
    
    // Check for XSD
    if (content.includes('<xs:schema') || content.includes('<xsd:schema')) {
      return 'xsd';
    }
    
    // Check for SAP-like patterns
    if (content.includes('RFC') || content.includes('IDOC') || content.includes('BAPI')) {
      return 'sap';
    }
    
    return null;
  }
  
  static detectFromExtension(filename) {
    if (!filename) return null;
    
    const ext = filename.toLowerCase();
    if (ext.endsWith('.wsdl')) return 'wsdl';
    if (ext.endsWith('.xsd')) return 'xsd';
    if (ext.endsWith('.json')) return 'jsonrpc';
    if (ext.endsWith('.xml') && filename.toLowerCase().includes('soap')) return 'soap';
    if (ext.endsWith('.rfc') || ext.endsWith('.idoc')) return 'sap';
    
    return null;
  }
}