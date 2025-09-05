import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../index';
// import fs from 'fs'; // 현재 사용되지 않음
// import path from 'path'; // 현재 사용되지 않음

describe('스키마 변환 통합 테스트', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('XML 스키마 변환', () => {
    test('복잡한 XML 스키마를 JSON으로 변환', async () => {
      const complexXmlSchema = `<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="Customer">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="PersonalInfo">
                  <xs:complexType>
                    <xs:sequence>
                      <xs:element name="FirstName" type="xs:string"/>
                      <xs:element name="LastName" type="xs:string"/>
                      <xs:element name="DateOfBirth" type="xs:date"/>
                      <xs:element name="Email" type="xs:string"/>
                    </xs:sequence>
                  </xs:complexType>
                </xs:element>
                <xs:element name="Address">
                  <xs:complexType>
                    <xs:sequence>
                      <xs:element name="Street" type="xs:string"/>
                      <xs:element name="City" type="xs:string"/>
                      <xs:element name="PostalCode" type="xs:string"/>
                      <xs:element name="Country" type="xs:string"/>
                    </xs:sequence>
                  </xs:complexType>
                </xs:element>
                <xs:element name="Orders" minOccurs="0" maxOccurs="unbounded">
                  <xs:complexType>
                    <xs:sequence>
                      <xs:element name="OrderId" type="xs:int"/>
                      <xs:element name="OrderDate" type="xs:dateTime"/>
                      <xs:element name="TotalAmount" type="xs:decimal"/>
                    </xs:sequence>
                  </xs:complexType>
                </xs:element>
              </xs:sequence>
              <xs:attribute name="customerId" type="xs:string" use="required"/>
            </xs:complexType>
          </xs:element>
        </xs:schema>`;

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'xml')
        .field('targetFormat', 'json')
        .attach('file', Buffer.from(complexXmlSchema), 'complex-schema.xsd')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('json');
      
      const jsonResult = JSON.parse(response.body.result.json);
      expect(jsonResult).toHaveProperty('type', 'object');
      expect(jsonResult).toHaveProperty('properties');
      expect(jsonResult.properties).toHaveProperty('Customer');
    });

    test('WSDL 파일 처리', async () => {
      const wsdlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
                     xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
                     xmlns:tns="http://example.com/service"
                     targetNamespace="http://example.com/service">
          
          <types>
            <schema xmlns="http://www.w3.org/2001/XMLSchema"
                    targetNamespace="http://example.com/service">
              <element name="GetUserRequest">
                <complexType>
                  <sequence>
                    <element name="userId" type="string"/>
                  </sequence>
                </complexType>
              </element>
              <element name="GetUserResponse">
                <complexType>
                  <sequence>
                    <element name="user">
                      <complexType>
                        <sequence>
                          <element name="id" type="string"/>
                          <element name="name" type="string"/>
                          <element name="email" type="string"/>
                        </sequence>
                      </complexType>
                    </element>
                  </sequence>
                </complexType>
              </element>
            </schema>
          </types>
          
          <message name="GetUserRequestMessage">
            <part name="parameters" element="tns:GetUserRequest"/>
          </message>
          <message name="GetUserResponseMessage">
            <part name="parameters" element="tns:GetUserResponse"/>
          </message>
          
          <portType name="UserServicePortType">
            <operation name="GetUser">
              <input message="tns:GetUserRequestMessage"/>
              <output message="tns:GetUserResponseMessage"/>
            </operation>
          </portType>
          
          <binding name="UserServiceBinding" type="tns:UserServicePortType">
            <soap:binding transport="http://schemas.xmlsoap.org/soap/http"/>
            <operation name="GetUser">
              <soap:operation soapAction="http://example.com/service/GetUser"/>
              <input>
                <soap:body use="literal"/>
              </input>
              <output>
                <soap:body use="literal"/>
              </output>
            </operation>
          </binding>
          
          <service name="UserService">
            <port name="UserServicePort" binding="tns:UserServiceBinding">
              <soap:address location="http://example.com/service"/>
            </port>
          </service>
        </definitions>`;

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'wsdl')
        .field('targetFormat', 'json')
        .attach('file', Buffer.from(wsdlContent), 'user-service.wsdl')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('json');
    });
  });

  describe('JSON 스키마 변환', () => {
    test('OpenAPI 스키마를 XML로 변환', async () => {
      const openApiSchema = {
        openapi: '3.0.0',
        info: {
          title: 'User API',
          version: '1.0.0'
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique identifier'
                },
                name: {
                  type: 'string',
                  description: 'User name'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email address'
                },
                age: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 150
                },
                addresses: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Address'
                  }
                }
              }
            },
            Address: {
              type: 'object',
              required: ['street', 'city'],
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string', default: 'US' }
              }
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'xml')
        .attach('file', Buffer.from(JSON.stringify(openApiSchema)), 'openapi.json')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('xml');
      expect(response.body.result.xml).toContain('<?xml');
      expect(response.body.result.xml).toContain('schema');
    });

    test('JSON Schema Draft 7 변환', async () => {
      const jsonSchemaDraft7 = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'Product',
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            pattern: '^[A-Z]{2}[0-9]{6}$'
          },
          productName: {
            type: 'string',
            minLength: 1,
            maxLength: 100
          },
          price: {
            type: 'number',
            minimum: 0,
            multipleOf: 0.01
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true
          },
          dimensions: {
            type: 'object',
            properties: {
              length: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' }
            },
            required: ['length', 'width', 'height']
          }
        },
        required: ['productId', 'productName', 'price']
      };

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'yaml')
        .attach('file', Buffer.from(JSON.stringify(jsonSchemaDraft7)), 'product-schema.json')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('yaml');
      expect(response.body.result.yaml).toContain('type: object');
      expect(response.body.result.yaml).toContain('productId');
    });
  });

  describe('YAML 스키마 변환', () => {
    test('Kubernetes 리소스 스키마 변환', async () => {
      const k8sSchema = `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: example-config
          namespace: default
        data:
          database.properties: |
            host=localhost
            port=5432
            database=myapp
          app.yaml: |
            server:
              port: 8080
              host: 0.0.0.0
            logging:
              level: INFO
              file: /var/log/app.log
      `;

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'yaml')
        .field('targetFormat', 'json')
        .attach('file', Buffer.from(k8sSchema), 'k8s-configmap.yaml')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('json');
      
      const jsonResult = JSON.parse(response.body.result.json);
      expect(jsonResult).toHaveProperty('apiVersion', 'v1');
      expect(jsonResult).toHaveProperty('kind', 'ConfigMap');
    });

    test('Docker Compose 스키마 변환', async () => {
      const dockerComposeSchema = `
        version: '3.8'
        services:
          web:
            image: nginx:alpine
            ports:
              - "80:80"
            environment:
              - ENV=production
            volumes:
              - ./html:/usr/share/nginx/html:ro
            depends_on:
              - db
          db:
            image: postgres:13
            environment:
              POSTGRES_DB: myapp
              POSTGRES_USER: user
              POSTGRES_PASSWORD: password
            volumes:
              - db_data:/var/lib/postgresql/data
        volumes:
          db_data:
      `;

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'yaml')
        .field('targetFormat', 'xml')
        .attach('file', Buffer.from(dockerComposeSchema), 'docker-compose.yml')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('xml');
      expect(response.body.result.xml).toContain('<?xml');
    });
  });

  describe('대용량 스키마 처리', () => {
    test('대용량 JSON 스키마 변환', async () => {
      // 대용량 스키마 생성 (1000개 필드)
      const largeSchema = {
        type: 'object',
        properties: {}
      };

      for (let i = 0; i < 1000; i++) {
        (largeSchema.properties as any)[`field_${i}`] = {
          type: 'string',
          description: `Field number ${i}`,
          minLength: 1,
          maxLength: 100
        };
      }

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'yaml')
        .attach('file', Buffer.from(JSON.stringify(largeSchema)), 'large-schema.json')
        .timeout(30000) // 30초 타임아웃
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('yaml');
    });

    test('중첩된 복잡한 스키마 변환', async () => {
      const nestedSchema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      level4: {
                        type: 'object',
                        properties: {
                          level5: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                data: {
                                  type: 'object',
                                  additionalProperties: {
                                    type: 'string'
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'xml')
        .attach('file', Buffer.from(JSON.stringify(nestedSchema)), 'nested-schema.json')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('xml');
    });
  });

  describe('스키마 검증', () => {
    test('유효한 스키마 검증', async () => {
      const validSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer', minimum: 0 }
        },
        required: ['name']
      };

      const response = await request(app)
        .post('/api/validate')
        .send({
          schema: JSON.stringify(validSchema),
          format: 'json'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(0);
    });

    test('잘못된 스키마 검증', async () => {
      const invalidSchema = {
        type: 'invalid-type',
        properties: {
          name: { type: 'unknown-type' }
        }
      };

      const response = await request(app)
        .post('/api/validate')
        .send({
          schema: JSON.stringify(invalidSchema),
          format: 'json'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('XML 스키마 검증', async () => {
      const validXmlSchema = `<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="person">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="name" type="xs:string"/>
                <xs:element name="age" type="xs:int"/>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>`;

      const response = await request(app)
        .post('/api/validate')
        .send({
          schema: validXmlSchema,
          format: 'xml'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', true);
    });
  });

  describe('에러 처리 및 복구', () => {
    test('손상된 파일 처리', async () => {
      const corruptedContent = 'This is not a valid schema content';

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'xml')
        .attach('file', Buffer.from(corruptedContent), 'corrupted.json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('parsing');
    });

    test('지원되지 않는 형식 처리', async () => {
      const validJson = { type: 'object' };

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'unsupported')
        .field('targetFormat', 'json')
        .attach('file', Buffer.from(JSON.stringify(validJson)), 'test.json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('빈 파일 처리', async () => {
      const response = await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'xml')
        .attach('file', Buffer.from(''), 'empty.json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});