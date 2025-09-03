import { Request, Response, NextFunction } from "express";
import { performanceMonitoringService } from "../services/PerformanceMonitoringService";

/**
 * Performance monitoring middleware
 * Records metrics for HTTP requests
 */
const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime();

  // Function to record metrics after response is finished
  const recordMetrics = () => {
    const endTime = process.hrtime(startTime);
    const duration = endTime[0] + endTime[1] / 1e9; // Convert to seconds

    // Record the metrics
    performanceMonitoringService.recordHttpRequest(
      req.method,
      req.path,
      res.statusCode,
      duration
    );
  };

  // Listen for the response to finish
  res.on("finish", recordMetrics);

  // Continue with the next middleware
  next();
};

export default performanceMonitoringMiddleware;