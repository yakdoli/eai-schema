"use strict";
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
jest.setTimeout(10000);
afterAll(async () => {
    jest.clearAllTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
//# sourceMappingURL=setup.js.map