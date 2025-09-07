// XSD (XML Schema Definition) Protocol Implementation
import { BaseProtocol } from './base-protocol.js';

export class XSDProtocol extends BaseProtocol {
  constructor(config = {}) {
    super(config);
    this.protocolName = 'XSD';
  }

  getProtocolName() {
    return this.protocolName;
  }

  getSupportedFeatures() {
    return ['SchemaGeneration', 'SchemaParsing'];
  }

  validateStructure(data) {
    const errors = [];
    if (!data.rootName || !data.rootName.trim()) {
      errors.push('Root element name is required for XSD.');
    }
    if (!data.targetNamespace || !data.targetNamespace.trim()) {
      errors.push('Target namespace is required for XSD.');
    }

    if (data.gridData && Array.isArray(data.gridData)) {
      data.gridData.forEach((row, index) => {
        const hasName = row.name && row.name.trim() !== '';
        const hasType = row.type && row.type.trim() !== '';
        if (hasName && !hasType) {
          errors.push(`Row ${index + 1}: Type is required for element '${row.name}'.`);
        }
        if (!hasName && hasType) {
          errors.push(`Row ${index + 1}: Name is required if a type is specified.`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  generateOutput(data) {
    const { rootName, targetNamespace, gridData } = data;

    const validation = this.validateStructure(data);
    if (!validation.isValid) {
      // Returning a user-friendly error string.
      return `Error generating XSD: ${validation.errors.join(', ')}`;
    }

    const filledRows = gridData ? gridData.filter(row => row.name && row.type) : [];

    let xsd = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xsd += `<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"\n`;
    xsd += `            targetNamespace="${targetNamespace}"\n`;
    xsd += `            xmlns:tns="${targetNamespace}"\n`;
    xsd += `            elementFormDefault="qualified">\n\n`;

    xsd += `  <xsd:element name="${rootName}">\n`;
    xsd += `    <xsd:complexType>\n`;
    xsd += `      <xsd:sequence>\n`;

    filledRows.forEach(row => {
      const minOccurs = row.minOccurs || '1';
      const maxOccurs = row.maxOccurs || '1';
      // Assuming basic xsd types. A more complex implementation could map internal types.
      const type = row.type.startsWith('xsd:') ? row.type : `xsd:${row.type}`;
      xsd += `        <xsd:element name="${row.name}" type="${type}" minOccurs="${minOccurs}" maxOccurs="${maxOccurs}" />\n`;
    });

    xsd += `      </xsd:sequence>\n`;
    xsd += `    </xsd:complexType>\n`;
    xsd += `  </xsd:element>\n\n`;

    xsd += `</xsd:schema>`;

    return xsd;
  }

  parseInput(input) {
    console.warn('XSD parsing is a basic implementation and does not use a full XML parser.');
    const parsedData = {
      rootName: '',
      targetNamespace: '',
      gridData: [],
      error: null
    };

    if (!input) return parsedData;

    try {
      const rootNameMatch = input.match(/<xsd:element name="([^"]+)">/);
      if (rootNameMatch && rootNameMatch[1]) {
        parsedData.rootName = rootNameMatch[1];
      } else {
        throw new Error("Could not find root <xsd:element> name.");
      }

      const namespaceMatch = input.match(/targetNamespace="([^"]+)"/);
      if (namespaceMatch && namespaceMatch[1]) {
        parsedData.targetNamespace = namespaceMatch[1];
      } else {
        throw new Error("Could not find targetNamespace.");
      }

      const sequenceMatch = input.match(/<xsd:sequence>([\s\S]*?)<\/xsd:sequence>/);
      if (sequenceMatch && sequenceMatch[1]) {
        const elementRegex = /<xsd:element\s+name="([^"]+)"\s+type="([^"]+)"/g;
        let match;
        let rowIndex = 0;
        while ((match = elementRegex.exec(sequenceMatch[1])) !== null) {
          parsedData.gridData.push({
            id: rowIndex++,
            name: match[1],
            type: match[2].replace('xsd:', ''), // Store the base type
          });
        }
      }
      return parsedData;
    } catch (e) {
      parsedData.error = `Failed to parse XSD: ${e.message}`;
      return parsedData;
    }
  }
}
