// Демо-данные для MangaG. Запуск: npm run db:seed -w server
//
// ВНИМАНИЕ: скрипт полностью очищает базу и папки uploads/{avatars,covers,pages},
// после чего создаёт пользователей, тайтлы, главы и страницы заново.
// Картинки (обложки и страницы) рисуются прямо здесь из SVG, поэтому
// в репозитории не нужно хранить изображения.
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import prisma from '../src/prisma.js';
import config from '../src/config.js';
import { saveImage } from '../src/utils/images.js';
import { slugify } from '../src/utils/slugify.js';
import {
  buildSearchText,
  recalcLastChapterAt,
  recalcRating,
} from '../src/services/titleService.js';

const DEMO_PASSWORD = 'password123';
const DAY = 24 * 60 * 60 * 1000;

// ---------- Справочники ----------

const GENRES = [
  ['Боевик', 'action'],
  ['Приключения', 'adventure'],
  ['Комедия', 'comedy'],
  ['Драма', 'drama'],
  ['Фэнтези', 'fantasy'],
  ['Ужасы', 'horror'],
  ['Детектив', 'mystery'],
  ['Романтика', 'romance'],
  ['Научная фантастика', 'sci-fi'],
  ['Повседневность', 'slice-of-life'],
  ['Спорт', 'sports'],
  ['Сверхъестественное', 'supernatural'],
  ['Психология', 'psychological'],
  ['Исекай', 'isekai'],
  ['Школа', 'school'],
  ['Меха', 'mecha'],
];

const USERS = [
  { username: 'admin', email: 'admin@mangag.local', role: 'ADMIN', bio: 'Администратор MangaG' },
  {
    username: 'sakura_ink',
    email: 'author@mangag.local',
    role: 'AUTHOR',
    bio: 'Рисую фэнтези и сёнэн. Спасибо, что читаете!',
  },
  {
    username: 'kuro_pen',
    email: 'author2@mangag.local',
    role: 'AUTHOR',
    bio: 'Пишу мрачные детективы и комиксы про космос.',
  },
  { username: 'reader', email: 'reader@mangag.local', role: 'READER', bio: 'Люблю мангу' },
  { username: 'otaku_vasya', email: 'vasya@mangag.local', role: 'READER' },
  { username: 'manga_lena', email: 'lena@mangag.local', role: 'READER' },
];

// Придуманные тайтлы. colors — цвета для генерации обложки
const TITLES = [
  {
    author: 'sakura_ink',
    name: 'Клинок Северного Ветра',
    altName: 'Blade of the North Wind',
    type: 'MANGA',
    status: 'ONGOING',
    ageRating: 16,
    year: 2024,
    genres: ['action', 'fantasy', 'adventure'],
    colors: ['#1e3a8a', '#60a5fa'],
    chapters: 5,
    description:
      'Юный кузнец Рэн находит в снегах сломанный меч, в котором живёт дух древнего ветра. ' +
      'Теперь ему предстоит пройти путь от деревенского мальчишки до защитника северных земель.',
  },
  {
    author: 'sakura_ink',
    name: 'Кофейня на краю света',
    altName: 'Cafe at the End of the World',
    type: 'MANHWA',
    status: 'ONGOING',
    ageRating: 12,
    year: 2025,
    genres: ['slice-of-life', 'romance', 'comedy'],
    colors: ['#78350f', '#fbbf24'],
    chapters: 4,
    draftChapter: true,
    description:
      'Мина открывает маленькую кофейню в портовом городке, куда заходят самые странные посетители: ' +
      'моряк, потерявший память, кот-предсказатель и молчаливый художник.',
  },
  {
    author: 'sakura_ink',
    name: 'Академия Пяти Стихий',
    altName: 'Five Elements Academy',
    type: 'MANGA',
    status: 'COMPLETED',
    ageRating: 12,
    year: 2022,
    genres: ['school', 'fantasy', 'comedy'],
    colors: ['#065f46', '#34d399'],
    chapters: 6,
    description:
      'Каждый ученик академии владеет одной стихией. Каждый — кроме Юки, которой достались все пять ' +
      'и ни капли умения ими пользоваться.',
  },
  {
    author: 'kuro_pen',
    name: 'Тень над Неоградом',
    altName: 'Shadow over Neograd',
    type: 'COMIC',
    status: 'ONGOING',
    ageRating: 18,
    year: 2023,
    genres: ['mystery', 'psychological', 'sci-fi'],
    colors: ['#111827', '#ef4444'],
    chapters: 4,
    description:
      'В неоновом мегаполисе пропадают люди, а камеры видят только тень. ' +
      'Детектив Арсений Крылов берётся за дело, которое полиция давно закрыла.',
  },
  {
    author: 'kuro_pen',
    name: 'Последний пилот',
    altName: 'The Last Pilot',
    type: 'MANHUA',
    status: 'FROZEN',
    ageRating: 16,
    year: 2021,
    genres: ['mecha', 'sci-fi', 'drama'],
    colors: ['#4c1d95', '#a78bfa'],
    chapters: 3,
    description:
      'Человечество проиграло войну машинам. Осталась одна старая боевая платформа и пилот, ' +
      'который поклялся больше никогда не садиться за штурвал.',
  },
  {
    author: 'kuro_pen',
    name: 'Шёпот старого дома',
    altName: 'Whispers of the Old House',
    type: 'MANGA',
    status: 'ONGOING',
    ageRating: 16,
    year: 2025,
    genres: ['horror', 'supernatural', 'mystery'],
    colors: ['#3f3f46', '#a3e635'],
    chapters: 3,
    description:
      'Семья переезжает в дом, доставшийся по наследству. По ночам в нём кто-то переставляет вещи ' +
      'и шепчет имена тех, кто жил здесь сто лет назад.',
  },
];

const PHRASES = [
  'Что это было?!',
  'Не может быть...',
  'Вперёд!',
  'Я не сдамся!',
  'Ты кто такой?',
  'Слишком поздно.',
  'Держись!',
  'Хм...',
  'Это только начало.',
  'Бежим!',
  'Я всё видел.',
  'Спасибо тебе.',
  'Осторожно!',
  'Пора.',
];

const COMMENTS = [
  'Рисовка просто огонь! Жду продолжения 🔥',
  'Сюжет затягивает, прочитал за один вечер.',
  'Автор, спасибо за главу!',
  'Концовка главы неожиданная, не ожидал такого поворота.',
  'Персонажи очень живые, особенно второстепенные.',
];

// ---------- Генерация картинок ----------

// Простой детерминированный генератор случайных чисел — данные одинаковые при каждом seed
let rngState = 42;
function random() {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
}
const randInt = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(random() * arr.length)];

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Разбиваем строку на строки примерно по maxLen символов
function wrapText(text, maxLen) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > maxLen && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function coverSvg(title) {
  const [dark, light] = title.colors;
  const lines = wrapText(title.name.toUpperCase(), 14);
  const text = lines
    .map(
      (l, i) =>
        `<text x="200" y="${400 + i * 44}" font-size="36" font-weight="700" text-anchor="middle"
          fill="#fff" font-family="sans-serif">${escapeXml(l)}</text>`,
    )
    .join('');

  // несколько «звёзд»/кругов для фона
  const circles = Array.from(
    { length: 14 },
    () =>
      `<circle cx="${randInt(0, 400)}" cy="${randInt(0, 340)}" r="${randInt(4, 40)}"
        fill="#fff" opacity="${(random() * 0.25).toFixed(2)}"/>`,
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${light}"/>
        <stop offset="1" stop-color="${dark}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#g)"/>
    ${circles}
    <polygon points="200,90 250,250 200,300 150,250" fill="#fff" opacity="0.85"/>
    <rect x="0" y="350" width="400" height="${lines.length * 44 + 40}" fill="#000" opacity="0.35"/>
    ${text}
    <text x="200" y="570" font-size="18" text-anchor="middle" fill="#fff" opacity="0.8"
      font-family="sans-serif">${title.type} · MangaG</text>
  </svg>`;
}

// Страница комикса: сетка панелей, «персонажи» и облачка с репликами
function pageSvg({ titleName, chapterNumber, pageNumber, totalPages }) {
  const W = 800;
  const H = 1150;
  const M = 30; // поля
  const rows = randInt(2, 4);
  const rowH = (H - M * 2 - 40) / rows;
  let panels = '';

  for (let r = 0; r < rows; r++) {
    const cols = randInt(1, 2);
    const y = M + r * rowH;
    const split = cols === 2 ? randInt(35, 65) / 100 : 1;
    const widths = cols === 2 ? [(W - M * 2) * split, (W - M * 2) * (1 - split)] : [W - M * 2];
    let x = M;

    for (const w of widths) {
      const pw = w - 10;
      const ph = rowH - 10;
      const cx = x + pw / 2;
      const cy = y + ph / 2 + 20;
      const gray = randInt(225, 250);

      panels += `<rect x="${x}" y="${y}" width="${pw}" height="${ph}"
        fill="rgb(${gray},${gray},${gray})" stroke="#111" stroke-width="5"/>`;
      // скорость/фон — диагональные линии
      for (let i = 0; i < 5; i++) {
        panels += `<line x1="${x + random() * pw}" y1="${y}" x2="${x + random() * pw}" y2="${y + ph}"
          stroke="#000" stroke-width="1" opacity="0.15"/>`;
      }
      // «персонаж»: голова и плечи
      panels += `<circle cx="${cx}" cy="${cy - 20}" r="${Math.min(pw, ph) / 7}" fill="#fff"
        stroke="#111" stroke-width="4"/>`;
      panels += `<path d="M ${cx - pw / 5} ${y + ph} Q ${cx} ${cy + 10} ${cx + pw / 5} ${y + ph}"
        fill="#fff" stroke="#111" stroke-width="4"/>`;
      // облачко с репликой
      if (random() > 0.3) {
        const phrase = escapeXml(pick(PHRASES));
        const bw = Math.min(pw - 30, phrase.length * 13 + 40);
        const bx = x + 15 + random() * Math.max(0, pw - bw - 30);
        const by = y + 15;
        panels += `<rect x="${bx}" y="${by}" width="${bw}" height="56" rx="28" fill="#fff"
          stroke="#111" stroke-width="3"/>`;
        panels += `<text x="${bx + bw / 2}" y="${by + 36}" font-size="22" text-anchor="middle"
          font-family="sans-serif" fill="#111">${phrase}</text>`;
      }
      x += w;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#fff"/>
    ${panels}
    <text x="${W / 2}" y="${H - 22}" font-size="20" text-anchor="middle" font-family="sans-serif"
      fill="#555">${escapeXml(titleName)} · Глава ${chapterNumber} · ${pageNumber} / ${totalPages}</text>
  </svg>`;
}

const svgToImage = (svg, folder, options) => saveImage(Buffer.from(svg), folder, options);

// ---------- Основной сценарий ----------

async function clearDatabase() {
  // порядок важен из-за внешних ключей
  await prisma.donation.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.readProgress.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.page.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.title.deleteMany();
  await prisma.user.deleteMany();

  for (const dir of ['avatars', 'covers', 'pages']) {
    await fs.rm(path.join(config.uploadsDir, dir), { recursive: true, force: true });
  }
}

async function main() {
  console.log('Очистка базы...');
  await clearDatabase();

  console.log('Жанры...');
  for (const [name, slug] of GENRES) {
    await prisma.genre.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  }
  const genres = await prisma.genre.findMany();
  const genreId = (slug) => genres.find((g) => g.slug === slug).id;

  console.log('Пользователи...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = {};
  for (const u of USERS) {
    users[u.username] = await prisma.user.create({ data: { ...u, passwordHash } });
  }
  const readers = ['reader', 'otaku_vasya', 'manga_lena', 'admin'].map((n) => users[n]);

  console.log('Тайтлы, главы и страницы (рисуем картинки, это займёт несколько секунд)...');
  const now = Date.now();

  for (const [index, t] of TITLES.entries()) {
    const cover = await svgToImage(coverSvg(t), 'covers', { width: 400 });

    const title = await prisma.title.create({
      data: {
        slug: slugify(t.name),
        name: t.name,
        altName: t.altName,
        description: t.description,
        type: t.type,
        status: t.status,
        ageRating: t.ageRating,
        year: t.year,
        coverUrl: cover.url,
        views: randInt(300, 5000),
        searchText: buildSearchText(t.name, t.altName),
        createdAt: new Date(now - (60 - index * 5) * DAY),
        authorId: users[t.author].id,
        genres: { connect: t.genres.map((slug) => ({ id: genreId(slug) })) },
      },
    });

    const totalChapters = t.chapters + (t.draftChapter ? 1 : 0);
    for (let n = 1; n <= totalChapters; n++) {
      const isDraft = n > t.chapters;
      const publishedAt = isDraft ? null : new Date(now - (t.chapters - n) * 7 * DAY - index * DAY);

      const chapter = await prisma.chapter.create({
        data: {
          titleId: title.id,
          volume: Math.ceil(n / 3),
          number: n,
          name: n === 1 ? 'Начало' : isDraft ? 'Черновик' : null,
          isPublished: !isDraft,
          publishedAt,
          views: isDraft ? 0 : randInt(50, 800),
        },
      });

      const pagesCount = randInt(6, 9);
      for (let p = 1; p <= pagesCount; p++) {
        const svg = pageSvg({
          titleName: t.name,
          chapterNumber: n,
          pageNumber: p,
          totalPages: pagesCount,
        });
        const image = await svgToImage(svg, `pages/${chapter.id}`, { width: 1200, quality: 75 });
        await prisma.page.create({
          data: {
            chapterId: chapter.id,
            order: p,
            imageUrl: image.url,
            width: image.width,
            height: image.height,
          },
        });
      }
    }

    // оценки и комментарии от читателей
    for (const reader of readers) {
      await prisma.rating.create({
        data: { userId: reader.id, titleId: title.id, score: randInt(6, 10) },
      });
    }
    for (let i = 0; i < 2; i++) {
      await prisma.comment.create({
        data: { userId: pick(readers).id, titleId: title.id, text: pick(COMMENTS) },
      });
    }

    await recalcRating(title.id);
    await recalcLastChapterAt(title.id);
    console.log(`  ✓ ${t.name} (${totalChapters} гл.)`);
  }

  // закладки читателя
  const allTitles = await prisma.title.findMany({ orderBy: { id: 'asc' } });
  const lists = ['READING', 'READING', 'PLANNED', 'COMPLETED', 'FAVORITE'];
  for (const [i, list] of lists.entries()) {
    await prisma.bookmark.create({
      data: { userId: users.reader.id, titleId: allTitles[i].id, list },
    });
  }

  console.log('\nГотово! Демо-аккаунты (пароль у всех: ' + DEMO_PASSWORD + '):');
  for (const u of USERS) console.log(`  ${u.role.padEnd(6)}  ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
