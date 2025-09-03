// 서버 기본 기능 테스트 스크립트
const http = require('http');

// 서버 시작
const { spawn } = require('child_process');
const server = spawn('pnpm', ['dev'], { 
  cwd: __dirname,
  stdio: 'pipe'
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('서버 출력:', output);
  
  if (output.includes('포트') && output.includes('실행 중')) {
    serverReady = true;
    console.log('서버가 준비되었습니다.');
    
    // 간단한 헬스 체크 테스트
    setTimeout(() => {
      testHealthEndpoint();
    }, 1000);
  }
});

server.stderr.on('data', (data) => {
  console.error('서버 에러:', data.toString());
});

function testHealthEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`헬스 체크 상태 코드: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('헬스 체크 응답:', data);
      
      // 서버 종료
      server.kill();
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error('헬스 체크 실패:', err.message);
    server.kill();
    process.exit(1);
  });

  req.end();
}

// 10초 후 타임아웃
setTimeout(() => {
  console.log('타임아웃: 서버 테스트 종료');
  server.kill();
  process.exit(1);
}, 10000);