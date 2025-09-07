// WSDL Protocol Implementation
import { BaseProtocol } from './base-protocol.js';

export class WSDLProtocol extends BaseProtocol {
  constructor(config = {}) {
    super(config);
    this.protocolName = 'WSDL';
    this.version = config.version || '2.0';
    this.supportedVersions = ['1.1', '2.0'];
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
      'TypesDefinition',
      'ComplexTypeDefinition',
      'SimpleTypeDefinition',
      'ElementDeclaration',
      'AttributeDeclaration'
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
    
    // Validate WSDL version
    if (this.version && !this.supportedVersions.includes(this.version)) {
      errors.push(`Unsupported WSDL version: ${this.version}. Supported versions: ${this.supportedVersions.join(', ')}`);
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
        
        // Validate complex type references (but not for complex type definitions themselves)
        if (row.type && row.type !== 'complexType' && this.isComplexTypeReference(row.type)) {
          // Check if referenced complex type exists in the model
          if (!this.complexTypeExists(row.type, data)) {
            errors.push(`Row ${index + 1}: Referenced complex type '${row.type}' not found`);
          }
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
    
    // Check for complex type references (prefixed with tns:)
    return validTypes.includes(type) || 
           type.startsWith('xsd:') || 
           type.startsWith('tns:') ||
           this.isComplexTypeReference(type);
  }

  isComplexTypeReference(type) {
    // Complex types are referenced with tns: prefix or without any prefix
    return type.startsWith('tns:') || 
           (!type.includes(':') && 
            !['string', 'int', 'integer', 'boolean', 'decimal', 'float', 'double',
              'dateTime', 'date', 'time', 'hexBinary', 'base64Binary', 'anyURI',
              'QName', 'normalizedString', 'token', 'language', 'NMTOKEN', 'Name',
              'NCName', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES', 'NOTATION'].includes(type));
  }

  complexTypeExists(typeName, data) {
    // Remove tns: prefix if present
    const cleanTypeName = typeName.startsWith('tns:') ? typeName.substring(4) : typeName;
    
    // Check if there's a row that defines this complex type
    if (data.gridData && Array.isArray(data.gridData)) {
      return data.gridData.some(row => 
        row.name === cleanTypeName && 
        row.type === 'complexType'
      );
    }
    
    return false;
  }

  generateOutput(data) {
    const { rootName, targetNamespace, xmlNamespace, gridData } = data;
    
    // Filter out empty rows
    const filledRows = gridData.filter(row => 
      row.name || row.type || row.field || row.structure
    );
    
    // Separate rows by type
    const elementRows = filledRows.filter(row => row.type && row.type !== 'complexType');
    const complexTypeRows = filledRows.filter(row => row.type === 'complexType');
    
    // Generate WSDL XML
    let wsdl = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    if (this.version === '1.1') {
      // WSDL 1.1
      wsdl += '<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"\n';
      wsdl += `             xmlns:tns="${targetNamespace}"\n`;
      wsdl += '             xmlns:xsd="http://www.w3.org/2001/XMLSchema"\n';
      wsdl += '             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"\n';
      wsdl += `             targetNamespace="${targetNamespace}"\n`;
      wsdl += `             name="${rootName}">\n\n`;
    } else {
      // WSDL 2.0 (default)
      wsdl += '<description xmlns="http://www.w3.org/ns/wsdl"\n';
      wsdl += `             xmlns:tns="${targetNamespace}"\n`;
      wsdl += '             xmlns:xsd="http://www.w3.org/2001/XMLSchema"\n';
      wsdl += '             xmlns:wsoap="http://www.w3.org/ns/wsdl/soap"\n';
      wsdl += `             targetNamespace="${targetNamespace}"\n`;
      wsdl += `             name="${rootName}">\n\n`;
    }
    
    // Types section
    if (this.version === '1.1') {
      wsdl += '  <types>\n';
      wsdl += '    <xsd:schema targetNamespace="' + targetNamespace + '">\n';
    } else {
      wsdl += '  <types>\n';
      wsdl += '    <xsd:schema targetNamespace="' + targetNamespace + '"\n';
      wsdl += '             xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n';
    }
    
    // Generate complex types first
    if (complexTypeRows.length > 0) {
      complexTypeRows.forEach(row => {
        wsdl += '      <xsd:complexType name="' + row.name + '">\n';
        wsdl += '        <xsd:sequence>\n';
        
        // Find child elements for this complex type
        const childElements = filledRows.filter(r => 
          r.structure === row.name && r.name
        );
        
        childElements.forEach(child => {
          const minOccurs = child.minOccurs || '0';
          const maxOccurs = child.maxOccurs || '1';
          const type = child.type || 'xsd:string';
          
          wsdl += '          <xsd:element name="' + child.name + '" type="' + type + '"';
          if (minOccurs !== '1') wsdl += ' minOccurs="' + minOccurs + '"';
          if (maxOccurs !== '1') wsdl += ' maxOccurs="' + maxOccurs + '"';
          wsdl += ' />\n';
        });
        
        wsdl += '        </xsd:sequence>\n';
        wsdl += '      </xsd:complexType>\n';
      });
    }
    
    // Generate root element
    if (elementRows.length > 0 || complexTypeRows.length > 0) {
      wsdl += '      <xsd:element name="' + rootName + '">\n';
      wsdl += '        <xsd:complexType>\n';
      wsdl += '          <xsd:sequence>\n';
      
      elementRows.forEach(row => {
        if (row.name && row.structure === '') { // Only top-level elements
          const minOccurs = row.minOccurs || '0';
          const maxOccurs = row.maxOccurs || '1';
          const type = row.type || 'xsd:string';
          
          wsdl += '            <xsd:element name="' + row.name + '" type="' + type + '"';
          if (minOccurs !== '1') wsdl += ' minOccurs="' + minOccurs + '"';
          if (maxOccurs !== '1') wsdl += ' maxOccurs="' + maxOccurs + '"';
          wsdl += ' />\n';
        }
      });
      
      wsdl += '          </xsd:sequence>\n';
      wsdl += '        </xsd:complexType>\n';
      wsdl += '      </xsd:element>\n';
    }
    
    wsdl += '    </xsd:schema>\n';
    wsdl += '  </types>\n\n';
    
    // Message section
    if (this.version === '1.1') {
      wsdl += '  <message name="' + rootName + 'Request">\n';
      wsdl += '    <part name="parameters" element="tns:' + rootName + '" />\n';
      wsdl += '  </message>\n\n';
      
      wsdl += '  <message name="' + rootName + 'Response">\n';
      wsdl += '    <part name="parameters" element="tns:' + rootName + '" />\n';
      wsdl += '  </message>\n\n';
    } else {
      wsdl += '  <interface name="' + rootName + 'Interface">\n';
      wsdl += '    <operation name="' + rootName + '" pattern="http://www.w3.org/ns/wsdl/in-out">\n';
      wsdl += '      <input element="tns:' + rootName + '" />\n';
      wsdl += '      <output element="tns:' + rootName + '" />\n';
      wsdl += '    </operation>\n';
      wsdl += '  </interface>\n\n';
    }
    
    // PortType/Binding section
    if (this.version === '1.1') {
      wsdl += '  <portType name="' + rootName + 'PortType">\n';
      wsdl += '    <operation name="' + rootName + '">\n';
      wsdl += '      <input message="tns:' + rootName + 'Request" />\n';
      wsdl += '      <output message="tns:' + rootName + 'Response" />\n';
      wsdl += '    </operation>\n';
      wsdl += '  </portType>\n\n';
      
      wsdl += '  <binding name="' + rootName + 'Binding" type="tns:' + rootName + 'PortType">\n';
      wsdl += '    <soap:binding transport="http://schemas.xmlsoap.org/soap/http" style="document" />\n';
      wsdl += '    <operation name="' + rootName + '">\n';
      wsdl += '      <soap:operation soapAction="' + targetNamespace + '/' + rootName + '" style="document" />\n';
      wsdl += '      <input><soap:body use="literal" /></input>\n';
      wsdl += '      <output><soap:body use="literal" /></output>\n';
      wsdl += '    </operation>\n';
      wsdl += '  </binding>\n\n';
    } else {
      wsdl += '  <binding name="' + rootName + 'Binding" interface="tns:' + rootName + 'Interface"\n';
      wsdl += '           type="http://www.w3.org/ns/wsdl/soap"\n';
      wsdl += '           wsoap:protocol="http://www.w3.org/2003/05/soap/bindings/HTTP/">\n';
      wsdl += '    <operation ref="tns:' + rootName + '" wsoap:mep="http://www.w3.org/2003/05/soap/mep/request-response" />\n';
      wsdl += '  </binding>\n\n';
    }
    
    // Service section
    if (this.version === '1.1') {
      wsdl += '  <service name="' + rootName + 'Service">\n';
      wsdl += '    <port name="' + rootName + 'Port" binding="tns:' + rootName + 'Binding">\n';
      wsdl += '      <soap:address location="http://example.com/' + rootName + '" />\n';
      wsdl += '    </port>\n';
      wsdl += '  </service>\n\n';
    } else {
      wsdl += '  <service name="' + rootName + 'Service" interface="tns:' + rootName + 'Interface">\n';
      wsdl += '    <endpoint name="' + rootName + 'Endpoint" binding="tns:' + rootName + 'Binding">\n';
      wsdl += '      <wsoap:address location="http://example.com/' + rootName + '" />\n';
      wsdl += '    </endpoint>\n';
      wsdl += '  </service>\n\n';
    }
    
    if (this.version === '1.1') {
      wsdl += '</definitions>';
    } else {
      wsdl += '</description>';
    }
    
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
    
    // Determine WSDL version
    if (input.includes('xmlns="http://schemas.xmlsoap.org/wsdl/"')) {
      this.version = '1.1';
    } else if (input.includes('xmlns="http://www.w3.org/ns/wsdl"')) {
      this.version = '2.0';
    }
    
    // Extract service name from WSDL
    let serviceNameMatch;
    if (this.version === '1.1') {
      serviceNameMatch = input.match(/<service\s+name=["']([^"']*)["']/);
    } else {
      serviceNameMatch = input.match(/<service\s+name=["']([^"']*)["']/);
    }
    
    if (serviceNameMatch) {
      parsedData.rootName = serviceNameMatch[1];
    }
    
    // Extract target namespace
    const targetNamespaceMatch = input.match(/targetNamespace=["']([^"']*)["']/);
    if (targetNamespaceMatch) {
      parsedData.targetNamespace = targetNamespaceMatch[1];
    }
    
    // Extract complex types
    const complexTypeRegex = /<xsd:complexType\s+name=["']([^"']*)["']>([\s\S]*?)<\/xsd:complexType>/g;
    let complexMatch;
    let rowIndex = 0;
    
    while ((complexMatch = complexTypeRegex.exec(input)) !== null) {
      const complexTypeName = complexMatch[1];
      const complexTypeContent = complexMatch[2];
      
      // Add the complex type definition
      parsedData.gridData.push({
        id: rowIndex++,
        name: complexTypeName,
        type: 'complexType',
        minOccurs: '1',
        maxOccurs: '1',
        structure: '',
        field: ''
      });
      
      // Extract elements within the complex type
      const innerElementRegex = /<xsd:element\s+name=["']([^"']*)["']\s+type=["']([^"']*)["']/g;
      let innerMatch;
      
      while ((innerMatch = innerElementRegex.exec(complexTypeContent)) !== null) {
        parsedData.gridData.push({
          id: rowIndex++,
          name: innerMatch[1],
          type: innerMatch[2],
          minOccurs: '0',
          maxOccurs: '1',
          structure: complexTypeName, // Link to parent complex type
          field: ''
        });
      }
    }
    
    // Extract top-level elements
    const elementRegex = /<xsd:element\s+name=["']([^"']*)["']>([\s\S]*?)<\/xsd:element>/g;
    let elementMatch;
    
    while ((elementMatch = elementRegex.exec(input)) !== null) {
      const elementName = elementMatch[1];
      const elementContent = elementMatch[2];
      
      // Skip if this is the root element we already processed
      if (elementName === parsedData.rootName) {
        continue;
      }
      
      // Check if this element has a type attribute
      const typeMatch = elementContent.match(/type=["']([^"']*)["']/);
      if (typeMatch) {
        parsedData.gridData.push({
          id: rowIndex++,
          name: elementName,
          type: typeMatch[1],
          minOccurs: '0',
          maxOccurs: '1',
          structure: '',
          field: ''
        });
      }
    }
    
    return parsedData;
  }

  // Method to add a service definition
  addServiceDefinition(data, serviceName, portName, bindingName, address) {
    // In a real implementation, this would modify the data model
    // For now, we'll just return the updated data
    return {
      ...data,
      services: [
        ...(data.services || []),
        {
          name: serviceName,
          ports: [
            {
              name: portName,
              binding: bindingName,
              address: address
            }
          ]
        }
      ]
    };
  }

  // Method to add a port type definition
  addPortTypeDefinition(data, portTypeName, operations) {
    // In a real implementation, this would modify the data model
    // For now, we'll just return the updated data
    return {
      ...data,
      portTypes: [
        ...(data.portTypes || []),
        {
          name: portTypeName,
          operations: operations
        }
      ]
    };
  }

  // Method to add a binding definition
  addBindingDefinition(data, bindingName, portTypeName, transport, style) {
    // In a real implementation, this would modify the data model
    // For now, we'll just return the updated data
    return {
      ...data,
      bindings: [
        ...(data.bindings || []),
        {
          name: bindingName,
          type: portTypeName,
          transport: transport,
          style: style
        }
      ]
    };
  }

  // Method to validate against WSDL schema
  validateAgainstSchema(wsdlContent) {
    // In a real implementation, this would use an XML schema validator
    // For now, we'll do basic structural validation
    const errors = [];
    
    // Check for required elements
    if (!wsdlContent.includes('<definitions') && !wsdlContent.includes('<description')) {
      errors.push('Missing root element: definitions or description');
    }
    
    if (!wsdlContent.includes('<types>')) {
      errors.push('Missing types section');
    }
    
    if (this.version === '1.1' && !wsdlContent.includes('<message')) {
      errors.push('Missing message section for WSDL 1.1');
    }
    
    if (this.version === '1.1' && !wsdlContent.includes('<portType')) {
      errors.push('Missing portType section for WSDL 1.1');
    }
    
    if (!wsdlContent.includes('<service')) {
      errors.push('Missing service section');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}