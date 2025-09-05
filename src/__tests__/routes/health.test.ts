/// <reference types="jest" />
import request from "supertest";
import express from "express";
import { healthRoutes } from "../../routes/health";

const app = express();
app.use("/api/health", healthRoutes);

describe("Health Routes", () => {
  describe("GET /api/health", () => {
    it("헬스체크 정보를 반환해야 함", async () => {
      const response = await request(app)
        .get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "OK",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
        version: expect.any(String),
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          external: expect.any(Number)
        }
      });
    });

    it("메모리 사용량이 올바른 형식이어야 함", async () => {
      const response = await request(app)
        .get("/api/health");

      expect(response.body.memory.used).toBeGreaterThan(0);
      expect(response.body.memory.total).toBeGreaterThan(0);
      expect(response.body.memory.external).toBeGreaterThanOrEqual(0);
    });

    it("업타임이 0 이상이어야 함", async () => {
      const response = await request(app)
        .get("/api/health");

      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it("타임스탬프가 유효한 ISO 형식이어야 함", async () => {
      const response = await request(app)
        .get("/api/health");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });
});