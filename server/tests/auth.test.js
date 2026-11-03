import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/prisma.js';

afterAll(() => prisma.$disconnect());

const user = { email: 'Max@Test.local', username: 'max_auth', password: 'secret123' };

describe('Регистрация и вход', () => {
  let token;

  test('регистрация возвращает токен и пользователя без пароля', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('max@test.local'); // email приводится к нижнему регистру
    expect(res.body.user.role).toBe('READER');
    expect(res.body.user.passwordHash).toBeUndefined();
    token = res.body.token;
  });

  test('повторная регистрация с тем же email — 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...user, username: 'other_name' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/);
  });

  test('невалидные данные — 400 с описанием полей', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad', username: 'ab', password: '1' });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'username', 'password']));
  });

  test('вход по email и по имени пользователя', async () => {
    const byEmail = await request(app)
      .post('/api/auth/login')
      .send({ login: 'max@test.local', password: user.password });
    expect(byEmail.status).toBe(200);

    const byName = await request(app)
      .post('/api/auth/login')
      .send({ login: user.username, password: user.password });
    expect(byName.status).toBe(200);
    expect(byName.body.user.username).toBe(user.username);
  });

  test('неверный пароль — 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: user.username, password: 'wrong-pass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Неверный логин или пароль');
  });

  test('GET /auth/me с токеном и без', async () => {
    const ok = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.user.username).toBe(user.username);

    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const badToken = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc');
    expect(badToken.status).toBe(401);
  });
});
