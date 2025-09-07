// Base Data Model
export class BaseModel {
  constructor() {
    this.rootName = '';
    this.xmlNamespace = '';
    this.targetNamespace = '';
    this.dataTypeName = '';
    this.messageType = 'Message Type';
    this.gridData = this.initializeGrid();
  }

  initializeGrid() {
    const rows = [];
    for (let i = 0; i < 50; i++) {
      rows.push({
        id: i,
        structure: '',
        field: '',
        name: '',
        type: '',
        name2: '',
        minOccurs: '0',
        maxOccurs: '1'
      });
    }
    return rows;
  }

  setRootName(name) {
    this.rootName = name;
  }

  setXmlNamespace(namespace) {
    this.xmlNamespace = namespace;
  }

  setTargetNamespace(namespace) {
    this.targetNamespace = namespace;
  }

  setDataTypeName(name) {
    this.dataTypeName = name;
  }

  setMessageType(type) {
    this.messageType = type;
  }

  updateGridCell(rowIndex, field, value) {
    if (rowIndex >= 0 && rowIndex < this.gridData.length) {
      this.gridData[rowIndex][field] = value;
    }
  }

  getFilledRows() {
    return this.gridData.filter(row => 
      row.structure || row.field || row.name || row.type || row.name2
    );
  }

  validate() {
    const errors = [];
    
    if (!this.rootName) {
      errors.push('Root name is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  toJSON() {
    return {
      rootName: this.rootName,
      xmlNamespace: this.xmlNamespace,
      targetNamespace: this.targetNamespace,
      dataTypeName: this.dataTypeName,
      messageType: this.messageType,
      gridData: this.gridData
    };
  }

  fromJSON(data) {
    this.rootName = data.rootName || '';
    this.xmlNamespace = data.xmlNamespace || '';
    this.targetNamespace = data.targetNamespace || '';
    this.dataTypeName = data.dataTypeName || '';
    this.messageType = data.messageType || 'Message Type';
    
    if (data.gridData && Array.isArray(data.gridData)) {
      this.gridData = data.gridData;
    }
  }
}