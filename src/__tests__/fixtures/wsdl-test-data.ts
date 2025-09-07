/**
 * WSDL 테스트용 픽스처 데이터
 */

export const validWSDLData = {
  rootName: 'UserService',
  targetNamespace: 'http://example.com/userservice',
  xmlNamespace: 'http://www.w3.org/2001/XMLSchema',
  gridData: [
    {
      id: 0,
      name: 'userId',
      type: 'xsd:int',
      minOccurs: '1',
      maxOccurs: '1',
      structure: '',
      field: ''
    },
    {
      id: 1,
      name: 'userName',
      type: 'xsd:string',
      minOccurs: '1',
      maxOccurs: '1',
      structure: '',
      field: ''
    },
    {
      id: 2,
      name: 'userEmail',
      type: 'xsd:string',
      minOccurs: '0',
      maxOccurs: '1',
      structure: '',
      field: ''
    },
    {
      id: 3,
      name: 'isActive',
      type: 'xsd:boolean',
      minOccurs: '0',
      maxOccurs: '1',
      structure: '',
      field: ''
    }
  ]
};

export const invalidWSDLData = {
  rootName: '', // Missing root name
  targetNamespace: '', // Missing target namespace
  gridData: [
    {
      id: 0,
      name: 'invalidField',
      type: '', // Missing type
      minOccurs: '1',
      maxOccurs: '1',
      structure: '',
      field: ''
    }
  ]
};

export const complexWSDLData = {
  rootName: 'OrderService',
  targetNamespace: 'http://example.com/orderservice',
  xmlNamespace: 'http://www.w3.org/2001/XMLSchema',
  gridData: [
    {
      id: 0,
      name: 'orderId',
      type: 'xsd:long',
      minOccurs: '1',
      maxOccurs: '1',
      structure: '',
      field: ''
    },
    {
      id: 1,
      name: 'customerInfo',
      type: 'tns:CustomerType',
      minOccurs: '1',
      maxOccurs: '1',
      structure: 'complex',
      field: ''
    },
    {
      id: 2,
      name: 'orderItems',
      type: 'tns:OrderItemType',
      minOccurs: '0',
      maxOccurs: 'unbounded',
      structure: 'array',
      field: ''
    },
    {
      id: 3,
      name: 'orderDate',
      type: 'xsd:dateTime',
      minOccurs: '1',
      maxOccurs: '1',
      structure: '',
      field: ''
    },
    {
      id: 4,
      name: 'totalAmount',
      type: 'xsd:decimal',
      minOccurs: '1',
      maxOccurs: '1',
      structure: '',
      field: ''
    }
  ]
};

export const sampleWSDLInput = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:tns="http://example.com/userservice"
             xmlns:xsd="http://www.w3.org/2001/XMLSchema"
             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
             targetNamespace="http://example.com/userservice"
             name="UserService">

  <types>
    <xsd:schema targetNamespace="http://example.com/userservice">
      <xsd:element name="UserService">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="userId" type="xsd:int" minOccurs="1"/>
            <xsd:element name="userName" type="xsd:string" minOccurs="1"/>
            <xsd:element name="userEmail" type="xsd:string" minOccurs="0"/>
            <xsd:element name="isActive" type="xsd:boolean" minOccurs="0"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="UserServiceRequest">
    <part name="parameters" element="tns:UserService" />
  </message>

  <message name="UserServiceResponse">
    <part name="parameters" element="tns:UserService" />
  </message>

  <portType name="UserServicePortType">
    <operation name="UserService">
      <input message="tns:UserServiceRequest" />
      <output message="tns:UserServiceResponse" />
    </operation>
  </portType>

  <binding name="UserServiceBinding" type="tns:UserServicePortType">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http" style="document" />
    <operation name="UserService">
      <soap:operation soapAction="http://example.com/userservice/UserService" style="document" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
  </binding>

  <service name="UserService">
    <port name="UserServicePort" binding="tns:UserServiceBinding">
      <soap:address location="http://example.com/UserService" />
    </port>
  </service>

</definitions>`;

export const malformedWSDLInput = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             targetNamespace="http://example.com/broken">
  <types>
    <xsd:schema>
      <!-- Missing closing tags and malformed structure -->
      <xsd:element name="brokenElement" type="xsd:string"
  </types>
</definitions`;

export const minimalWSDLInput = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             targetNamespace="http://example.com/minimal"
             name="MinimalService">
</definitions>`;

export const wsdlWithoutNamespace = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             name="NoNamespaceService">
  <service name="TestService">
  </service>
</definitions>`;

export const wsdlWithoutServiceName = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             targetNamespace="http://example.com/noservice">
  <types>
    <xsd:schema targetNamespace="http://example.com/noservice">
      <xsd:element name="testElement" type="xsd:string"/>
    </xsd:schema>
  </types>
</definitions>`;

export const validXSDTypes = [
  'string', 'int', 'integer', 'boolean', 'decimal', 'float', 'double',
  'dateTime', 'date', 'time', 'hexBinary', 'base64Binary', 'anyURI',
  'QName', 'normalizedString', 'token', 'language', 'NMTOKEN', 'Name',
  'NCName', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES', 'NOTATION',
  'xsd:string', 'xsd:int', 'xsd:boolean', 'xsd:dateTime'
];

export const invalidXSDTypes = [
  'invalidType', 'customType', 'unknownType', '', null, undefined,
  'varchar', 'text', 'blob', 'json'
];

export const edgeCaseGridData = [
  // Empty row
  {
    id: 0,
    name: '',
    type: '',
    minOccurs: '',
    maxOccurs: '',
    structure: '',
    field: ''
  },
  // Row with only name (should trigger validation error)
  {
    id: 1,
    name: 'fieldWithoutType',
    type: '',
    minOccurs: '1',
    maxOccurs: '1',
    structure: '',
    field: ''
  },
  // Row with special characters
  {
    id: 2,
    name: 'field_with_underscore',
    type: 'xsd:string',
    minOccurs: '0',
    maxOccurs: 'unbounded',
    structure: '',
    field: ''
  },
  // Row with unicode characters
  {
    id: 3,
    name: 'フィールド名',
    type: 'xsd:string',
    minOccurs: '1',
    maxOccurs: '1',
    structure: '',
    field: ''
  }
];

export const performanceTestData = {
  rootName: 'LargeService',
  targetNamespace: 'http://example.com/large',
  xmlNamespace: 'http://www.w3.org/2001/XMLSchema',
  gridData: Array.from({ length: 1000 }, (_, index) => ({
    id: index,
    name: `field${index}`,
    type: 'xsd:string',
    minOccurs: '0',
    maxOccurs: '1',
    structure: '',
    field: ''
  }))
};

export const expectedWSDLOutput = {
  containsXMLDeclaration: '<?xml version="1.0" encoding="UTF-8"?>',
  containsDefinitionsStart: '<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"',
  containsTargetNamespace: 'targetNamespace="http://example.com/userservice"',
  containsTypesSection: '<types>',
  containsSchemaSection: '<xsd:schema targetNamespace="http://example.com/userservice">',
  containsMessageSection: '<message name="UserServiceRequest">',
  containsPortTypeSection: '<portType name="UserServicePortType">',
  containsBindingSection: '<binding name="UserServiceBinding"',
  containsServiceSection: '<service name="UserServiceService">',
  containsDefinitionsEnd: '</definitions>'
};

export const testConfigurations = [
  { version: '1.1' },
  { version: '2.0' },
  { version: '2.0', customOption: 'test' },
  {}
];