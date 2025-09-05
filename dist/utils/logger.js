"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.logger = void 0;
const Logger_1 = require("../core/logging/Logger");
const legacyLogger = new Logger_1.Logger();
exports.logger = {
    error: (message, meta) => legacyLogger.error(message, meta),
    warn: (message, meta) => legacyLogger.warn(message, meta),
    info: (message, meta) => legacyLogger.info(message, meta),
    debug: (message, meta) => legacyLogger.debug(message, meta),
    logRequest: legacyLogger.logRequest.bind(legacyLogger),
    logPerformance: legacyLogger.logPerformance.bind(legacyLogger),
    logSecurityEvent: legacyLogger.logSecurityEvent.bind(legacyLogger),
    logBusinessEvent: legacyLogger.logBusinessEvent.bind(legacyLogger)
};
var Logger_2 = require("../core/logging/Logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return Logger_2.Logger; } });
//# sourceMappingURL=logger.js.map