"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlFetchService = exports.UrlFetchService = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const BLOCKED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "169.254.169.254",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
];
const ALLOWED_PORTS = [80, 443, 8080, 8443];
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;
const REQUEST_TIMEOUT = 5000;
class UrlFetchService {
    validateUrl(urlString) {
        let parsedUrl;
        try {
            parsedUrl = new url_1.URL(urlString);
        }
        catch (error) {
            throw new errorHandler_1.ValidationError("유효하지 않은 URL 형식입니다.");
        }
        if (parsedUrl.protocol !== "https:" &&
            (process.env.NODE_ENV === "production" || parsedUrl.protocol !== "http:")) {
            throw new errorHandler_1.SecurityError("HTTPS URL만 허용됩니다.");
        }
        if (this.isBlockedHost(parsedUrl.hostname)) {
            throw new errorHandler_1.SecurityError("차단된 호스트입니다.");
        }
        const port = parsedUrl.port
            ? parseInt(parsedUrl.port)
            : parsedUrl.protocol === "https:"
                ? 443
                : 80;
        if (!ALLOWED_PORTS.includes(port)) {
            throw new errorHandler_1.SecurityError(`허용되지 않은 포트입니다. 허용된 포트: ${ALLOWED_PORTS.join(", ")}`);
        }
        if (this.isIpAddress(parsedUrl.hostname)) {
            throw new errorHandler_1.SecurityError("IP 주소로의 직접 접근은 허용되지 않습니다.");
        }
        return parsedUrl;
    }
    isBlockedHost(hostname) {
        const lowerHostname = hostname.toLowerCase();
        for (const blockedHost of BLOCKED_HOSTS) {
            if (blockedHost.includes("/")) {
                if (this.isInCidrRange(hostname, blockedHost)) {
                    return true;
                }
            }
            else if (lowerHostname === blockedHost ||
                lowerHostname.endsWith(`.${blockedHost}`)) {
                return true;
            }
        }
        return false;
    }
    isIpAddress(hostname) {
        const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname);
    }
    isInCidrRange(ip, cidr) {
        if (cidr === "10.0.0.0/8") {
            return ip.startsWith("10.");
        }
        if (cidr === "172.16.0.0/12") {
            const parts = ip.split(".");
            if (parts[0] === "172" && parts[1]) {
                const second = parseInt(parts[1]);
                return second >= 16 && second <= 31;
            }
        }
        if (cidr === "192.168.0.0/16") {
            return ip.startsWith("192.168.");
        }
        return false;
    }
    async fetchFromUrl(urlString) {
        const parsedUrl = this.validateUrl(urlString);
        logger_1.logger.info(`URL에서 스키마 가져오기 시작: ${urlString}`);
        return new Promise((resolve, reject) => {
            const client = parsedUrl.protocol === "https:" ? https_1.default : http_1.default;
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: "GET",
                timeout: REQUEST_TIMEOUT,
                headers: {
                    "User-Agent": "EAI-Schema-Toolkit/1.0",
                    Accept: "application/xml, text/xml, application/json, text/plain, */*",
                    "Accept-Encoding": "identity",
                },
            };
            const request = client.request(options, (response) => {
                if (!response.statusCode ||
                    response.statusCode < 200 ||
                    response.statusCode >= 300) {
                    reject(new errorHandler_1.NetworkError(`HTTP 오류: ${response.statusCode} ${response.statusMessage}`));
                    return;
                }
                const contentLength = response.headers["content-length"];
                if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
                    reject(new errorHandler_1.ValidationError(`응답 크기가 너무 큽니다. 최대 ${MAX_RESPONSE_SIZE / 1024 / 1024}MB까지 허용됩니다.`));
                    return;
                }
                const chunks = [];
                let totalSize = 0;
                response.on("data", (chunk) => {
                    totalSize += chunk.length;
                    if (totalSize > MAX_RESPONSE_SIZE) {
                        request.destroy();
                        reject(new errorHandler_1.ValidationError(`응답 크기가 너무 큽니다. 최대 ${MAX_RESPONSE_SIZE / 1024 / 1024}MB까지 허용됩니다.`));
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on("end", () => {
                    const content = Buffer.concat(chunks);
                    const contentType = response.headers["content-type"] || "application/octet-stream";
                    this.validateContent(content, contentType);
                    const result = {
                        content,
                        contentType,
                        size: totalSize,
                        url: urlString,
                        fetchedAt: new Date(),
                    };
                    logger_1.logger.info(`URL에서 스키마 가져오기 완료: ${urlString} (크기: ${totalSize} bytes)`);
                    resolve(result);
                });
                response.on("error", (error) => {
                    reject(new errorHandler_1.NetworkError(`응답 처리 중 오류: ${error.message}`));
                });
            });
            request.on("timeout", () => {
                request.destroy();
                reject(new errorHandler_1.NetworkError(`요청 타임아웃: ${REQUEST_TIMEOUT}ms`));
            });
            request.on("error", (error) => {
                reject(new errorHandler_1.NetworkError(`네트워크 오류: ${error.message}`));
            });
            request.end();
        });
    }
    validateContent(content, contentType) {
        if (content.length === 0) {
            throw new errorHandler_1.ValidationError("빈 응답입니다.");
        }
        const contentString = content.toString("utf8", 0, Math.min(1024, content.length));
        if (contentType.includes("xml")) {
            if (!contentString.includes("<") || !contentString.includes(">")) {
                throw new errorHandler_1.ValidationError("유효하지 않은 XML 형식입니다.");
            }
            if (contentString.includes("<!ENTITY") &&
                contentString.includes("SYSTEM")) {
                throw new errorHandler_1.SecurityError("외부 엔티티 참조가 포함된 XML은 허용되지 않습니다.");
            }
        }
        if (contentType.includes("json")) {
            if (!contentString.trim().startsWith("{") &&
                !contentString.trim().startsWith("[")) {
                throw new errorHandler_1.ValidationError("유효하지 않은 JSON 형식입니다.");
            }
        }
    }
    isSupportedUrl(urlString) {
        try {
            const parsedUrl = new url_1.URL(urlString);
            return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        }
        catch {
            return false;
        }
    }
}
exports.UrlFetchService = UrlFetchService;
exports.urlFetchService = new UrlFetchService();
//# sourceMappingURL=urlFetchService.js.map