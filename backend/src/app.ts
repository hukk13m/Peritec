import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { errorHandler, ApiError } from './utils/errors.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import portalRoutes from './routes/portal.js';
import workspaceRoutes from './routes/workspace.js';
import quotationRoutes from './routes/quotations.js';
import orderRoutes from './routes/orders.js';
import fileRoutes from './routes/files.js';

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigin.includes(origin) || env.corsOrigin.includes('*')) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'peritec-mvp-backend',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', publicRoutes);
  app.use('/api/portal', portalRoutes);
  app.use('/api/workspace', workspaceRoutes);
  app.use('/api/quotations', quotationRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/files', fileRoutes);

  app.use('/api', (_req, _res, next) => next(ApiError.notFound('API route not found')));
  app.use(errorHandler);
  return app;
}
