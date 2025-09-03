import winston from 'winston';
// 로그 포맷 정의
const logFormat = winston.format.combine(winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston.format.errors({ stack: true }), winston.format.json());
// 로거 생성
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'eai-schema-toolkit-backend' },
    transports: [
        // 콘솔 출력
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        }),
        // 파일 출력 (에러 로그)
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        // 파일 출력 (전체 로그)
        new winston.transports.File({
            filename: 'logs/combined.log'
        })
    ]
});
// 개발 환경에서는 더 자세한 로그 출력
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.timestamp(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        }))
    }));
}
