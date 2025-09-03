// 종합적인 파일 업로드 및 URL 처리 기능 테스트
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 테스트용 파일들 생성
const testFiles = {
  'test.wsdl': `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:tns="http://example.com/test"
             targetNamespace="http://example.com/test">
  <types>
    <schema xmlns="http://www.w3.org/2001/XMLSchema"
            targetNamespace="http://example.com/test">
      <element name="TestElement" type="string"/>
    </schema>
  </types>
  <message name="TestMessage">
    <part name="parameter" element="tns:TestElement"/>
  </message>
  <portType name="TestPortType">
    <operation name="TestOperation">
      <input message="tns:TestMessage"/>
    </operation>
  </portType>
</definitions>`,
  'test.json': `{
  "openapi": "3.0.0",
  "info": {
    "title": "Test API",
    "version": "1.0.0"
  },
  "paths": {
    "/test": {
      "get": {
        "summary": "Test endpoint",
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}`,
  'test.xsd': `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/test"
           xmlns:tns="http://example.com/test">
  <xs:element name="TestElement" type="xs:string"/>
  <xs:complexType name="TestType">
    <xs:sequence>
      <xs:element name="field1" type="xs:string"/>
      <xs:element name="field2" type="xs:int"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`
};

// 테스트 파일들 생성
Object.entries(testFiles).forEach(([filename, content]) => {
  fs.writeFileSync(path.join(__dirname, filename), content);
});

// 서버 시작
const { spawn } = require('child_process');
const server = spawn('pnpm', ['dev'], { 
  cwd: __dirname,
  stdio: 'pipe'
});

let serverReady = false;
let testResults = [];

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('포트') && output.includes('실행 중') && !serverReady) {
    serverReady = true;
    console.log('🚀 서버가 준비되었습니다. 종합 테스트를 시작합니다.\n');
    
    setTimeout(() => {
      runTests();
    }, 1000);
  }
});

server.stderr.on('data', (data) => {
  console.error('서버 에러:', data.toString());
});

async function runTests() {
  console.log('📋 테스트 계획:');
  console.log('1. 다양한 파일 타입 업로드 테스트');
  console.log('2. 파일 크기 제한 테스트');
  console.log('3. 보안 검증 테스트');
  console.log('4. URL 가져오기 테스트');
  console.log('5. 파일 관리 기능 테스트\n');

  try {
    // 1. 다양한 파일 타입 업로드 테스트
    await testMultipleFileTypes();
    
    // 2. 파일 크기 제한 테스트
    await testFileSizeLimit();
    
    // 3. 보안 검증 테스트
    await testSecurityValidation();
    
    // 4. URL 가져오기 테스트
    await testUrlFetching();
    
    // 5. 파일 관리 기능 테스트
    await testFileManagement();
    
    // 결과 출력
    printTestResults();
    
  } catch (error) {
    console.error('테스트 실행 중 오류:', error);
  } finally {
    cleanup();
  }
}

async function testMultipleFileTypes() {
  console.log('🧪 테스트 1: 다양한 파일 타입 업로드');
  
  for (const [filename, content] of Object.entries(testFiles)) {
    try {
      const result = await uploadFile(filename, content);
      if (result.success) {
        testResults.push({ test: `파일 업로드 (${filename})`, status: '✅ 성공', details: `파일 ID: ${result.data.fileId}` });
      } else {
        testResults.push({ test: `파일 업로드 (${filename})`, status: '❌ 실패', details: result.message });
      }
    } catch (error) {
      testResults.push({ test: `파일 업로드 (${filename})`, status: '❌ 오류', details: error.message });
    }
  }
}

async function testFileSizeLimit() {
  console.log('🧪 테스트 2: 파일 크기 제한');
  
  // 큰 파일 생성 (1MB)
  const largeContent = 'x'.repeat(1024 * 1024);
  
  try {
    const result = await uploadFile('large.xml', `<?xml version="1.0"?><root>${largeContent}</root>`);
    if (result.success) {
      testResults.push({ test: '대용량 파일 업로드 (1MB)', status: '✅ 성공', details: '정상적으로 처리됨' });
    } else {
      testResults.push({ test: '대용량 파일 업로드 (1MB)', status: '❌ 실패', details: result.message });
    }
  } catch (error) {
    testResults.push({ test: '대용량 파일 업로드 (1MB)', status: '❌ 오류', details: error.message });
  }
}

async function testSecurityValidation() {
  console.log('🧪 테스트 3: 보안 검증');
  
  // XXE 공격 시도
  const maliciousXml = `<?xml version="1.0"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>`;
  
  try {
    const result = await uploadFile('malicious.xml', maliciousXml);
    if (result.success) {
      testResults.push({ test: 'XXE 공격 방지', status: '❌ 실패', details: '악성 XML이 업로드됨' });
    } else {
      testResults.push({ test: 'XXE 공격 방지', status: '✅ 성공', details: '악성 XML 차단됨' });
    }
  } catch (error) {
    testResults.push({ test: 'XXE 공격 방지', status: '✅ 성공', details: '악성 XML 차단됨' });
  }
  
  // 잘못된 URL 테스트
  const maliciousUrls = [
    'http://localhost/test',
    'https://127.0.0.1/test',
    'https://192.168.1.1/test',
    'file:///etc/passwd'
  ];
  
  for (const url of maliciousUrls) {
    try {
      const result = await validateUrl(url);
      if (result.success && result.data.isValid) {
        testResults.push({ test: `악성 URL 차단 (${url})`, status: '❌ 실패', details: '악성 URL이 허용됨' });
      } else {
        testResults.push({ test: `악성 URL 차단 (${url})`, status: '✅ 성공', details: '악성 URL 차단됨' });
      }
    } catch (error) {
      testResults.push({ test: `악성 URL 차단 (${url})`, status: '✅ 성공', details: '악성 URL 차단됨' });
    }
  }
}

async function testUrlFetching() {
  console.log('🧪 테스트 4: URL 가져오기');
  
  // 유효한 URL에서 스키마 가져오기 (httpbin.org 사용)
  try {
    const result = await fetchFromUrl('https://httpbin.org/xml');
    if (result.success) {
      testResults.push({ test: 'URL에서 스키마 가져오기', status: '✅ 성공', details: `파일 ID: ${result.data.fileId}` });
    } else {
      testResults.push({ test: 'URL에서 스키마 가져오기', status: '❌ 실패', details: result.message });
    }
  } catch (error) {
    testResults.push({ test: 'URL에서 스키마 가져오기', status: '❌ 오류', details: error.message });
  }
}

async function testFileManagement() {
  console.log('🧪 테스트 5: 파일 관리 기능');
  
  // 파일 목록 조회
  try {
    const result = await getFileList();
    if (result.success && Array.isArray(result.data)) {
      testResults.push({ test: '파일 목록 조회', status: '✅ 성공', details: `${result.data.length}개 파일 발견` });
      
      // 첫 번째 파일의 내용 다운로드 테스트
      if (result.data.length > 0) {
        const fileId = result.data[0].fileId;
        try {
          const content = await downloadFile(fileId);
          if (content) {
            testResults.push({ test: '파일 내용 다운로드', status: '✅ 성공', details: `${content.length} bytes 다운로드` });
          } else {
            testResults.push({ test: '파일 내용 다운로드', status: '❌ 실패', details: '내용이 비어있음' });
          }
        } catch (error) {
          testResults.push({ test: '파일 내용 다운로드', status: '❌ 오류', details: error.message });
        }
      }
    } else {
      testResults.push({ test: '파일 목록 조회', status: '❌ 실패', details: result.message || '잘못된 응답 형식' });
    }
  } catch (error) {
    testResults.push({ test: '파일 목록 조회', status: '❌ 오류', details: error.message });
  }
}

// 헬퍼 함수들
function uploadFile(filename, content) {
  return new Promise((resolve, reject) => {
    const boundary = '----formdata-boundary-' + Math.random().toString(36);
    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      'Content-Type: application/xml',
      '',
      content,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/file',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error('응답 파싱 실패'));
        }
      });
    });

    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

function validateUrl(url) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ url });
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/validate-url',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error('응답 파싱 실패'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function fetchFromUrl(url) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ url });
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/url',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error('응답 파싱 실패'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getFileList() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/files',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error('응답 파싱 실패'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function downloadFile(fileId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/upload/file/${fileId}/content`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.end();
  });
}

function printTestResults() {
  console.log('\n📊 테스트 결과 요약:');
  console.log('='.repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  testResults.forEach(result => {
    console.log(`${result.status} ${result.test}`);
    if (result.details) {
      console.log(`   └─ ${result.details}`);
    }
    
    if (result.status.includes('✅')) passed++;
    else failed++;
  });
  
  console.log('='.repeat(80));
  console.log(`총 ${testResults.length}개 테스트 중 ${passed}개 성공, ${failed}개 실패`);
  
  if (failed === 0) {
    console.log('🎉 모든 테스트가 성공했습니다!');
  } else {
    console.log('⚠️  일부 테스트가 실패했습니다. 로그를 확인해주세요.');
  }
}

function cleanup() {
  // 테스트 파일들 삭제
  Object.keys(testFiles).forEach(filename => {
    try {
      fs.unlinkSync(path.join(__dirname, filename));
    } catch (err) {
      // 파일이 없으면 무시
    }
  });
  
  // 대용량 테스트 파일 삭제
  try {
    fs.unlinkSync(path.join(__dirname, 'large.xml'));
  } catch (err) {
    // 파일이 없으면 무시
  }
  
  console.log('\n🧹 테스트 파일 정리 완료');
  
  // 서버 종료
  server.kill();
  process.exit(0);
}

// 30초 후 타임아웃
setTimeout(() => {
  console.log('⏰ 타임아웃: 테스트 종료');
  cleanup();
}, 30000);