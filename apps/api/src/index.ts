import './config/env';               // validates env on startup — must be first
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler }   from './middleware/error.middleware';
import { authRouter }     from './routes/auth.routes';
// More routers imported here as modules are built

const app = express();

// Security headers — runs on every request
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGINS.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/programs', programRouter);  // add per sprint

// Health check — for load balancer / uptime monitoring
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Global error handler — must be last
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`AidFlow API running on port ${env.PORT} [${env.NODE_ENV}]`);
});