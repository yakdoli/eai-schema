import { JSONRPCProtocol } from '../../protocols/json-rpc-protocol';

describe('JSONRPCProtocol', () => {
  let protocol;

  beforeEach(() => {
    protocol = new JSONRPCProtocol();
  });

  describe('generateOutput', () => {
    it('should generate a valid JSON-RPC request string from valid data', () => {
      const data = {
        rootName: 'subtract',
        gridData: [
          { name: 'minuend', type: 'number' },
          { name: 'subtrahend', type: 'number' }
        ]
      };
      const result = JSON.parse(protocol.generateOutput(data));
      expect(result.jsonrpc).toBe('2.0');
      expect(result.method).toBe('subtract');
      expect(result.params).toEqual({ minuend: 'number', subtrahend: 'number' });
      expect(result.id).toBe(1);
    });

    it('should handle empty gridData', () => {
      const data = {
        rootName: 'get_time',
        gridData: []
      };
      const result = JSON.parse(protocol.generateOutput(data));
      expect(result.params).toEqual({});
    });

    it('should return an error object if rootName is missing', () => {
      const data = {
        gridData: [{ name: 'param', type: 'string' }]
      };
      const result = JSON.parse(protocol.generateOutput(data));
      expect(result.error.code).toBe(-32600);
      expect(result.error.message).toContain('Method name (Root Name) is required');
    });
  });

  describe('validateStructure', () => {
    it('should return isValid: true for valid data', () => {
      const data = {
        rootName: 'myMethod',
        gridData: [{ name: 'param1', type: 'string' }]
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should return isValid: false if rootName is missing', () => {
      const data = {
        gridData: [{ name: 'param1', type: 'string' }]
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(false);
      expect(errors[0]).toContain('Method name (Root Name) is required');
    });

    it('should return isValid: false for a row with a type but no name', () => {
      const data = {
        rootName: 'myMethod',
        gridData: [{ type: 'string' }]
      };
      const { isValid, errors } = protocol.validateStructure(data);
      expect(isValid).toBe(false);
      expect(errors[0]).toContain('Parameter name is required if a type is specified');
    });
  });

  describe('parseInput', () => {
    it('should parse a valid JSON-RPC string into the correct data structure', () => {
      const input = JSON.stringify({
        jsonrpc: '2.0',
        method: 'update',
        params: { name: 'string', age: 'number' },
        id: 10
      });
      const { rootName, gridData, error } = protocol.parseInput(input);
      expect(error).toBeNull();
      expect(rootName).toBe('update');
      expect(gridData).toHaveLength(2);
      expect(gridData[0]).toMatchObject({ name: 'name', type: 'string' });
      expect(gridData[1]).toMatchObject({ name: 'age', type: 'number' });
    });

    it('should handle invalid JSON strings gracefully', () => {
      const input = '{"jsonrpc": "2.0", "method": "foo"'; // Malformed JSON
      const { error } = protocol.parseInput(input);
      expect(error).toContain('Failed to parse input');
    });

    it('should handle JSON that is not a valid RPC request', () => {
      const input = '{"hello": "world"}';
      const { error } = protocol.parseInput(input);
      expect(error).toContain('The "method" property is missing');
    });

    it('should return an empty structure for empty input string', () => {
        const result = protocol.parseInput('');
        expect(result.rootName).toBe('');
        expect(result.gridData).toEqual([]);
        expect(result.error).toBeNull();
    });
  });
});
