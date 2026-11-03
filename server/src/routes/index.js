// Главный роутер API. Новые модули подключаются здесь.
import { Router } from 'express';
import prisma from '../prisma.js';
import authRouter from './auth.js';
import usersRouter from './users.js';
import titlesRouter from './titles.js';
import { listGenres } from '../controllers/titlesController.js';

const router = Router();

// Проверка, что сервер и база живы
router.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/titles', titlesRouter);
router.get('/genres', listGenres);

export default router;
