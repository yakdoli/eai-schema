// WSDL Data Model
import { BaseModel } from './base-model.js';

export class WSDLModel extends BaseModel {
  constructor() {
    super();
    this.protocol = 'wsdl';
    this.version = '2.0';
    this.supportedVersions = ['1.1', '2.0'];
    this.bindings = [];
    this.services = [];
    this.portTypes = [];
    this.interfaces = []; // For WSDL 2.0
  }

  setVersion(version) {
    if (this.supportedVersions.includes(version)) {
      this.version = version;
    } else {
      throw new Error(`Unsupported WSDL version: ${version}. Supported versions: ${this.supportedVersions.join(', ')}`);
    }
  }

  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];
    
    // WSDL-specific validations
    if (!this.targetNamespace) {
      errors.push('Target namespace is required for WSDL');
    }
    
    // Validate WSDL version
    if (!this.supportedVersions.includes(this.version)) {
      errors.push(`Unsupported WSDL version: ${this.version}. Supported versions: ${this.supportedVersions.join(', ')}`);
    }
    
    // Validate grid data for WSDL compliance
    const filledRows = this.getFilledRows();
    filledRows.forEach((row, index) => {
      if (row.name && !row.type) {
        errors.push(`Row ${index + 1}: Type is required when name is specified`);
      }
      
      // Validate complex type references (but not for complex type definitions themselves)
      if (row.type && row.type !== 'complexType' && this.isComplexTypeReference(row.type)) {
        if (!this.complexTypeExists(row.type)) {
          errors.push(`Row ${index + 1}: Referenced complex type '${row.type}' not found`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
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

  complexTypeExists(typeName) {
    // Remove tns: prefix if present
    const cleanTypeName = typeName.startsWith('tns:') ? typeName.substring(4) : typeName;
    
    // Check if there's a row that defines this complex type
    const filledRows = this.getFilledRows();
    return filledRows.some(row => 
      row.name === cleanTypeName && 
      row.type === 'complexType'
    );
  }

  addBinding(binding) {
    this.bindings.push(binding);
  }

  addService(service) {
    this.services.push(service);
  }

  addPortType(portType) {
    this.portTypes.push(portType);
  }

  addInterface(interfaceDef) {
    this.interfaces.push(interfaceDef);
  }

  // Method to add a complex type definition
  addComplexType(name, elements = []) {
    // Add the complex type definition row
    const complexTypeRow = {
      id: this.getNextId(),
      name: name,
      type: 'complexType',
      minOccurs: '1',
      maxOccurs: '1',
      structure: '',
      field: ''
    };
    
    this.gridData.push(complexTypeRow);
    
    // Add child elements
    elements.forEach(element => {
      const elementRow = {
        id: this.getNextId(),
        name: element.name,
        type: element.type || 'xsd:string',
        minOccurs: element.minOccurs || '0',
        maxOccurs: element.maxOccurs || '1',
        structure: name, // Link to parent complex type
        field: ''
      };
      
      this.gridData.push(elementRow);
    });
  }

  // Method to get the next available ID
  getNextId() {
    const maxId = this.gridData.reduce((max, row) => Math.max(max, row.id), 0);
    return maxId + 1;
  }

  // Method to find complex type by name
  getComplexType(name) {
    const filledRows = this.getFilledRows();
    const complexTypeRow = filledRows.find(row => row.name === name && row.type === 'complexType');
    
    if (!complexTypeRow) {
      return null;
    }
    
    // Find child elements
    const childElements = filledRows.filter(row => row.structure === name && row.name);
    
    return {
      ...complexTypeRow,
      elements: childElements
    };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      protocol: this.protocol,
      version: this.version,
      bindings: this.bindings,
      services: this.services,
      portTypes: this.portTypes,
      interfaces: this.interfaces
    };
  }

  fromJSON(data) {
    super.fromJSON(data);
    this.protocol = data.protocol || 'wsdl';
    this.version = data.version || '2.0';
    this.bindings = data.bindings || [];
    this.services = data.services || [];
    this.portTypes = data.portTypes || [];
    this.interfaces = data.interfaces || [];
  }
}