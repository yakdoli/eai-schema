import { performance } from 'perf_hooks';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../index';
import { spawn } from 'child_process';
import path from 'path';

describe('성능 테스트', () => {
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

  describe('API 응답 시간 테스트', () => {
    test('헬스체크 엔드포인트 응답 시간', async () => {
      const iterations = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await request(app)
          .get('/health')
          .expect(200);
        
        const end = performance.now();
        responseTimes.push(end - start);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // 95th percentile 계산
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95ResponseTime = responseTimes[p95Index];

      console.log(`헬스체크 응답 시간 통계:
        평균: ${avgResponseTime.toFixed(2)}ms
        최대: ${maxResponseTime.toFixed(2)}ms
        최소: ${minResponseTime.toFixed(2)}ms
        95th percentile: ${p95ResponseTime.toFixed(2)}ms`);

      // 성능 기준 검증
      expect(avgResponseTime).toBeLessThan(50); // 평균 50ms 이하
      expect(p95ResponseTime).toBeLessThan(100); // 95% 요청이 100ms 이하
    });

    test('스키마 변환 API 응답 시간', async () => {
      const testSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          email: { type: 'string', format: 'email' }
        }
      };

      const iterations = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await request(app)
          .post('/api/convert')
          .field('format', 'json')
          .field('targetFormat', 'xml')
          .attach('file', Buffer.from(JSON.stringify(testSchema)), 'test.json')
          .expect(200);
        
        const end = performance.now();
        responseTimes.push(end - start);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      responseTimes.sort((a, b) => a - b);
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];

      console.log(`스키마 변환 응답 시간 통계:
        평균: ${avgResponseTime.toFixed(2)}ms
        95th percentile: ${p95ResponseTime.toFixed(2)}ms`);

      // 변환 작업은 더 복잡하므로 더 관대한 기준
      expect(avgResponseTime).toBeLessThan(500); // 평균 500ms 이하
      expect(p95ResponseTime).toBeLessThan(1000); // 95% 요청이 1초 이하
    });

    test('대용량 스키마 변환 성능', async () => {
      // 1000개 필드를 가진 대용량 스키마 생성
      const largeSchema = {
        type: 'object',
        properties: {} as any
      };

      for (let i = 0; i < 1000; i++) {
        largeSchema.properties[`field_${i}`] = {
          type: 'string',
          description: `Field number ${i}`,
          minLength: 1,
          maxLength: 100
        };
      }

      const start = performance.now();
      
      const response = await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'yaml')
        .attach('file', Buffer.from(JSON.stringify(largeSchema)), 'large.json')
        .timeout(30000) // 30초 타임아웃
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;

      console.log(`대용량 스키마 변환 시간: ${responseTime.toFixed(2)}ms`);

      expect(response.body).toHaveProperty('success', true);
      expect(responseTime).toBeLessThan(10000); // 10초 이하
    });
  });

  describe('메모리 사용량 테스트', () => {
    test('메모리 누수 검사', async () => {
      const initialMemory = process.memoryUsage();
      
      // 100번의 API 호출 수행
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/api/validate')
          .send({
            schema: JSON.stringify({
              type: 'object',
              properties: {
                id: { type: 'string' },
                data: { type: 'object' }
              }
            }),
            format: 'json'
          });
      }

      // 가비지 컬렉션 강제 실행
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`메모리 사용량 변화:
        초기: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        최종: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        증가: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`);

      // 메모리 증가가 50% 이하여야 함
      expect(memoryIncreasePercent).toBeLessThan(50);
    });

    test('동시 요청 처리 성능', async () => {
      const concurrentRequests = 20;
      const requestsPerBatch = 5;
      
      const testSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      };

      const startTime = performance.now();
      const promises: Promise<any>[] = [];

      // 동시 요청 생성
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .post('/api/convert')
          .field('format', 'json')
          .field('targetFormat', 'xml')
          .attach('file', Buffer.from(JSON.stringify(testSchema)), `test-${i}.json`);
        
        promises.push(promise);
      }

      // 모든 요청 완료 대기
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / concurrentRequests;

      console.log(`동시 요청 처리 성능:
        총 요청 수: ${concurrentRequests}
        총 처리 시간: ${totalTime.toFixed(2)}ms
        요청당 평균 시간: ${avgTimePerRequest.toFixed(2)}ms`);

      // 모든 요청이 성공했는지 확인
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });

      // 동시 처리 성능 기준
      expect(avgTimePerRequest).toBeLessThan(1000); // 요청당 1초 이하
    });
  });

  describe('처리량 테스트', () => {
    test('초당 요청 처리량 측정', async () => {
      const testDuration = 10000; // 10초
      const startTime = performance.now();
      let requestCount = 0;
      let errorCount = 0;

      const makeRequest = async (): Promise<void> => {
        try {
          await request(app)
            .get('/health')
            .timeout(5000);
          requestCount++;
        } catch (error) {
          errorCount++;
        }
      };

      // 지속적으로 요청 전송
      const promises: Promise<void>[] = [];
      while (performance.now() - startTime < testDuration) {
        promises.push(makeRequest());
        
        // 너무 많은 동시 요청을 방지하기 위해 제한
        if (promises.length >= 50) {
          await Promise.all(promises);
          promises.length = 0;
        }
      }

      // 남은 요청들 완료 대기
      await Promise.all(promises);

      const actualDuration = performance.now() - startTime;
      const requestsPerSecond = (requestCount / actualDuration) * 1000;
      const errorRate = (errorCount / (requestCount + errorCount)) * 100;

      console.log(`처리량 테스트 결과:
        테스트 시간: ${actualDuration.toFixed(2)}ms
        총 요청 수: ${requestCount}
        에러 수: ${errorCount}
        초당 처리량: ${requestsPerSecond.toFixed(2)} req/sec
        에러율: ${errorRate.toFixed(2)}%`);

      expect(requestsPerSecond).toBeGreaterThan(100); // 초당 100 요청 이상
      expect(errorRate).toBeLessThan(1); // 에러율 1% 미만
    });
  });

  describe('부하 테스트 실행', () => {
    test('Artillery 부하 테스트 실행', async () => {
      const configPath = path.join(__dirname, 'load-test.config.yml');
      
      return new Promise<void>((resolve, reject) => {
        const artillery = spawn('npx', ['artillery', 'run', configPath], {
          stdio: 'pipe',
          cwd: process.cwd()
        });

        let output = '';
        let errorOutput = '';

        artillery.stdout.on('data', (data) => {
          output += data.toString();
        });

        artillery.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        artillery.on('close', (code) => {
          console.log('Artillery 부하 테스트 결과:');
          console.log(output);
          
          if (errorOutput) {
            console.error('Artillery 에러 출력:');
            console.error(errorOutput);
          }

          if (code === 0) {
            // 결과 파싱 및 검증
            const lines = output.split('\n');
            const summaryLine = lines.find(line => line.includes('Summary report'));
            
            if (summaryLine) {
              console.log('부하 테스트 완료');
              resolve();
            } else {
              reject(new Error('부하 테스트 결과를 파싱할 수 없습니다'));
            }
          } else {
            reject(new Error(`Artillery가 코드 ${code}로 종료되었습니다`));
          }
        });

        artillery.on('error', (error) => {
          reject(error);
        });

        // 테스트 타임아웃 (10분)
        setTimeout(() => {
          artillery.kill();
          reject(new Error('부하 테스트 타임아웃'));
        }, 600000);
      });
    }, 700000); // Jest 타임아웃 11분

    test('Autocannon 빠른 부하 테스트', async () => {
      return new Promise<void>((resolve, reject) => {
        const autocannon = spawn('npx', ['autocannon', '-c', '10', '-d', '30', 'http://localhost:3000/health'], {
          stdio: 'pipe'
        });

        let output = '';

        autocannon.stdout.on('data', (data) => {
          output += data.toString();
        });

        autocannon.on('close', (code) => {
          console.log('Autocannon 부하 테스트 결과:');
          console.log(output);

          if (code === 0) {
            // 결과에서 주요 메트릭 추출
            const lines = output.split('\n');
            const latencyLine = lines.find(line => line.includes('Latency'));
            const reqSecLine = lines.find(line => line.includes('Req/Sec'));

            if (latencyLine && reqSecLine) {
              console.log('빠른 부하 테스트 완료');
              resolve();
            } else {
              reject(new Error('Autocannon 결과를 파싱할 수 없습니다'));
            }
          } else {
            reject(new Error(`Autocannon이 코드 ${code}로 종료되었습니다`));
          }
        });

        autocannon.on('error', (error) => {
          reject(error);
        });
      });
    }, 60000); // 1분 타임아웃
  });

  describe('리소스 사용량 모니터링', () => {
    test('CPU 사용률 모니터링', async () => {
      const cpuUsage = process.cpuUsage();
      const startTime = performance.now();

      // CPU 집약적인 작업 수행 (복잡한 스키마 변환)
      const complexSchema = generateComplexSchema(500);
      
      await request(app)
        .post('/api/convert')
        .field('format', 'json')
        .field('targetFormat', 'xml')
        .attach('file', Buffer.from(JSON.stringify(complexSchema)), 'complex.json');

      const endTime = performance.now();
      const finalCpuUsage = process.cpuUsage(cpuUsage);
      
      const userCpuTime = finalCpuUsage.user / 1000; // 마이크로초를 밀리초로 변환
      const systemCpuTime = finalCpuUsage.system / 1000;
      const totalTime = endTime - startTime;
      
      const cpuUtilization = ((userCpuTime + systemCpuTime) / totalTime) * 100;

      console.log(`CPU 사용률 분석:
        사용자 CPU 시간: ${userCpuTime.toFixed(2)}ms
        시스템 CPU 시간: ${systemCpuTime.toFixed(2)}ms
        총 실행 시간: ${totalTime.toFixed(2)}ms
        CPU 사용률: ${cpuUtilization.toFixed(2)}%`);

      // CPU 사용률이 합리적인 범위 내에 있는지 확인
      expect(cpuUtilization).toBeLessThan(200); // 200% 이하 (멀티코어 고려)
    });
  });

  // 헬퍼 함수: 복잡한 스키마 생성
  function generateComplexSchema(fieldCount: number) {
    const schema = {
      type: 'object',
      properties: {} as any,
      required: [] as string[]
    };

    for (let i = 0; i < fieldCount; i++) {
      const fieldName = `field_${i}`;
      schema.properties[fieldName] = {
        type: i % 4 === 0 ? 'object' : i % 4 === 1 ? 'array' : i % 4 === 2 ? 'string' : 'number',
        description: `Complex field number ${i}`,
        ...(i % 4 === 0 && {
          properties: {
            subField1: { type: 'string' },
            subField2: { type: 'number' }
          }
        }),
        ...(i % 4 === 1 && {
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10
        }),
        ...(i % 4 === 2 && {
          minLength: 1,
          maxLength: 100,
          pattern: '^[a-zA-Z0-9]+$'
        }),
        ...(i % 4 === 3 && {
          minimum: 0,
          maximum: 1000
        })
      };

      if (i % 3 === 0) {
        schema.required.push(fieldName);
      }
    }

    return schema;
  }
});