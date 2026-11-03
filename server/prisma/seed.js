// Начальные данные для базы. Запуск: npm run db:seed -w server
// Пока заполняются только жанры; демо-пользователи и тайтлы добавятся на этапе 3.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  for (const [name, slug] of GENRES) {
    await prisma.genre.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  }
  console.log(`Жанров в базе: ${await prisma.genre.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
