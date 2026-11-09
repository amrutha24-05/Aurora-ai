import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

// Import API routers and DB initialization
import { authRouter } from './server/routes/auth.ts';
import { chatRouter } from './server/routes/chat.ts';
import { speechRouter } from './server/routes/speech.ts';
import { ragRouter } from './server/routes/rag.ts';
import { settingsRouter } from './server/routes/settings.ts';
import { statusRouter } from './server/routes/status.ts';
import { translationRouter } from './server/routes/translation.ts';
import { initializeDatabase, getDbConfig, closeDatabase } from './server/db/index.ts';

process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception caught:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});

let httpServer: any = null;

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (httpServer) {
    httpServer.close();
  }
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (httpServer) {
    httpServer.close();
  }
  await closeDatabase();
  process.exit(0);
});

async function startServer() {
  const app = express();

  // Resolve port and host: prioritize CLI args (--port <n>, --host <h>), then environment, default to 3000 / 0.0.0.0
  let port = 3000;
  let host = '0.0.0.0';

  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    port = Number(process.argv[portIndex + 1]);
  } else if (process.env.DEFAULT_APP_PORT) {
    port = Number(process.env.DEFAULT_APP_PORT);
  } else if (process.env.PORT && process.env.PORT !== '8080') {
    port = Number(process.env.PORT);
  }

  const hostIndex = process.argv.indexOf('--host');
  if (hostIndex !== -1 && process.argv[hostIndex + 1]) {
    host = process.argv[hostIndex + 1];
  } else if (process.env.HOST) {
    host = process.env.HOST;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Environment validation & status logs
  console.log('--- Aurora AI System Initializing ---');
  if (process.env.GEMINI_API_KEY) {
    console.log('✔ GEMINI_API_KEY detected: gemini-3.8-flash & gemini-embedding-2 active.');
  } else {
    console.log('ℹ GEMINI_API_KEY unconfigured: Using graceful domain fallback engine.');
  }
  if (process.env.GNANI_TOKEN || process.env.GNANI_API_KEY) {
    console.log('✔ GNANI_TOKEN detected: Live Prisma STT and Timbre TTS active.');
  } else {
    console.log('ℹ GNANI_TOKEN unconfigured: Client Web Speech API handles live microphone and audio synthesis.');
  }

  // Initialize Supabase PostgreSQL connection
  const dbConfig = getDbConfig();
  console.log(`ℹ Database Target: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} (SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'})`);
  await initializeDatabase();
  console.log('------------------------------------');

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/speech', speechRouter);
  app.use('/api/rag', ragRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/status', statusRouter);
  app.use('/api/translation', translationRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'Aurora AI Multi-Agent Platform',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Vite integration
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer = app.listen(port, host, () => {
    console.log(`Aurora AI full-stack server running on http://${host}:${port}`);
  });

  httpServer.on('error', (err: any) => {
    console.error(`HTTP Server encountered error on ${host}:${port}:`, err.message);
  });

  // Keep-alive timeouts aligned with proxy standards
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
