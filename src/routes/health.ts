import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";

const router: Router = Router();

// 헬스 체크 엔드포인트
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
    }
  };

  res.status(200).json(healthCheck);
}));

export { router as healthRoutes };