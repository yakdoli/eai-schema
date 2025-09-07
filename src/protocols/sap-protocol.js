// SAP Protocol Implementation (focusing on IDoc XML)
import { BaseProtocol } from './base-protocol.js';

export class SAPProtocol extends BaseProtocol {
  constructor(config = {}) {
    super(config);
    this.protocolName = 'SAP';
  }

  getProtocolName() {
    return this.protocolName;
  }

  getSupportedFeatures() {
    return ['IDocXMLGeneration'];
  }

  validateStructure(data) {
    const errors = [];
    if (!data.rootName || !data.rootName.trim()) {
      errors.push('IDoc Type (e.g., ORDERS05) is required in the Root Name field.');
    }
    // A full implementation would validate specific control record fields.
    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  generateOutput(data) {
    const { rootName, gridData } = data; // rootName is used as the IDoc Type

    const validation = this.validateStructure(data);
    if (!validation.isValid) {
      return `Error generating IDoc: ${validation.errors.join(', ')}`;
    }

    // Default control record data - a real tool would have UI fields for these
    const controlRecord = {
      TABNAM: 'EDI_DC40',
      IDOCTYP: rootName || 'IDOCTYP_UNKNOWN',
      MESTYP: data.messageType || 'MESTYP_UNKNOWN',
      SNDPOR: 'SNDPOR',
      SNDPRT: 'LS',
      SNDPRN: 'SNDPRN',
      RCVPOR: 'RCVPOR',
      RCVPRT: 'LS',
      RCVPRN: 'RCVPRN',
    };

    let idoc = '<?xml version="1.0" encoding="UTF-8"?>\n';
    idoc += `<${rootName}>\n`;
    idoc += `  <IDOC BEGIN="1">\n`;

    // Control Record Segment
    idoc += `    <EDI_DC40 SEGMENT="1">\n`;
    for (const [key, value] of Object.entries(controlRecord)) {
      idoc += `      <${key}>${value || ''}</${key}>\n`;
    }
    idoc += `    </EDI_DC40>\n`;

    // Data Record Segment (simplified as one main segment)
    // A real implementation would handle nested segments based on grid structure.
    const dataSegmentName = `E1${rootName.substring(0, Math.max(0, rootName.length - 2))}`; // e.g., ORDERS05 -> E1ORDERS
    idoc += `    <${dataSegmentName} SEGMENT="1">\n`;
    if (gridData && Array.isArray(gridData)) {
      gridData.forEach(row => {
        if (row.name) {
          // In IDocs, fields are often fixed-length, but we'll represent as simple XML tags.
          // The 'type' from the grid is used as a placeholder for the value.
          idoc += `      <${row.name.toUpperCase()}>${row.type || ''}</${row.name.toUpperCase()}>\n`;
        }
      });
    }
    idoc += `    </${dataSegmentName}>\n`;

    idoc += `  </IDOC>\n`;
    idoc += `</${rootName}>`;

    return idoc;
  }

  parseInput(input) {
    console.warn('SAP IDoc parsing is not yet implemented.');
    return {
      rootName: '',
      gridData: [],
      error: 'SAP IDoc parsing is not yet implemented.'
    };
  }
}
