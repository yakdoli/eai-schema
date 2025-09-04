import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import performanceMonitoringMiddleware from "./middleware/performanceMonitoringMiddleware";
import { uploadRoutes } from "./routes/upload";
import { healthRoutes } from "./routes/health";
import messageMappingRoutes from "./routes/messageMapping";
import mcpRoutes from "./mcp/mcpController";
import collaborationRoutes from "./routes/collaboration";
import schemaValidationRoutes from "./routes/schemaValidation";
import performanceMonitoringRoutes from "./routes/performanceMonitoring";
import { CollaborationService } from "./services/CollaborationService";
import { MessageMappingService } from "./services/messageMappingService";
import { performanceMonitoringService } from "./services/PerformanceMonitoringService";

// 환경 변수 로드
dotenv.config();

const app: express.Application = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Heroku에서 프록시 뒤에서 실행되므로 trust proxy 설정
app.set("trust proxy", 1);

// Initialize services
const messageMappingService = new MessageMappingService(logger);
const collaborationService = new CollaborationService(messageMappingService);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Initialize collaboration service with Socket.IO
collaborationService.initialize(io);

// 보안 미들웨어
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS 설정
const allowedOrigins = [
  "https://yakdoli.github.io",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  process.env.FRONTEND_URL,
].filter((url): url is string => Boolean(url));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // 개발 환경에서는 모든 origin 허용
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      // 허용된 origin 체크
      if (allowedOrigins.some((allowed) => {
        if (!allowed) return false;
        return origin === allowed || origin.startsWith(allowed);
      })) {
        return callback(null, true);
      }

      logger.warn("CORS 차단된 요청", { origin, allowedOrigins });
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// 압축 미들웨어
app.use(compression());

// 로깅 미들웨어
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }),
);

// Rate limiting - Heroku 환경에 최적화된 설정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // trust proxy가 이미 설정되어 있으므로 별도 설정 불필요
  skip: (req) => {
    // 헬스체크 요청은 rate limit에서 제외
    return req.path === "/api/health";
  }
});
app.use(limiter);

// Performance monitoring middleware
app.use(performanceMonitoringMiddleware);

// JSON 파싱 미들웨어 (파일 업로드 제외)
app.use(
  "/api/upload",
  express.raw({ type: "application/octet-stream", limit: "50mb" }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 정적 파일 서빙 (프론트엔드)
app.use(express.static(path.join(__dirname, "../docs")));

// 라우트 등록
// 라우트 등록
app.use("/api/health", healthRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/message-mapping", messageMappingRoutes);
app.use("/api/mcp", mcpRoutes);
app.use("/api/collaboration", collaborationRoutes);
app.use("/api/schema-validation", schemaValidationRoutes);
app.use("/api/performance", performanceMonitoringRoutes);

// 에러 핸들링 미들웨어
app.use(errorHandler);

// Heroku health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "EAI Schema Toolkit is running",
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
server.listen(PORT, () => {
  logger.info(
    `EAI Schema Toolkit 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`,
  );
});

export default app;