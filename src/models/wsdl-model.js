// WSDL Data Model
import { BaseModel } from './base-model.js';

export class WSDLModel extends BaseModel {
  constructor() {
    super();
    this.protocol = 'wsdl';
    this.version = '2.0';
    this.bindings = [];
    this.services = [];
  }

  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];
    
    // WSDL-specific validations
    if (!this.targetNamespace) {
      errors.push('Target namespace is required for WSDL');
    }
    
    // Validate grid data for WSDL compliance
    const filledRows = this.getFilledRows();
    filledRows.forEach((row, index) => {
      if (row.name && !row.type) {
        errors.push(`Row ${index + 1}: Type is required when name is specified`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  addBinding(binding) {
    this.bindings.push(binding);
  }

  addService(service) {
    this.services.push(service);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      protocol: this.protocol,
      version: this.version,
      bindings: this.bindings,
      services: this.services
    };
  }

  fromJSON(data) {
    super.fromJSON(data);
    this.protocol = data.protocol || 'wsdl';
    this.version = data.version || '2.0';
    this.bindings = data.bindings || [];
    this.services = data.services || [];
  }
}