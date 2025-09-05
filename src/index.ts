import express, { Application } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { ConfigManager } from './core/config/ConfigManager';

const config = ConfigManager.getInstance().getConfig();
import { Logger } from './core/logging/Logger';
import { errorHandler } from './middleware/errorHandler';

// 라우터 import
// import apiV1Routes from './routes/index';
// import apiV2Routes from './routes/v2/index';

const logger = new Logger();

export function createApp(): Application {
  const app = express();

  // 미들웨어 설정
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 라우터 설정 (임시로 비활성화)
  // app.use('/api/v1', apiV1Routes);
  // app.use('/api/v2', apiV2Routes);

  // 에러 핸들러
  app.use(errorHandler.handleError);

  return app;
}

// 서버 시작 함수
export function startServer(): void {
  const app = createApp();
  const server = createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  server.listen(config.PORT, () => {
    logger.info(`서버가 포트 ${config.PORT}에서 시작되었습니다`);
  });
}

// 기본 export
export default createApp;

// 직접 실행 시 서버 시작
if (require.main === module) {
  startServer();
}
