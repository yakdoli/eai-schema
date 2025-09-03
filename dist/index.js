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
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const upload_1 = require("./routes/upload");
const health_1 = require("./routes/health");
const messageMapping_1 = __importDefault(require("./routes/messageMapping"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
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
        if (allowedOrigins.some((allowed) => origin.startsWith(allowed || ""))) {
            return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
});
app.use(limiter);
app.use("/api/upload", express_1.default.raw({ type: "application/octet-stream", limit: "50mb" }));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/health", health_1.healthRoutes);
app.use("/api/upload", upload_1.uploadRoutes);
app.use("/api/message-mapping", messageMapping_1.default);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info(`EAI Schema Toolkit 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
exports.default = app;
//# sourceMappingURL=index.js.map