// 파일 업로드 기능 테스트 스크립트
const http = require('http');
const fs = require('fs');
const path = require('path');

// 테스트용 XML 파일 생성
const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
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
</definitions>`;

const testFilePath = path.join(__dirname, 'test.wsdl');
fs.writeFileSync(testFilePath, testXmlContent);

// 서버 시작
const { spawn } = require('child_process');
const server = spawn('pnpm', ['dev'], { 
  cwd: __dirname,
  stdio: 'pipe'
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('포트') && output.includes('실행 중') && !serverReady) {
    serverReady = true;
    console.log('서버가 준비되었습니다. 파일 업로드 테스트를 시작합니다.');
    
    setTimeout(() => {
      testFileUpload();
    }, 1000);
  }
});

server.stderr.on('data', (data) => {
  console.error('서버 에러:', data.toString());
});

function testFileUpload() {
  const boundary = '----formdata-boundary-' + Math.random().toString(36);
  const fileContent = fs.readFileSync(testFilePath);
  
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="test.wsdl"',
    'Content-Type: application/xml',
    '',
    fileContent.toString(),
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
    console.log(`파일 업로드 상태 코드: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('파일 업로드 응답:', data);
      
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        if (response.success && response.data.fileId) {
          console.log('✅ 파일 업로드 성공!');
          testUrlValidation();
        } else {
          console.log('❌ 파일 업로드 실패: 응답 형식 오류');
          cleanup();
        }
      } else {
        console.log('❌ 파일 업로드 실패: HTTP 오류');
        cleanup();
      }
    });
  });

  req.on('error', (err) => {
    console.error('파일 업로드 요청 실패:', err.message);
    cleanup();
  });

  req.write(formData);
  req.end();
}

function testUrlValidation() {
  const postData = JSON.stringify({
    url: 'https://httpbin.org/xml'
  });

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
    console.log(`URL 검증 상태 코드: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('URL 검증 응답:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ URL 검증 성공!');
      } else {
        console.log('❌ URL 검증 실패');
      }
      
      cleanup();
    });
  });

  req.on('error', (err) => {
    console.error('URL 검증 요청 실패:', err.message);
    cleanup();
  });

  req.write(postData);
  req.end();
}

function cleanup() {
  // 테스트 파일 삭제
  try {
    fs.unlinkSync(testFilePath);
    console.log('테스트 파일 정리 완료');
  } catch (err) {
    console.error('테스트 파일 정리 실패:', err.message);
  }
  
  // 서버 종료
  server.kill();
  process.exit(0);
}

// 15초 후 타임아웃
setTimeout(() => {
  console.log('타임아웃: 테스트 종료');
  cleanup();
}, 15000);