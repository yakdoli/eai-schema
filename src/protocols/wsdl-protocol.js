// WSDL Protocol Implementation
import { BaseProtocol } from './base-protocol.js';

export class WSDLProtocol extends BaseProtocol {
  constructor(config = {}) {
    super(config);
    this.protocolName = 'WSDL';
    this.version = config.version || '2.0';
  }

  getProtocolName() {
    return this.protocolName;
  }

  getSupportedFeatures() {
    return [
      'ServiceDefinition',
      'PortTypeDefinition',
      'BindingDefinition',
      'MessageDefinition',
      'TypesDefinition'
    ];
  }

  validateStructure(data) {
    const errors = [];
    
    // Check required fields
    if (!data.rootName) {
      errors.push('Root name is required');
    }
    
    if (!data.targetNamespace) {
      errors.push('Target namespace is required for WSDL');
    }
    
    // Validate grid data structure for WSDL
    if (data.gridData && Array.isArray(data.gridData)) {
      data.gridData.forEach((row, index) => {
        if (row.name && !row.type) {
          errors.push(`Row ${index + 1}: Type is required when name is specified`);
        }
        
        if (row.type && !this.isValidWSDLType(row.type)) {
          errors.push(`Row ${index + 1}: Invalid WSDL type '${row.type}'`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  isValidWSDLType(type) {
    const validTypes = [
      'string', 'int', 'integer', 'boolean', 'decimal', 'float', 'double',
      'dateTime', 'date', 'time', 'hexBinary', 'base64Binary', 'anyURI',
      'QName', 'normalizedString', 'token', 'language', 'NMTOKEN', 'Name',
      'NCName', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES', 'NOTATION'
    ];
    
    return validTypes.includes(type) || type.startsWith('xsd:');
  }

  generateOutput(data) {
    const { rootName, targetNamespace, xmlNamespace, gridData } = data;
    
    // Filter out empty rows
    const filledRows = gridData.filter(row => 
      row.name || row.type || row.field || row.structure
    );
    
    // Generate WSDL XML
    let wsdl = '<?xml version="1.0" encoding="UTF-8"?>
';
    wsdl += `<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
`;
    wsdl += `             xmlns:tns="${targetNamespace}"
`;
    wsdl += `             xmlns:xsd="http://www.w3.org/2001/XMLSchema"
`;
    wsdl += `             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
`;
    wsdl += `             targetNamespace="${targetNamespace}"
`;
    wsdl += `             name="${rootName}">
`;
    wsdl += `
`;
    
    // Types section
    wsdl += `  <types>
`;
    wsdl += `    <xsd:schema targetNamespace="${targetNamespace}">
`;
    
    if (filledRows.length > 0) {
      wsdl += `      <xsd:element name="${rootName}">
`;
      wsdl += `        <xsd:complexType>
`;
      wsdl += `          <xsd:sequence>
`;
      
      filledRows.forEach(row => {
        if (row.name) {
          const minOccurs = row.minOccurs || '0';
          const maxOccurs = row.maxOccurs || '1';
          const type = row.type || 'xsd:string';
          
          wsdl += `            <xsd:element name="${row.name}" type="${type}"`;
          if (minOccurs !== '1') wsdl += ` minOccurs="${minOccurs}"`;
          if (maxOccurs !== '1') wsdl += ` maxOccurs="${maxOccurs}"`;
          wsdl += ` />
`;
        }
      });
      
      wsdl += `          </xsd:sequence>
`;
      wsdl += `        </xsd:complexType>
`;
      wsdl += `      </xsd:element>
`;
    }
    
    wsdl += `    </xsd:schema>
`;
    wsdl += `  </types>
`;
    wsdl += `
`;
    
    // Message section
    wsdl += `  <message name="${rootName}Request">
`;
    wsdl += `    <part name="parameters" element="tns:${rootName}" />
`;
    wsdl += `  </message>
`;
    wsdl += `
`;
    
    wsdl += `  <message name="${rootName}Response">
`;
    wsdl += `    <part name="parameters" element="tns:${rootName}" />
`;
    wsdl += `  </message>
`;
    wsdl += `
`;
    
    // PortType section
    wsdl += `  <portType name="${rootName}PortType">
`;
    wsdl += `    <operation name="${rootName}">
`;
    wsdl += `      <input message="tns:${rootName}Request" />
`;
    wsdl += `      <output message="tns:${rootName}Response" />
`;
    wsdl += `    </operation>
`;
    wsdl += `  </portType>
`;
    wsdl += `
`;
    
    // Binding section
    wsdl += `  <binding name="${rootName}Binding" type="tns:${rootName}PortType">
`;
    wsdl += `    <soap:binding transport="http://schemas.xmlsoap.org/soap/http" style="document" />
`;
    wsdl += `    <operation name="${rootName}">
`;
    wsdl += `      <soap:operation soapAction="${targetNamespace}/${rootName}" style="document" />
`;
    wsdl += `      <input><soap:body use="literal" /></input>
`;
    wsdl += `      <output><soap:body use="literal" /></output>
`;
    wsdl += `    </operation>
`;
    wsdl += `  </binding>
`;
    wsdl += `
`;
    
    // Service section
    wsdl += `  <service name="${rootName}Service">
`;
    wsdl += `    <port name="${rootName}Port" binding="tns:${rootName}Binding">
`;
    wsdl += `      <soap:address location="http://example.com/${rootName}" />
`;
    wsdl += `    </port>
`;
    wsdl += `  </service>
`;
    wsdl += `
`;
    
    wsdl += `</definitions>`;
    
    return wsdl;
  }

  parseInput(input) {
    // Simplified WSDL parser - in a real implementation this would be more comprehensive
    // This is just for demonstration purposes
    
    const parsedData = {
      rootName: '',
      targetNamespace: '',
      xmlNamespace: '',
      gridData: []
    };
    
    // Extract service name from WSDL
    const serviceNameMatch = input.match(/<service\s+name=["']([^"']*)["']/);
    if (serviceNameMatch) {
      parsedData.rootName = serviceNameMatch[1];
    }
    
    // Extract target namespace
    const targetNamespaceMatch = input.match(/targetNamespace=["']([^"']*)["']/);
    if (targetNamespaceMatch) {
      parsedData.targetNamespace = targetNamespaceMatch[1];
    }
    
    // Extract elements (simplified)
    const elementRegex = /<xsd:element\s+name=["']([^"']*)["']\s+type=["']([^"']*)["']/g;
    let match;
    let rowIndex = 0;
    
    while ((match = elementRegex.exec(input)) !== null) {
      parsedData.gridData.push({
        id: rowIndex++,
        name: match[1],
        type: match[2],
        minOccurs: '0',
        maxOccurs: '1',
        structure: '',
        field: ''
      });
    }
    
    return parsedData;
  }
}