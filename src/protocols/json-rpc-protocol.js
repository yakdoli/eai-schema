// JSON-RPC Protocol Implementation
import { BaseProtocol } from './base-protocol.js';

export class JSONRPCProtocol extends BaseProtocol {
  constructor(config = {}) {
    super(config);
    this.protocolName = 'JSON-RPC';
    this.version = config.version || '2.0';
  }

  getProtocolName() {
    return this.protocolName;
  }

  getSupportedFeatures() {
    return [
      'Request',
      'Notification',
      'BatchProcessing'
    ];
  }

  validateStructure(data) {
    const errors = [];
    if (!data.rootName || typeof data.rootName !== 'string' || data.rootName.trim() === '') {
      errors.push('Method name (Root Name) is required and must be a non-empty string.');
    }

    if (data.gridData && Array.isArray(data.gridData)) {
      data.gridData.forEach((row, index) => {
        // A parameter name is essential for JSON-RPC params.
        // A row can be empty, but it can't have a type without a name.
        const hasName = row.name && row.name.trim() !== '';
        const hasType = row.type && row.type.trim() !== '';

        if (!hasName && hasType) {
          errors.push(`Row ${index + 1}: Parameter name is required if a type is specified.`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  generateOutput(data) {
    const { rootName, gridData } = data;

    if (!rootName) {
      // Return a structured error if the method name is missing
      return JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: Method name (Root Name) is required.' },
        id: null
      }, null, 2);
    }

    // Process grid data to form a sample params object.
    // The value will be the data type specified in the grid, showing the expected structure.
    const params = {};
    if (gridData && Array.isArray(gridData)) {
      gridData.forEach(row => {
        // Only include rows that have a name.
        if (row.name) {
          params[row.name] = row.type || 'any';
        }
      });
    }

    // Generate a sample request payload.
    // A real client would replace the types with actual values and use a unique ID.
    const payload = {
      jsonrpc: '2.0',
      method: rootName,
      params: params,
      id: 1
    };

    return JSON.stringify(payload, null, 2);
  }

  parseInput(input) {
    const parsedData = {
      rootName: '',
      gridData: [],
      error: null
    };

    if (!input || typeof input !== 'string' || input.trim() === '') {
      return parsedData; // Return empty structure for empty input
    }

    try {
      const payload = JSON.parse(input);

      // Validate the basic structure of the JSON-RPC object
      if (typeof payload !== 'object' || payload === null || !payload.method) {
        throw new Error('Invalid JSON-RPC input: The "method" property is missing.');
      }

      parsedData.rootName = payload.method;

      // Handle params if they are a non-array object
      if (typeof payload.params === 'object' && payload.params !== null && !Array.isArray(payload.params)) {
        let rowIndex = 0;
        for (const key in payload.params) {
          if (Object.prototype.hasOwnProperty.call(payload.params, key)) {
            const value = payload.params[key];
            parsedData.gridData.push({
              id: rowIndex++,
              name: key,
              // The value in the sample JSON is treated as the 'type' for the grid
              type: typeof value === 'string' ? value : JSON.stringify(value),
              field: '',      // Default value
              structure: '' // Default value
            });
          }
        }
      }
      // Note: This implementation intentionally does not handle array-based params for simplicity.

    } catch (error) {
      console.error("Failed to parse JSON-RPC input:", error.message);
      // Differentiate between a JSON syntax error and a validation error.
      if (error instanceof SyntaxError) {
        parsedData.error = 'Failed to parse input. Please ensure it is valid JSON.';
      } else {
        // This is likely a custom validation error, so propagate its message.
        parsedData.error = error.message;
      }
    }

    return parsedData;
  }
}
