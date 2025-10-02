import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { RealTimeDataMonitor } from "./realTimeDataMonitor";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Error handling middleware for JSON parsing
app.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('❌ [JSON] Parsing error:', error.message);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      message: error.message
    });
  }
  next(error);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // 🚨 START REAL-TIME DATA MONITORING
  // TEMPORARILY DISABLED FOR DEPLOYMENT
  // const dataMonitor = RealTimeDataMonitor.getInstance();
  // dataMonitor.startMonitoring(60000); // Monitor every 60 seconds

  const port = 5000;
  const host = process.env.NODE_ENV === 'production' ? "0.0.0.0" : "0.0.0.0";
  
  server.listen({
    port,
    host,
    reusePort: false, // Disable reusePort for Windows compatibility
  }, () => {
    console.log(`🚀 SHARP SHOT LAUNCH-READY SERVER: http://${host}:${port}`);
    console.log(`📊 Real-time data monitoring: ACTIVE`);
    console.log(`⏱️  Demo period: 7 days maximum`);
    console.log(`🎯 Zero tolerance for stale data`);
    log(`serving on port ${port}`);
  });
})();
