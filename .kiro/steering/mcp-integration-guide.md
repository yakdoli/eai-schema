# EAI Schema Toolkit - MCP 통합 및 확장성 지침

## MCP (Model Context Protocol) 통합 개요

EAI Schema Toolkit은 MCP 프레임워크를 통해 외부 도구 및 서비스와의 통합을 지원합니다. 이 지침은 새로운 MCP 프로바이더 개발과 기존 시스템 확장에 대한 가이드를 제공합니다.

## MCP 아키텍처 원칙

### 1. 프로바이더 패턴
```typescript
// MCP 프로바이더 인터페이스 정의
export interface IMCPProvider {
  readonly name: string;
  readonly version: string;
  readonly capabilities: MCPCapability[];
  
  initialize(config: MCPConfig): Promise<void>;
  execute(request: MCPRequest): Promise<MCPResponse>;
  cleanup(): Promise<void>;
}

// 기본 프로바이더 구현
export abstract class BaseMCPProvider implements IMCPProvider {
  protected logger = Logger.getInstance();
  protected isInitialized = false;
  
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: MCPCapability[];
  
  async initialize(config: MCPConfig): Promise<void> {
    this.logger.info(`MCP 프로바이더 초기화 시작: ${this.name}`);
    await this.doInitialize(config);
    this.isInitialized = true;
    this.logger.info(`MCP 프로바이더 초기화 완료: ${this.name}`);
  }
  
  protected abstract doInitialize(config: MCPConfig): Promise<void>;
  
  async execute(request: MCPRequest): Promise<MCPResponse> {
    if (!this.isInitialized) {
      throw new MCPError('프로바이더가 초기화되지 않았습니다');
    }
    
    this.logger.debug('MCP 요청 처리', { 
      provider: this.name, 
      operation: request.operation 
    });
    
    return await this.doExecute(request);
  }
  
  protected abstract doExecute(request: MCPRequest): Promise<MCPResponse>;
}
```

### 2. 스키마 변환 프로바이더 예시
```typescript
export class SchemaTransformationProvider extends BaseMCPProvider {
  readonly name = 'schema-transformation';
  readonly version = '1.0.0';
  readonly capabilities: MCPCapability[] = [
    MCPCapability.SCHEMA_CONVERSION,
    MCPCapability.SCHEMA_VALIDATION,
    MCPCapability.FORMAT_DETECTION
  ];
  
  private transformationService: SchemaTransformationService;
  
  protected async doInitialize(config: MCPConfig): Promise<void> {
    this.transformationService = new SchemaTransformationService(config.transformation);
  }
  
  protected async doExecute(request: MCPRequest): Promise<MCPResponse> {
    switch (request.operation) {
      case 'convert':
        return await this.handleConversion(request);
      case 'validate':
        return await this.handleValidation(request);
      case 'detect-format':
        return await this.handleFormatDetection(request);
      default:
        throw new MCPError(`지원되지 않는 작업: ${request.operation}`);
    }
  }
  
  private async handleConversion(request: MCPRequest): Promise<MCPResponse> {
    const { sourceFormat, targetFormat, content } = request.params;
    
    try {
      const result = await this.transformationService.convert({
        from: sourceFormat,
        to: targetFormat,
        content
      });
      
      return {
        success: true,
        data: {
          convertedContent: result.content,
          metadata: result.metadata
        }
      };
    } catch (error) {
      this.logger.error('스키마 변환 실패', { error: error.message });
      throw new MCPError('스키마 변환에 실패했습니다', error);
    }
  }
}
```

## 외부 도구 통합 가이드

### 1. Atlassian 도구 통합
```typescript
export class AtlassianMCPProvider extends BaseMCPProvider {
  readonly name = 'atlassian-integration';
  readonly version = '1.0.0';
  readonly capabilities = [
    MCPCapability.ISSUE_TRACKING,
    MCPCapability.DOCUMENTATION,
    MCPCapability.COLLABORATION
  ];
  
  private jiraClient: JiraClient;
  private confluenceClient: ConfluenceClient;
  
  protected async doInitialize(config: MCPConfig): Promise<void> {
    this.jiraClient = new JiraClient({
      host: config.atlassian.jiraHost,
      username: config.atlassian.username,
      password: config.atlassian.apiToken
    });
    
    this.confluenceClient = new ConfluenceClient({
      host: config.atlassian.confluenceHost,
      username: config.atlassian.username,
      password: config.atlassian.apiToken
    });
  }
  
  protected async doExecute(request: MCPRequest): Promise<MCPResponse> {
    switch (request.operation) {
      case 'create-issue':
        return await this.createJiraIssue(request);
      case 'update-documentation':
        return await this.updateConfluencePage(request);
      case 'sync-schema-changes':
        return await this.syncSchemaChanges(request);
      default:
        throw new MCPError(`지원되지 않는 작업: ${request.operation}`);
    }
  }
  
  private async createJiraIssue(request: MCPRequest): Promise<MCPResponse> {
    const { projectKey, issueType, summary, description, schemaInfo } = request.params;
    
    const issue = await this.jiraClient.addNewIssue({
      fields: {
        project: { key: projectKey },
        issuetype: { name: issueType },
        summary,
        description: this.formatDescriptionWithSchema(description, schemaInfo)
      }
    });
    
    return {
      success: true,
      data: {
        issueKey: issue.key,
        issueUrl: `${this.jiraClient.host}/browse/${issue.key}`
      }
    };
  }
  
  private formatDescriptionWithSchema(description: string, schemaInfo: any): string {
    return `
${description}

h3. 스키마 정보
* 스키마 타입: ${schemaInfo.type}
* 파일명: ${schemaInfo.fileName}
* 크기: ${schemaInfo.size} bytes
* 검증 상태: ${schemaInfo.isValid ? '✅ 유효' : '❌ 오류'}

{code:title=스키마 내용}
${schemaInfo.content.substring(0, 1000)}${schemaInfo.content.length > 1000 ? '...' : ''}
{code}
    `;
  }
}
```

### 2. GitHub 통합
```typescript
export class GitHubMCPProvider extends BaseMCPProvider {
  readonly name = 'github-integration';
  readonly version = '1.0.0';
  readonly capabilities = [
    MCPCapability.VERSION_CONTROL,
    MCPCapability.CODE_REVIEW,
    MCPCapability.ISSUE_TRACKING
  ];
  
  private octokit: Octokit;
  
  protected async doInitialize(config: MCPConfig): Promise<void> {
    this.octokit = new Octokit({
      auth: config.github.token
    });
  }
  
  protected async doExecute(request: MCPRequest): Promise<MCPResponse> {
    switch (request.operation) {
      case 'create-pull-request':
        return await this.createPullRequest(request);
      case 'update-schema-repository':
        return await this.updateSchemaRepository(request);
      case 'create-release':
        return await this.createRelease(request);
      default:
        throw new MCPError(`지원되지 않는 작업: ${request.operation}`);
    }
  }
  
  private async createPullRequest(request: MCPRequest): Promise<MCPResponse> {
    const { owner, repo, title, body, head, base, schemaChanges } = request.params;
    
    // 스키마 변경사항을 포함한 PR 생성
    const enhancedBody = this.formatPRBodyWithSchemaChanges(body, schemaChanges);
    
    const pr = await this.octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body: enhancedBody,
      head,
      base
    });
    
    return {
      success: true,
      data: {
        pullRequestNumber: pr.data.number,
        pullRequestUrl: pr.data.html_url
      }
    };
  }
}
```

## 플러그인 시스템 구현

### 1. 플러그인 인터페이스
```typescript
export interface ISchemaPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly supportedFormats: SchemaFormat[];
  
  initialize(context: PluginContext): Promise<void>;
  process(schema: Schema, options: ProcessingOptions): Promise<ProcessingResult>;
  cleanup(): Promise<void>;
}

export class PluginManager {
  private plugins = new Map<string, ISchemaPlugin>();
  private logger = Logger.getInstance();
  
  async registerPlugin(plugin: ISchemaPlugin): Promise<void> {
    this.logger.info(`플러그인 등록: ${plugin.name} v${plugin.version}`);
    
    await plugin.initialize({
      logger: this.logger,
      config: this.getPluginConfig(plugin.id)
    });
    
    this.plugins.set(plugin.id, plugin);
    this.logger.info(`플러그인 등록 완료: ${plugin.id}`);
  }
  
  async processWithPlugin(
    pluginId: string, 
    schema: Schema, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`플러그인을 찾을 수 없습니다: ${pluginId}`);
    }
    
    if (!plugin.supportedFormats.includes(schema.format)) {
      throw new Error(`플러그인이 ${schema.format} 형식을 지원하지 않습니다`);
    }
    
    return await plugin.process(schema, options);
  }
}
```

### 2. 커스텀 변환 플러그인 예시
```typescript
export class CustomXmlToJsonPlugin implements ISchemaPlugin {
  readonly id = 'custom-xml-to-json';
  readonly name = 'Custom XML to JSON Converter';
  readonly version = '1.0.0';
  readonly supportedFormats = [SchemaFormat.XML];
  
  private transformationRules: TransformationRule[];
  
  async initialize(context: PluginContext): Promise<void> {
    this.transformationRules = context.config.transformationRules || [];
    context.logger.info('Custom XML to JSON 플러그인 초기화 완료');
  }
  
  async process(schema: Schema, options: ProcessingOptions): Promise<ProcessingResult> {
    const xmlDoc = parseXml(schema.content);
    const jsonResult = this.transformXmlToJson(xmlDoc, this.transformationRules);
    
    return {
      success: true,
      output: {
        format: SchemaFormat.JSON,
        content: JSON.stringify(jsonResult, null, 2)
      },
      metadata: {
        transformationRules: this.transformationRules.length,
        processingTime: Date.now() - options.startTime
      }
    };
  }
  
  private transformXmlToJson(xmlDoc: any, rules: TransformationRule[]): any {
    // 커스텀 변환 로직 구현
    let result = {};
    
    for (const rule of rules) {
      result = this.applyTransformationRule(result, xmlDoc, rule);
    }
    
    return result;
  }
  
  async cleanup(): Promise<void> {
    // 정리 작업
  }
}
```

## 확장성 고려사항

### 1. 마이크로서비스 아키텍처 준비
```typescript
// 서비스 디스커버리 인터페이스
export interface IServiceDiscovery {
  registerService(service: ServiceInfo): Promise<void>;
  discoverService(serviceName: string): Promise<ServiceInfo[]>;
  unregisterService(serviceId: string): Promise<void>;
}

// 분산 처리를 위한 메시지 큐 인터페이스
export interface IMessageQueue {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
}

// 확장 가능한 스키마 처리 서비스
export class DistributedSchemaProcessor {
  constructor(
    private serviceDiscovery: IServiceDiscovery,
    private messageQueue: IMessageQueue
  ) {}
  
  async processSchemaDistributed(schema: Schema): Promise<ProcessingResult> {
    // 적절한 처리 서비스 발견
    const processors = await this.serviceDiscovery.discoverService('schema-processor');
    const selectedProcessor = this.selectOptimalProcessor(processors, schema);
    
    // 비동기 처리 요청
    const taskId = generateTaskId();
    await this.messageQueue.publish('schema-processing', {
      taskId,
      schema,
      processorId: selectedProcessor.id
    });
    
    // 결과 대기
    return await this.waitForResult(taskId);
  }
}
```

### 2. 컨테이너화 지원
```dockerfile
# Dockerfile.mcp-provider
FROM node:18-alpine

WORKDIR /app

# MCP 프로바이더 의존성 설치
COPY mcp-server/package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY mcp-server/src ./src
COPY mcp-server/dist ./dist

# 환경 변수 설정
ENV NODE_ENV=production
ENV MCP_PROVIDER_PORT=3001

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$MCP_PROVIDER_PORT/health || exit 1

EXPOSE $MCP_PROVIDER_PORT

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  eai-schema-toolkit:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MCP_PROVIDERS=schema-transformation,atlassian-integration
    depends_on:
      - mcp-schema-provider
      - mcp-atlassian-provider
  
  mcp-schema-provider:
    build:
      context: .
      dockerfile: Dockerfile.mcp-provider
    environment:
      - MCP_PROVIDER_TYPE=schema-transformation
      - MCP_PROVIDER_PORT=3001
  
  mcp-atlassian-provider:
    build:
      context: .
      dockerfile: Dockerfile.mcp-provider
    environment:
      - MCP_PROVIDER_TYPE=atlassian-integration
      - MCP_PROVIDER_PORT=3002
      - ATLASSIAN_HOST=${ATLASSIAN_HOST}
      - ATLASSIAN_TOKEN=${ATLASSIAN_TOKEN}
```

## 모니터링 및 관찰성

### 1. MCP 프로바이더 메트릭
```typescript
export class MCPMetricsCollector {
  private readonly providerRequestsTotal = new Counter({
    name: 'mcp_provider_requests_total',
    help: 'Total number of MCP provider requests',
    labelNames: ['provider', 'operation', 'status']
  });
  
  private readonly providerRequestDuration = new Histogram({
    name: 'mcp_provider_request_duration_seconds',
    help: 'Duration of MCP provider requests',
    labelNames: ['provider', 'operation']
  });
  
  recordProviderRequest(
    provider: string, 
    operation: string, 
    status: 'success' | 'error', 
    duration: number
  ): void {
    this.providerRequestsTotal.inc({ provider, operation, status });
    this.providerRequestDuration.observe({ provider, operation }, duration);
  }
}
```

### 2. 분산 추적
```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class MCPTracing {
  private tracer = trace.getTracer('eai-schema-toolkit-mcp');
  
  async executeWithTracing<T>(
    operationName: string,
    provider: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = this.tracer.startSpan(operationName, {
      attributes: {
        'mcp.provider': provider,
        'mcp.operation': operationName
      }
    });
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), operation);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

이러한 MCP 통합 및 확장성 지침을 통해 EAI Schema Toolkit을 다양한 외부 도구와 통합하고 미래의 요구사항에 대응할 수 있는 확장 가능한 아키텍처를 구축할 수 있습니다.