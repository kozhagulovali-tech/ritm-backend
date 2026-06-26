import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes.js';
import teamRoutes from './routes/team.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import eventRoutes from './routes/events.routes.js';
import integrationRoutes from './routes/integrations.routes.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/integrations', integrationRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Ритм-backend запущен на порту ${port}`);
});
