import express from "express";
import { performanceMonitoringService } from "../services/PerformanceMonitoringService";
import { logger } from "../utils/logger";

const router = express.Router();

// Metrics endpoint for Prometheus
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await performanceMonitoringService.getMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error) {
    logger.error("Error retrieving metrics", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error("Error in performance monitoring health check", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Metrics summary endpoint
router.get("/summary", async (req, res) => {
  try {
    // In a real implementation, you would return a summary of key metrics
    res.json({
      message: "Metrics summary endpoint",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error retrieving metrics summary", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;