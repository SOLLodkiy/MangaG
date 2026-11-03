import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/prisma.js';
import { slugify } from '../src/utils/slugify.js';
import { makePng, registerUser } from './helpers.js';

afterAll(() => prisma.$disconnect());

describe('slugify', () => {
  test('транслитерирует русский текст', () => {
    expect(slugify('Ван-Пис: Начало!')).toBe('van-pis-nachalo');
    expect(slugify('Щука и Ёж')).toBe('schuka-i-ezh');
  });
  test('не возвращает пустой или чисто числовой slug', () => {
    expect(slugify('!!!')).toBe('title');
    expect(slugify('1984')).toBe('title-1984');
  });
});

describe('Тайтлы', () => {
  let author;
  let reader;
  let otherAuthor;
  let genres;
  let title;

  const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    // жанры для тестовой базы
    for (const [name, slug] of [
      ['Боевик', 'action'],
      ['Драма', 'drama'],
      ['Комедия', 'comedy'],
    ]) {
      await prisma.genre.upsert({ where: { slug }, update: {}, create: { name, slug } });
    }
    const all = await prisma.genre.findMany();
    const bySlug = (slug) => all.find((g) => g.slug === slug);
    genres = [bySlug('action'), bySlug('drama'), bySlug('comedy')];

    reader = await registerUser('reader');
    author = await registerUser('author');
    otherAuthor = await registerUser('author');
    for (const u of [author, otherAuthor]) {
      const res = await request(app).post('/api/users/me/become-author').set(bearer(u));
      u.token = res.body.token;
    }
  });

  test('читатель не может создать тайтл (403)', async () => {
    const res = await request(app).post('/api/titles').set(bearer(reader)).send({ name: 'Тест' });
    expect(res.status).toBe(403);
  });

  test('автор создаёт тайтл, slug генерируется из названия', async () => {
    const res = await request(app)
      .post('/api/titles')
      .set(bearer(author))
      .send({
        name: 'Клинок Тестов',
        altName: 'Test Blade',
        description: 'Описание',
        type: 'MANHWA',
        ageRating: 16,
        year: 2024,
        genreIds: [genres[0].id, genres[2].id],
      });
    expect(res.status).toBe(201);
    expect(res.body.title.slug).toBe('klinok-testov');
    expect(res.body.title.genres).toHaveLength(2);
    expect(res.body.title.author.username).toBe(author.user.username);
    expect(res.body.title.searchText).toBeUndefined();
    title = res.body.title;
  });

  test('одинаковые названия получают разные slug', async () => {
    const res = await request(app)
      .post('/api/titles')
      .set(bearer(otherAuthor))
      .send({ name: 'Клинок Тестов', type: 'MANGA', genreIds: [genres[1].id] });
    expect(res.body.title.slug).toBe('klinok-testov-2');
  });

  test('валидация: неизвестный жанр и неверный возрастной рейтинг', async () => {
    const bad = await request(app)
      .post('/api/titles')
      .set(bearer(author))
      .send({ name: 'X', ageRating: 13 });
    expect(bad.status).toBe(400);

    const noGenre = await request(app)
      .post('/api/titles')
      .set(bearer(author))
      .send({ name: 'X', genreIds: [99999] });
    expect(noGenre.status).toBe(400);
  });

  test('карточка тайтла по slug, canEdit зависит от пользователя', async () => {
    const guest = await request(app).get(`/api/titles/${title.slug}`);
    expect(guest.status).toBe(200);
    expect(guest.body.title.canEdit).toBe(false);
    expect(guest.body.title.my).toBeNull();

    const owner = await request(app).get(`/api/titles/${title.slug}`).set(bearer(author));
    expect(owner.body.title.canEdit).toBe(true);
    expect(owner.body.title.my).toEqual({ bookmark: null, rating: null, progress: null });

    const missing = await request(app).get('/api/titles/no-such-title');
    expect(missing.status).toBe(404);
  });

  test('чужой тайтл редактировать нельзя', async () => {
    const res = await request(app)
      .patch(`/api/titles/${title.id}`)
      .set(bearer(otherAuthor))
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(403);
  });

  test('редактирование: новое имя меняет slug, жанры заменяются', async () => {
    const res = await request(app)
      .patch(`/api/titles/${title.id}`)
      .set(bearer(author))
      .send({ name: 'Новый Клинок', status: 'COMPLETED', genreIds: [genres[1].id] });
    expect(res.status).toBe(200);
    expect(res.body.title.slug).toBe('novyy-klinok');
    expect(res.body.title.status).toBe('COMPLETED');
    expect(res.body.title.genres.map((g) => g.slug)).toEqual(['drama']);
    title = res.body.title;
  });

  test('загрузка обложки', async () => {
    const res = await request(app)
      .post(`/api/titles/${title.id}/cover`)
      .set(bearer(author))
      .attach('cover', await makePng(300, 450), 'cover.png');
    expect(res.status).toBe(200);
    expect(res.body.coverUrl).toMatch(/^\/uploads\/covers\/.+\.webp$/);
  });

  describe('каталог', () => {
    test('поиск без учёта регистра по русскому названию и альтернативному', async () => {
      const ru = await request(app).get('/api/titles').query({ search: 'НОВЫЙ клинок' });
      expect(ru.body.items.map((t) => t.id)).toContain(title.id);

      const en = await request(app).get('/api/titles').query({ search: 'test blade' });
      expect(en.body.items.map((t) => t.id)).toContain(title.id);
    });

    test('фильтры по жанру, типу и статусу', async () => {
      const res = await request(app)
        .get('/api/titles')
        .query({ genres: 'drama', types: 'MANHWA', statuses: 'COMPLETED' });
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(title.id);
      expect(res.body.items[0].chaptersCount).toBe(0);
    });

    test('пагинация и сортировка по имени', async () => {
      const res = await request(app).get('/api/titles').query({ sort: 'name', limit: 1, page: 2 });
      expect(res.body.items).toHaveLength(1);
      expect(res.body.page).toBe(2);
      expect(res.body.pages).toBe(res.body.total);
    });

    test('неверные параметры — 400', async () => {
      const res = await request(app).get('/api/titles').query({ types: 'NOVEL' });
      expect(res.status).toBe(400);
    });

    test('список жанров с количеством тайтлов', async () => {
      const res = await request(app).get('/api/genres');
      const drama = res.body.genres.find((g) => g.slug === 'drama');
      expect(drama.count).toBe(2);
    });
  });

  test('удаление тайтла', async () => {
    const forbidden = await request(app).delete(`/api/titles/${title.id}`).set(bearer(reader));
    expect(forbidden.status).toBe(403);

    const res = await request(app).delete(`/api/titles/${title.id}`).set(bearer(author));
    expect(res.status).toBe(204);
    expect(await prisma.title.findUnique({ where: { id: title.id } })).toBeNull();
  });
});
