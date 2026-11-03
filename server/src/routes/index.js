// Главный роутер API. Новые модули подключаются здесь.
import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// Проверка, что сервер и база живы
router.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
