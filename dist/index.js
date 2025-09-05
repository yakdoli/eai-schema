"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const ConfigManager_1 = require("./core/config/ConfigManager");
const config = ConfigManager_1.ConfigManager.getInstance().getConfig();
const Logger_1 = require("./core/logging/Logger");
const errorHandler_1 = require("./middleware/errorHandler");
const logger = new Logger_1.Logger();
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: config.CORS_ORIGIN,
        credentials: true
    }));
    app.use((0, compression_1.default)());
    app.use((0, morgan_1.default)('combined'));
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
    app.use(errorHandler_1.errorHandler.handleError);
    return app;
}
function startServer() {
    const app = createApp();
    const server = (0, http_1.createServer)(app);
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: config.CORS_ORIGIN,
            methods: ['GET', 'POST']
        }
    });
    server.listen(config.PORT, () => {
        logger.info(`서버가 포트 ${config.PORT}에서 시작되었습니다`);
    });
}
exports.default = createApp;
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map