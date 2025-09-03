import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { uploadRoutes } from './routes/upload';
import { healthRoutes } from './routes/health';
// 환경 변수 로드
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
// 보안 미들웨어
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS 설정
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
// 압축 미들웨어
app.use(compression());
// 로깅 미들웨어
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 최대 100개 요청
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use(limiter);
// JSON 파싱 미들웨어 (파일 업로드 제외)
app.use('/api/upload', express.raw({ type: 'application/octet-stream', limit: '50mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// 라우트 등록
app.use('/api/health', healthRoutes);
app.use('/api/upload', uploadRoutes);
// 에러 핸들링 미들웨어
app.use(errorHandler);
// 서버 시작
app.listen(PORT, () => {
    logger.info(`EAI Schema Toolkit 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
export default app;
