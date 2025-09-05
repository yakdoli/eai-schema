import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { logger } from "./utils/logger";
import { legacyErrorHandler as errorHandler } from "./middleware/errorHandler";
import { uploadRoutes } from "./routes/upload";
import { healthRoutes } from "./routes/health";
import messageMappingRoutes from "./routes/messageMapping";
import mcpRoutes from "./mcp/mcpController";
import collaborationRoutes from "./routes/collaboration";
import schemaValidationRoutes from "./routes/schemaValidation";
import performanceMonitoringRoutes from "./routes/performanceMonitoring";
import gridRoutes from "./routes/grid";
import { schemaConversionRoutes } from "./routes/schemaConversion";
import { apiV2Router } from "./routes/v2/index";
import { compatibilityRouter } from "./routes/v1/compatibility";

// 앱 생성 함수 (테스트용)
export function createApp(): express.Application {
  const app: express.Application = express();
  
  // Heroku에서 프록시 뒤에서 실행되므로 trust proxy 설정
  app.set("trust proxy", 1);

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
        if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
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

  // 로깅 미들웨어 (테스트 환경에서는 비활성화)
  if (process.env.NODE_ENV !== 'test') {
    app.use(
      morgan("combined", {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      }),
    );
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 최대 100개 요청
    message: {
      error: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path === "/api/health" || process.env.NODE_ENV === 'test';
    }
  });
  app.use(limiter);

  // JSON 파싱 미들웨어
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 정적 파일 서빙
  app.use(express.static(path.join(__dirname, "../docs")));

  // 라우트 등록
  app.use("/api/health", healthRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/message-mapping", messageMappingRoutes);
  app.use("/api/mcp", mcpRoutes);
  app.use("/api/collaboration", collaborationRoutes);
  app.use("/api/schema-validation", schemaValidationRoutes);
  app.use("/api/performance", performanceMonitoringRoutes);
  app.use("/api/v2/grid", gridRoutes);
  app.use("/api", schemaConversionRoutes);
  app.use("/api/v2", apiV2Router);
  app.use("/api/v1", compatibilityRouter);

  // 에러 핸들링 미들웨어
  app.use(errorHandler);

  // 기본 엔드포인트
  app.get("/", (req, res) => {
    res.status(200).json({ 
      status: "OK", 
      message: "EAI Schema Toolkit is running",
      timestamp: new Date().toISOString()
    });
  });

  return app;
}