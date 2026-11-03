import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/prisma.js';
import config from '../src/config.js';
import { requireRole } from '../src/middleware/auth.js';
import { makePng, registerUser } from './helpers.js';

afterAll(() => prisma.$disconnect());

describe('Профиль пользователя', () => {
  let token;
  let user;

  beforeAll(async () => {
    ({ token, user } = await registerUser('prof'));
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  test('публичный профиль не содержит email и баланс', async () => {
    const res = await request(app).get(`/api/users/${user.username}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(user.username);
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.balance).toBeUndefined();
    expect(res.body.stats.titles).toBe(0);
  });

  test('несуществующий профиль — 404', async () => {
    const res = await request(app).get('/api/users/nobody_here');
    expect(res.status).toBe(404);
  });

  test('редактирование «о себе» и имени', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set(auth())
      .send({ bio: 'Рисую мангу', username: `${user.username}x` });
    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe('Рисую мангу');
    user = res.body.user;
  });

  test('нельзя занять чужое имя', async () => {
    const other = await registerUser('taken');
    const res = await request(app)
      .patch('/api/users/me')
      .set(auth())
      .send({ username: other.user.username });
    expect(res.status).toBe(409);
  });

  test('смена пароля', async () => {
    const wrong = await request(app)
      .patch('/api/users/me/password')
      .set(auth())
      .send({ currentPassword: 'nope', newPassword: 'newsecret' });
    expect(wrong.status).toBe(400);

    const ok = await request(app)
      .patch('/api/users/me/password')
      .set(auth())
      .send({ currentPassword: 'secret123', newPassword: 'newsecret' });
    expect(ok.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: user.username, password: 'newsecret' });
    expect(login.status).toBe(200);
  });

  test('загрузка аватара: файл сжимается в webp 256x256', async () => {
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set(auth())
      .attach('avatar', await makePng(800, 600), 'avatar.png');
    expect(res.status).toBe(200);
    expect(res.body.user.avatarUrl).toMatch(/^\/uploads\/avatars\/.+\.webp$/);

    const file = path.join(config.uploadsDir, res.body.user.avatarUrl.replace('/uploads/', ''));
    expect(fs.existsSync(file)).toBe(true);

    const del = await request(app).delete('/api/users/me/avatar').set(auth());
    expect(del.body.user.avatarUrl).toBeNull();
    expect(fs.existsSync(file)).toBe(false);
  });

  test('загрузка не-картинки отклоняется', async () => {
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set(auth())
      .attach('avatar', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('«Стать автором» меняет роль и выдаёт новый токен', async () => {
    const res = await request(app).post('/api/users/me/become-author').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('AUTHOR');
    expect(res.body.token).toBeDefined();

    const again = await request(app).post('/api/users/me/become-author').set(auth());
    expect(again.status).toBe(400);
  });
});

describe('requireRole', () => {
  const run = (user) =>
    new Promise((resolve) => requireRole('AUTHOR', 'ADMIN')({ user }, {}, resolve));

  test('пропускает нужную роль', async () => {
    expect(await run({ role: 'AUTHOR' })).toBeUndefined();
  });

  test('отклоняет читателя (403) и гостя (401)', async () => {
    expect((await run({ role: 'READER' })).status).toBe(403);
    expect((await run(null)).status).toBe(401);
  });
});
