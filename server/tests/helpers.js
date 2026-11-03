// Вспомогательные функции для тестов
import request from 'supertest';
import sharp from 'sharp';
import app from '../src/app.js';

let counter = 0;

// Регистрирует нового пользователя с уникальным именем и возвращает { token, user }
export async function registerUser(prefix = 'user') {
  counter += 1;
  const name = `${prefix}${Date.now() % 100000}${counter}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `${name}@test.local`, username: name, password: 'secret123' });
  return res.body;
}

// Маленькая PNG-картинка для проверки загрузки
export function makePng(width = 40, height = 60) {
  return sharp({
    create: { width, height, channels: 3, background: '#3366ff' },
  })
    .png()
    .toBuffer();
}
