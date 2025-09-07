// Base protocol class
export class BaseProtocol {
  constructor(config = {}) {
    this.config = config;
  }

  // Abstract methods to be implemented by subclasses
  validateStructure(data) {
    throw new Error('validateStructure method must be implemented by subclass');
  }

  generateOutput(data) {
    throw new Error('generateOutput method must be implemented by subclass');
  }

  parseInput(input) {
    throw new Error('parseInput method must be implemented by subclass');
  }

  getProtocolName() {
    throw new Error('getProtocolName method must be implemented by subclass');
  }

  getSupportedFeatures() {
    return [];
  }
}