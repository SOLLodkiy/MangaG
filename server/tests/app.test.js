import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/prisma.js';

afterAll(() => prisma.$disconnect());

describe('Базовые маршруты API', () => {
  test('GET /api/health отвечает ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('неизвестный маршрут возвращает 404 в формате { error }', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/не найден/);
  });

  test('битый JSON возвращает 400', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Некорректный JSON');
  });
});
