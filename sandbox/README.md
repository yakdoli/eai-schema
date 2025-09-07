# Sandbox Testing Environment

This directory is for testing potentially unstable code in isolation from the main project.

## Setup

1. Copy the files you want to test here:
   ```bash
   cp -r ../src/protocols ./protocols
   cp -r ../src/models ./models
   cp -r ../src/factories ./factories
   cp -r ../src/utils ./utils
   ```

2. Create a test file:
   ```bash
   touch test-example.js
   ```

3. Run your tests:
   ```bash
   node test-example.js
   ```

## Example Test File

```javascript
// test-example.js
import { WSDLProtocol } from './protocols/wsdl-protocol.js';
import { ProtocolFactory } from './factories/protocol-factory.js';

// Test WSDL protocol
const wsdlProtocol = new WSDLProtocol();

const testData = {
  rootName: 'TestService',
  targetNamespace: 'http://example.com/test',
  gridData: [
    { id: 0, name: 'id', type: 'xsd:int', minOccurs: '1', maxOccurs: '1' },
    { id: 1, name: 'name', type: 'xsd:string', minOccurs: '1', maxOccurs: '1' }
  ]
};

// Test generation
const wsdlOutput = wsdlProtocol.generateOutput(testData);
console.log('Generated WSDL:');
console.log(wsdlOutput);

// Test validation
const validationResult = wsdlProtocol.validateStructure(testData);
console.log('Validation result:', validationResult);

// Test factory
const protocol = ProtocolFactory.createProtocol('wsdl');
console.log('Factory created protocol:', protocol.getProtocolName());
```

## Cleanup

When you're done testing, you can remove this directory:
```bash
cd ..
rm -rf sandbox
```