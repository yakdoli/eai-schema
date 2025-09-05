"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error";
process.env.PORT = "0";
jest.setTimeout(30000);
jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));
afterAll(async () => {
    jest.clearAllTimers();
    await new Promise(resolve => setTimeout(resolve, 500));
});
afterEach(() => {
    jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map