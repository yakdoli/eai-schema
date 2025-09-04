"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const performanceMonitoringMiddleware_1 = __importDefault(require("./middleware/performanceMonitoringMiddleware"));
const upload_1 = require("./routes/upload");
const health_1 = require("./routes/health");
const messageMapping_1 = __importDefault(require("./routes/messageMapping"));
const mcpController_1 = __importDefault(require("./mcp/mcpController"));
const collaboration_1 = __importDefault(require("./routes/collaboration"));
const schemaValidation_1 = __importDefault(require("./routes/schemaValidation"));
const performanceMonitoring_1 = __importDefault(require("./routes/performanceMonitoring"));
const CollaborationService_1 = require("./services/CollaborationService");
const messageMappingService_1 = require("./services/messageMappingService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3001;
app.set("trust proxy", 1);
const messageMappingService = new messageMappingService_1.MessageMappingService(logger_1.logger);
const collaborationService = new CollaborationService_1.CollaborationService(messageMappingService);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});
collaborationService.initialize(io);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const allowedOrigins = [
    "https://yakdoli.github.io",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    process.env.FRONTEND_URL,
].filter((url) => Boolean(url));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (process.env.NODE_ENV === "development") {
            return callback(null, true);
        }
        if (allowedOrigins.some((allowed) => {
            if (!allowed)
                return false;
            return origin === allowed || origin.startsWith(allowed);
        })) {
            return callback(null, true);
        }
        logger_1.logger.warn("CORS 차단된 요청", { origin, allowedOrigins });
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)("combined", {
    stream: {
        write: (message) => logger_1.logger.info(message.trim()),
    },
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.path === "/api/health";
    }
});
app.use(limiter);
app.use(performanceMonitoringMiddleware_1.default);
app.use("/api/upload", express_1.default.raw({ type: "application/octet-stream", limit: "50mb" }));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use(express_1.default.static(path_1.default.join(__dirname, "../docs")));
app.use("/api/health", health_1.healthRoutes);
app.use("/api/upload", upload_1.uploadRoutes);
app.use("/api/message-mapping", messageMapping_1.default);
app.use("/api/mcp", mcpController_1.default);
app.use("/api/collaboration", collaboration_1.default);
app.use("/api/schema-validation", schemaValidation_1.default);
app.use("/api/performance", performanceMonitoring_1.default);
app.use(errorHandler_1.errorHandler);
app.get("/", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "EAI Schema Toolkit is running",
        timestamp: new Date().toISOString()
    });
});
server.listen(PORT, () => {
    logger_1.logger.info(`EAI Schema Toolkit 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
exports.default = app;
//# sourceMappingURL=index.js.map