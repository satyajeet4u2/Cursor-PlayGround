import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import casesRoutes from './modules/cases/cases.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportsRoutes from './modules/reports/reports.routes';
import { setupSwagger } from './docs/swagger';
import { errorHandler } from './lib/error-handler';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  setupSwagger(app);

  app.use('/auth', authRoutes);
  app.use('/cases', casesRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/reports', reportsRoutes);

  app.use(errorHandler);

  return app;
}
