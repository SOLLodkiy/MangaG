// Точка входа: запуск HTTP-сервера
import app from './app.js';
import config from './config.js';
import prisma from './prisma.js';

const server = app.listen(config.port, () => {
  console.log(`MangaG API запущен: http://localhost:${config.port}/api`);
});

// Аккуратное завершение (Ctrl+C)
async function shutdown() {
  console.log('Остановка сервера...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
